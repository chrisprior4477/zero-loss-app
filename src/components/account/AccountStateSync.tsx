"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Tabs exchange invalidations only. All account values still come from the server. */
export function AccountStateSync({ accountId, balanceCents, activeCount }: {
  accountId: string; balanceCents: number | null; activeCount: number | null;
}) {
  const router = useRouter();
  const storageKey = `zero-loss-account-changed:${accountId}`;
  const snapshot = `${balanceCents}:${activeCount}`;
  const previous = useRef(snapshot);

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
    const refresh = () => {
      if (document.visibilityState === "hidden" || !navigator.onLine || timer !== undefined) return;
      // Returning to a tab usually fires both focus and visibilitychange.
      timer = setTimeout(() => {
        timer = undefined;
        if (document.visibilityState !== "hidden" && navigator.onLine) router.refresh();
      }, 100);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) refresh();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, storageKey]);

  return null;
}
