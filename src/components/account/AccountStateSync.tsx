"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_CHANGED_EVENT, ACCOUNT_REFRESH_RELEASED_EVENT, isAccountRefreshHeld } from "@/lib/account/account-state-events";

/** Tabs exchange invalidations only. All account values still come from the server. */
export function AccountStateSync({ accountId, balanceCents, activeCount, offerRevision = "" }: {
  accountId: string; balanceCents: number | null; activeCount: number | null; offerRevision?: string;
}) {
  const router = useRouter();
  const storageKey = `zero-loss-account-changed:${accountId}`;
  const snapshot = `${balanceCents}:${activeCount}:${offerRevision}`;
  const previous = useRef(snapshot);

  useEffect(() => {
    if (balanceCents !== null && activeCount !== null) return;
    // Retry a failed server read without inventing totals or resubmitting an
    // account action. Stop after three attempts and cancel as soon as it recovers.
    const timers = [1000, 4000, 10000].map(delay => window.setTimeout(() => {
      if (document.visibilityState !== "hidden" && navigator.onLine) router.refresh();
    }, delay));
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [accountId, balanceCents, activeCount, router]);

  useEffect(() => {
    if (previous.current === snapshot) return;
    previous.current = snapshot;
    if (balanceCents === null) return;
    try {
      // A unique token also signals a second change within the same millisecond.
      localStorage.setItem(storageKey, crypto.randomUUID());
    } catch { /* Focus/visibility refresh still works when storage is unavailable. */ }
  }, [snapshot, storageKey, balanceCents]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waitingForReceipt = false;
    const broadcast = () => {
      try { localStorage.setItem(storageKey, crypto.randomUUID()); }
      catch { /* Returning to the tab still refreshes it. */ }
    };
    const refresh = () => {
      if (document.visibilityState === "hidden" || !navigator.onLine || timer !== undefined) return;
      if (isAccountRefreshHeld()) { waitingForReceipt = true; return; }
      // Returning to a tab usually fires both focus and visibilitychange.
      timer = setTimeout(() => {
        timer = undefined;
        if (isAccountRefreshHeld()) { waitingForReceipt = true; return; }
        if (document.visibilityState !== "hidden" && navigator.onLine) router.refresh();
      }, 100);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) refresh();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    const onRelease = () => {
      if (waitingForReceipt) { waitingForReceipt = false; refresh(); }
    };
    window.addEventListener(ACCOUNT_CHANGED_EVENT, broadcast);
    window.addEventListener(ACCOUNT_REFRESH_RELEASED_EVENT, onRelease);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(ACCOUNT_CHANGED_EVENT, broadcast);
      window.removeEventListener(ACCOUNT_REFRESH_RELEASED_EVENT, onRelease);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, storageKey]);

  return null;
}
