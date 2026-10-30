"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { acknowledgeEntryReceipt, listPendingEntryRequests, resolvePendingEntryRequest } from "@/lib/entries/actions";
import { ENTRY_REQUEST_CREATED_EVENT, ENTRY_REQUEST_EVENT, ENTRY_REQUEST_ROUTED_EVENT, RECENT_ENTRY_STORAGE_KEY, type EntryRequest } from "@/lib/entries/request";
import { PostEntryCrewToast } from "./PostEntryCrewToast";
import { clearEntryIntent } from "@/lib/entries/return-intent";
import { PRODUCT_SHARE_EVENT, isProductShareItem, shareDismissalKey, type ProductShareItem } from "@/lib/sharing/product-share";

type TimedRequest = EntryRequest & { receivedAt: number };

// Undo stays inline. Optional sharing appears only after a newly created entry
// is confirmed by the server, never while money is reserved or on old receipts.
export function PendingEntryNotice({ accountId }: { accountId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [requests, setRequests] = useState<TimedRequest[]>([]);
  const [shareRequest, setShareRequest] = useState<EntryRequest | null>(null);
  const [manualProduct, setManualProduct] = useState<ProductShareItem | null>(null);
  const dismissed = useRef(new Set<string>());
  const shareTrigger = useRef<HTMLElement | null>(null);
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
    if (request.status === "pending" || request.status === "accepted") clearEntryIntent(request.slug);
    revision.current += 1;
    setRequests(previous => [...previous.filter(r => r.requestId !== request.requestId), { ...request, receivedAt: performance.now() }]);
    setNow(performance.now());
  }, []);

  const routeAccepted = useCallback((request: EntryRequest) => {
    if (request.status !== "accepted") return false;
    if (routed.current.has(request.requestId) || !createdHere.current.delete(request.requestId))
      return routedInActivity.current.has(request.requestId) || routed.current.has(request.requestId);
    routed.current.add(request.requestId);
    let muted = dismissed.current.has(request.requestId);
    try { muted ||= sessionStorage.getItem(shareDismissalKey(accountId, request.requestId)) === "1"; } catch { /* In-memory dismissal still works. */ }
    const destination = new URL(request.href ?? "/account/entries", window.location.origin);
    const openEntry = destination.pathname === "/account/entries" && (destination.searchParams.get("filter") ?? "active") === "active"
      || destination.pathname.startsWith("/account/entries/");
    // A resolved win or purchase option should open its next step without an entry-share interruption.
    if (!muted && openEntry) { setManualProduct(null); setShareRequest(request); }
    else setShareRequest(null);
    if (routedInActivity.current.has(request.requestId)) return true;
    try {
      const entryId = request.href ? new URL(request.href, window.location.origin).searchParams.get("entry") : null;
      sessionStorage.setItem(RECENT_ENTRY_STORAGE_KEY, JSON.stringify({ slug: request.slug, entryId, at: Date.now() }));
    } catch { /* The confirmed entry remains in the account database. */ }
    router.replace(request.href ?? "/account/entries");
    return true;
  }, [router, accountId]);

  const closeSharing = useCallback(() => {
    // "Not now" dismisses this receipt, not every future entry for the prize.
    if (shareRequest) {
      dismissed.current.add(shareRequest.requestId);
      try { sessionStorage.setItem(shareDismissalKey(accountId, shareRequest.requestId), "1"); } catch { /* Storage is optional, not an entry record. */ }
    }
    setShareRequest(null); setManualProduct(null);
    if (shareTrigger.current?.isConnected) shareTrigger.current.focus({ preventScroll: true });
    shareTrigger.current = null;
  }, [accountId, shareRequest]);

  useEffect(() => {
    if (pathname?.startsWith("/items/") || pathname?.startsWith("/account/entries")) return;
    // Automatic entry prompts must not follow the customer into checkout or reward claims.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareRequest(null);
  }, [pathname]);

  useEffect(() => {
    const openSharing = (event: Event) => {
      const product: unknown = (event as CustomEvent).detail;
      if (!isProductShareItem(product)) return;
      shareTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShareRequest(null); setManualProduct(product);
    };
    window.addEventListener(PRODUCT_SHARE_EVENT, openSharing);
    return () => window.removeEventListener(PRODUCT_SHARE_EVENT, openSharing);
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

  const entryScreen = pathname?.startsWith("/items/") || pathname?.startsWith("/account/entries");
  return shareRequest && entryScreen ? <PostEntryCrewToast key={shareRequest.requestId} request={shareRequest} onClose={closeSharing} />
    : manualProduct ? <PostEntryCrewToast key={`manual-${manualProduct.slug}`} product={manualProduct} onClose={closeSharing} focusOnOpen /> : null;
}
