"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { acknowledgeEntryReceipt, listPendingEntryRequests, resolvePendingEntryRequest } from "@/lib/entries/actions";
import { ENTRY_REQUEST_CREATED_EVENT, ENTRY_REQUEST_EVENT, RECENT_ENTRY_STORAGE_KEY, type EntryRequest } from "@/lib/entries/request";

type TimedRequest = EntryRequest & { receivedAt: number };

// Keep server-authoritative finalization and receipt recovery running without a
// floating toast. The product entry panel owns the visible inline Undo control.
export function PendingEntryNotice() {
  const pathname = usePathname();
  const router = useRouter();
  const [requests, setRequests] = useState<TimedRequest[]>([]);
  const [now, setNow] = useState(0);
  const createdHere = useRef(new Set<string>());
  const inFlight = useRef(new Set<string>());
  const acknowledged = useRef(new Set<string>());
  const refreshing = useRef(false);
  const generation = useRef(0);
  const revision = useRef(0);

  const storeReceipt = useCallback((request: EntryRequest) => {
    revision.current += 1;
    setRequests(previous => [...previous.filter(r => r.requestId !== request.requestId), { ...request, receivedAt: performance.now() }]);
    setNow(performance.now());
  }, []);

  const refresh = useCallback(async function refreshEntries() {
    if (refreshing.current) return;
    const epoch = generation.current;
    const readRevision = revision.current;
    refreshing.current = true;
    try {
      const result = await listPendingEntryRequests();
      if (epoch !== generation.current || readRevision !== revision.current || result.error) return;
      for (const request of result.requests) window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: request }));
      setRequests(result.requests.map(r => ({ ...r, receivedAt: performance.now() })));
      setNow(performance.now());
    } catch {
      // A reconnect or next poll retries the owner-scoped database read.
    } finally {
      refreshing.current = false;
      if (epoch !== generation.current) void refreshEntries();
    }
  }, []);

  useEffect(() => {
    const onCreated = (event: Event) => createdHere.current.add((event as CustomEvent<string>).detail);
    const onReceipt = (event: Event) => storeReceipt((event as CustomEvent<EntryRequest>).detail);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener(ENTRY_REQUEST_CREATED_EVENT, onCreated);
    window.addEventListener(ENTRY_REQUEST_EVENT, onReceipt);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(ENTRY_REQUEST_CREATED_EVENT, onCreated);
      window.removeEventListener(ENTRY_REQUEST_EVENT, onReceipt);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, storeReceipt]);

  useEffect(() => {
    generation.current += 1;
    const timer = window.setTimeout(() => { setRequests([]); void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname, refresh]);

  const pending = requests.some(r => r.status === "pending");
  useEffect(() => {
    if (!pending) return;
    const tick = window.setInterval(() => setNow(performance.now()), 250);
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => { window.clearInterval(tick); window.clearInterval(poll); };
  }, [pending, refresh]);

  useEffect(() => {
    for (const request of requests) {
      if (request.status !== "pending" || inFlight.current.has(request.requestId)) continue;
      const remaining = Date.parse(request.undoUntil) - Date.parse(request.serverNow) - (now - request.receivedAt);
      if (remaining > 0) continue;
      inFlight.current.add(request.requestId);
      void resolvePendingEntryRequest(request.requestId, false).then(result => {
        if (result.request) {
          window.dispatchEvent(new CustomEvent(ENTRY_REQUEST_EVENT, { detail: result.request }));
          router.refresh();
        } else void refresh();
      }).catch(() => { void refresh(); }).finally(() => inFlight.current.delete(request.requestId));
    }
  }, [requests, now, refresh, router]);

  useEffect(() => {
    for (const request of requests) {
      if (request.status === "pending" || acknowledged.current.has(request.requestId)) continue;
      acknowledged.current.add(request.requestId);
      if (request.status === "accepted" && createdHere.current.delete(request.requestId)) {
        try {
          const entryId = request.href ? new URL(request.href, window.location.origin).searchParams.get("entry") : null;
          sessionStorage.setItem(RECENT_ENTRY_STORAGE_KEY, JSON.stringify({ slug: request.slug, entryId, at: Date.now() }));
        } catch { /* The confirmed entry remains in the account database. */ }
        if (pathname !== "/account/entries") router.replace("/account/entries");
        else router.refresh();
      }
      void acknowledgeEntryReceipt(request.requestId).then(result => {
        if (result.error) acknowledged.current.delete(request.requestId);
      }).catch(() => { acknowledged.current.delete(request.requestId); });
    }
  }, [requests, pathname, router]);

  return null;
}
