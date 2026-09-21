"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { listPendingEntryRequests, resolvePendingEntryRequest } from "@/lib/entries/actions";
import { ENTRY_REQUEST_EVENT, type EntryRequest } from "@/lib/entries/request";
import { formatUsdFromCents } from "@/lib/wallet/money";

type TimedRequest = EntryRequest & { receivedAt: number };
const storageKey = "zero-loss-dismissed-entry-receipts";

// The timer is a display, not authority. Server timestamps avoid a wrong device
// clock granting extra time; every Undo/finalize is adjudicated in Supabase.
function secondsLeft(r: TimedRequest, now: number) {
  return Math.max(0, Math.ceil((Date.parse(r.undoUntil) - Date.parse(r.serverNow) - (now - r.receivedAt)) / 1000));
}

export function PendingEntryNotice() {
  const pathname = usePathname();
  const router = useRouter();
  const [requests, setRequests] = useState<TimedRequest[]>([]);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const dismissed = useRef(new Set<string>());
  const inFlight = useRef(new Set<string>());
  const refreshing = useRef(false);
  const generation = useRef(0);
  const revision = useRef(0);

  const storeReceipt = useCallback((request: EntryRequest) => {
    revision.current += 1;
    setRequests(previous => [...previous.filter(r => r.requestId !== request.requestId), { ...request, receivedAt: performance.now() }]);
    setNow(performance.now());
  }, []);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    const epoch = generation.current;
    const readRevision = revision.current;
    refreshing.current = true;
    try {
      const result = await listPendingEntryRequests();
      if (epoch !== generation.current || readRevision !== revision.current || result.error) return;
      for (const request of result.requests) window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: request }));
      setRequests(result.requests.map(r => ({ ...r, receivedAt: performance.now() })));
      setHiddenIds([...dismissed.current]);
      setNow(performance.now());
    } finally { refreshing.current = false; }
  }, []);

  useEffect(() => {
    try { dismissed.current = new Set(JSON.parse(sessionStorage.getItem(storageKey) ?? "[]")); } catch { /* Session storage is optional. */ }
    const onReceipt = (event: Event) => storeReceipt((event as CustomEvent<EntryRequest>).detail);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener(ENTRY_REQUEST_EVENT, onReceipt);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(ENTRY_REQUEST_EVENT, onReceipt);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, storeReceipt]);

  useEffect(() => {
    generation.current += 1;
    // A deferred read avoids synchronous state updates during an effect; clear
    // stale receipts at account/auth navigation before requesting fresh identity.
    const timer = window.setTimeout(() => { setRequests([]); void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, refresh]);

  const resolve = useCallback(async (r: EntryRequest, undo: boolean) => {
    if (inFlight.current.has(r.requestId)) return;
    inFlight.current.add(r.requestId);
    setBusy([...inFlight.current]);
    const epoch = generation.current;
    try {
      const result = await resolvePendingEntryRequest(r.requestId, undo);
      if (epoch !== generation.current) return;
      if (result.request) {
        window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: result.request }));
        setErrors(previous => ({ ...previous, [r.requestId]: "" }));
        router.refresh();
      } else setErrors(previous => ({ ...previous, [r.requestId]: result.error ?? "Please retry." }));
    } catch {
      setErrors(previous => ({ ...previous, [r.requestId]: "Connection interrupted. Retry to check the saved result." }));
    } finally { inFlight.current.delete(r.requestId); setBusy([...inFlight.current]); }
  }, [router]);

  const pending = requests.some(r => r.status === "pending");
  useEffect(() => {
    if (!pending) return;
    const tick = window.setInterval(() => setNow(performance.now()), 250);
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => { window.clearInterval(tick); window.clearInterval(poll); };
  }, [pending, refresh]);

  useEffect(() => {
    for (const r of requests) {
      if (r.status === "pending" && secondsLeft(r, now) === 0 && !errors[r.requestId]) {
        // The server—not reaching zero in the browser—decides acceptance.
        const timer = window.setTimeout(() => void resolve(r, false), 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [requests, now, errors, resolve]);

  const visible = requests.filter(r => r.status === "pending" || !hiddenIds.includes(r.requestId));
  if (!visible.length) return null;
  return <section aria-label="Entry confirmations" className="fixed bottom-3 left-3 right-3 z-[170] max-h-[65dvh] space-y-3 overflow-y-auto overscroll-contain sm:left-auto sm:w-[420px]">
    {visible.map(r => {
      const seconds = secondsLeft(r, now);
      const working = busy.includes(r.requestId);
      const isPending = r.status === "pending";
      return <div key={r.requestId} className="rounded-2xl border border-cyan-300/60 bg-[#001b3d] p-4 text-white shadow-[0_12px_48px_rgba(0,0,0,.65),0_0_24px_rgba(0,185,255,.16)]">
        <div className="flex items-start justify-between gap-3">
          <div role="status"><p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{isPending ? "A moment to double-check" : r.status === "accepted" ? "Entries confirmed" : r.status === "cancelled" ? "Entry undone" : "Entry not submitted"}</p>
            <p className="mt-1 text-sm font-bold">{r.title}</p>
          </div>
          {!isPending ? <button type="button" aria-label={`Dismiss confirmation for ${r.title}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl text-cyan-100 hover:bg-white/10" onClick={() => {
            dismissed.current.add(r.requestId);
            setHiddenIds([...dismissed.current]);
            try { sessionStorage.setItem(storageKey, JSON.stringify([...dismissed.current].slice(-100))); } catch { /* Optional. */ }
            setRequests(previous => previous.filter(item => item.requestId !== r.requestId));
          }}>×</button> : <span aria-hidden="true" className="grid h-10 min-w-10 place-items-center rounded-full border border-cyan-300/50 font-mono text-lg font-bold text-cyan-200">{seconds}s</span>}
        </div>
        <p className="mt-2 text-sm leading-6 text-white/80">{r.quantity} {r.quantity === 1 ? "ticket" : "tickets"} · {formatUsdFromCents(r.amountCents)}{isPending ? " reserved" : ""}</p>
        <p className="mt-1 text-xs leading-5 text-white/65">{isPending
          ? "Undo this entire submission within 30 seconds. Your reserved funds return to Playable Balance—not your payment card."
          : r.status === "accepted" ? "Your submission is saved. The Undo window has ended."
          : `${formatUsdFromCents(r.amountCents)} returned to Playable Balance. No tickets were entered for this submission.`}</p>
        {errors[r.requestId] ? <p role="alert" className="mt-2 text-sm text-[#ffb4a6]">{errors[r.requestId]}</p> : null}
        {isPending ? <button type="button" disabled={working || (seconds === 0 && !errors[r.requestId])} onClick={() => void resolve(r, seconds > 0)} className="mt-3 min-h-11 w-full rounded-xl bg-[#00b9ff] px-4 py-2.5 text-sm font-extrabold text-[#00132e] hover:bg-cyan-200 disabled:opacity-60">
          {working ? "Checking…" : seconds > 0 ? `Undo ${r.quantity === 1 ? "entry" : "all entries"}` : errors[r.requestId] ? "Check saved result" : "Confirming entries…"}
        </button> : r.href ? <Link href={r.href} className="mt-3 block rounded-xl bg-[#67ff42] px-4 py-3 text-center text-sm font-extrabold text-[#00132e]">View {r.quantity === 1 ? "entry" : "entries"} →</Link> : null}
      </div>;
    })}
  </section>;
}
