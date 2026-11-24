"use client";

import { useCallback, useEffectEvent, useLayoutEffect, useRef } from "react";

const stateKey = "zeroLossDialog";
const programmaticReturns = new WeakMap<Event, { key: string; id: string; href: string }>();

function consumeHistoryStep(key: string, id: string, href: string) {
  window.addEventListener("popstate", event => programmaticReturns.set(event, { key, id, href }), { once: true, capture: true });
  window.history.back();
}

/** Give a transient review its own history step without changing its URL. */
export function useDialogBack(open: boolean, onClose: () => void | true, blocked = false, consumeOnUnmount = false, nested = false, scope?: string, onForward?: () => void) {
  const key = scope ? `${stateKey}-${scope}` : nested ? stateKey + "Nested" : stateKey;
  const marker = useRef<{ id: string; href: string } | null>(null);
  const forwardMarker = useRef<{ id: string; href: string } | null>(null);
  const restoreOnForward = useEffectEvent(() => onForward?.());
  const canRestore = Boolean(onForward);
  useLayoutEffect(() => {
    if (!canRestore || open) return;
    function restore() {
      const id = window.history.state?.[key];
      if (typeof id === "string") {
        forwardMarker.current = { id, href: window.location.href };
        restoreOnForward();
      }
    }
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [canRestore, key, open]);
  const closeOnBack = useEffectEvent(() => {
    const keepOpen = blocked || onClose() === true;
    if (keepOpen && marker.current) {
      window.history.pushState({ ...window.history.state, [key]: marker.current.id }, "", marker.current.href);
    }
  });
  useLayoutEffect(() => {
    if (!open) return;
    const href = window.location.href;
    const restored = forwardMarker.current;
    forwardMarker.current = null;
    const existing = window.history.state?.[key];
    // Nested history entries still refer to the original parent ID.
    const reuse = restored?.href === href && restored.id === existing;
    const id = reuse ? restored.id : crypto.randomUUID();
    marker.current = { id, href };
    if (!reuse) {
      const state = { ...window.history.state, [key]: id };
      if (existing) window.history.replaceState(state, "", href);
      else window.history.pushState(state, "", href);
    }
    const back = (event: PopStateEvent) => {
      if (window.location.href !== href || window.history.state?.[key] === id) return;
      const previous = programmaticReturns.get(event);
      if (previous?.href === href && previous.id !== id) {
        // A new dialog can mount before the previous dialog's history step finishes closing.
        window.history.pushState({ ...window.history.state, [key]: id }, "", href);
        return;
      }
      closeOnBack();
    };
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      marker.current = null;
      // Timed dismissals also consume their temporary step. A route change
      // or a new dialog has its own history and must never be walked back.
      if (consumeOnUnmount) queueMicrotask(() => {
        if (window.location.href === href && window.history.state?.[key] === id) consumeHistoryStep(key, id, href);
      });
    };
  }, [open, consumeOnUnmount, key]);
  return useCallback((replace = false) => {
    const current = marker.current;
    if (current && window.location.href === current.href && window.history.state?.[key] === current.id) {
      if (replace) {
        const state = { ...window.history.state };
        delete state[key];
        window.history.replaceState(state, "", current.href);
      } else consumeHistoryStep(key, current.id, current.href);
    }
  }, [key]);
}
