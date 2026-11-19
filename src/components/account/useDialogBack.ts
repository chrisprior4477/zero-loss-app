"use client";

import { useCallback, useEffectEvent, useLayoutEffect, useRef } from "react";

const stateKey = "zeroLossDialog";

/** Give a transient review its own history step without changing its URL. */
export function useDialogBack(open: boolean, onClose: () => void, blocked = false, consumeOnUnmount = false) {
  const marker = useRef<{ id: string; href: string } | null>(null);
  const closeOnBack = useEffectEvent(() => {
    if (!blocked) onClose();
    else if (marker.current) {
      window.history.pushState({ ...window.history.state, [stateKey]: marker.current.id }, "", marker.current.href);
    }
  });
  useLayoutEffect(() => {
    if (!open) return;
    const href = window.location.href;
    const id = crypto.randomUUID();
    marker.current = { id, href };
    const state = { ...window.history.state, [stateKey]: id };
    if (window.history.state?.[stateKey]) window.history.replaceState(state, "", href);
    else window.history.pushState(state, "", href);
    const back = () => {
      if (window.location.href === href && window.history.state?.[stateKey] !== id) closeOnBack();
    };
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      marker.current = null;
      // Timed dismissals also consume their temporary step. A route change
      // or a new dialog has its own history and must never be walked back.
      if (consumeOnUnmount) queueMicrotask(() => {
        if (window.location.href === href && window.history.state?.[stateKey] === id) window.history.back();
      });
    };
  }, [open, consumeOnUnmount]);
  return useCallback(() => {
    const current = marker.current;
    if (current && window.location.href === current.href && window.history.state?.[stateKey] === current.id) {
      window.history.back();
    }
  }, []);
}
