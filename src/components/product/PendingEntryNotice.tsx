"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { acknowledgeEntryReceipt, listPendingEntryRequests, resolvePendingEntryRequest } from "@/lib/entries/actions";
import { ENTRY_REQUEST_CREATED_EVENT, ENTRY_REQUEST_EVENT, ENTRY_REQUEST_ROUTED_EVENT, RECENT_ENTRY_STORAGE_KEY, type EntryRequest } from "@/lib/entries/request";
import { PostEntryCrewToast } from "./PostEntryCrewToast";

type TimedRequest = EntryRequest & { receivedAt: number };

// Undo stays inline. Optional sharing appears only after a newly created entry
// is confirmed by the server, never while money is reserved or on old receipts.
export function PendingEntryNotice() {
  const pathname = usePathname();
  const router = useRouter();
  const [requests, setRequests] = useState<TimedRequest[]>([]);
  const [shareRequest, setShareRequest] = useState<EntryRequest | null>(null);
  const [now, setNow] = useState(0);
  const createdHere = useRef(new Set<string>());
  const inFlight = useRef(new Set<string>());
  const acknowledged = useRef(new Set<string>());
  const routed = useRef(new Set<string>());
  const routedInActivity = useRef(new Set<string>());
  const refreshing = useRef(false);
  const generation = useRef(0);
  const revision = useRef(0);

  const storeReceipt = useCallback((request: EntryRequest) => {
    revision.current += 1;
    setRequests(previous => [...previous.filter(r => r.requestId !== request.requestId), { ...request, receivedAt: performance.now() }]);
    setNow(performance.now());
  }, []);

  const routeAccepted = useCallback((request: EntryRequest) => {
    if (request.status !== "accepted") return false;
    if (routed.current.has(request.requestId) || !createdHere.current.delete(request.requestId))
      return routedInActivity.current.has(request.requestId) || routed.current.has(request.requestId);
    routed.current.add(request.requestId);
    setShareRequest(request);
    if (routedInActivity.current.has(request.requestId)) return true;
    try {
      const entryId = request.href ? new URL(request.href, window.location.origin).searchParams.get("entry") : null;
      sessionStorage.setItem(RECENT_ENTRY_STORAGE_KEY, JSON.stringify({ slug: request.slug, entryId, at: Date.now() }));
    } catch { /* The confirmed entry remains in the account database. */ }
    router.replace(request.href ?? "/account/entries");
    return true;
  }, [router]);

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
    const onRoutedInActivity = (event: Event) => routedInActivity.current.add((event as CustomEvent<string>).detail);
    const onReceipt = (event: Event) => storeReceipt((event as CustomEvent<EntryRequest>).detail);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener(ENTRY_REQUEST_CREATED_EVENT, onCreated);
    window.addEventListener(ENTRY_REQUEST_ROUTED_EVENT, onRoutedInActivity);
    window.addEventListener(ENTRY_REQUEST_EVENT, onReceipt);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(ENTRY_REQUEST_CREATED_EVENT, onCreated);
      window.removeEventListener(ENTRY_REQUEST_ROUTED_EVENT, onRoutedInActivity);
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
          if (!routeAccepted(result.request)) router.refresh();
        } else void refresh();
      }).catch(() => { void refresh(); }).finally(() => inFlight.current.delete(request.requestId));
    }
  }, [requests, now, refresh, routeAccepted, router]);

  useEffect(() => {
    for (const request of requests) {
      if (request.status === "pending" || acknowledged.current.has(request.requestId)) continue;
      acknowledged.current.add(request.requestId);
      routeAccepted(request);
      void acknowledgeEntryReceipt(request.requestId).then(result => {
        if (result.error) acknowledged.current.delete(request.requestId);
      }).catch(() => { acknowledged.current.delete(request.requestId); });
    }
  }, [requests, routeAccepted]);

  return shareRequest ? <PostEntryCrewToast key={shareRequest.requestId} request={shareRequest} onClose={() => setShareRequest(null)} /> : null;
}
