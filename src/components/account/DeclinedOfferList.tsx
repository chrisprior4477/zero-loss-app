"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./my-activity.module.css";

export function DeclinedOfferList({ children, offerId, ownerId }: { children: ReactNode; offerId?: string; ownerId?: string }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    function revealLinkedOffer() {
      const id = offerId ? `declined-offer-${offerId}` : window.location.hash.slice(1).split("#", 1)[0];
      if (!id.startsWith("declined-offer-")) return;
      const offer = document.getElementById(id);
      if (!offer || !list.current?.contains(offer)) return;
      const details = offer.closest("details");
      if (!details) return;
      details.open = true;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        offer.focus({ preventScroll: true });
        offer.scrollIntoView?.({ block: "start" });
      });
    }
    const root = list.current;
    const storageKey = ownerId ? `zero-loss-declined-stacks:${ownerId}` : null;
    const stacks = [...(root?.querySelectorAll<HTMLDetailsElement>("details[data-declined-product]") ?? [])];
    try {
      const saved: unknown = storageKey && JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(saved)) for (const stack of stacks) stack.open = saved.includes(stack.dataset.declinedProduct);
    } catch { /* The exact link still opens its ticket. */ }
    function remember() {
      if (!storageKey) return;
      try { sessionStorage.setItem(storageKey, JSON.stringify(stacks.filter(stack => stack.open).map(stack => stack.dataset.declinedProduct))); }
      catch { /* Disclosure still works without storage. */ }
    }
    revealLinkedOffer();
    root?.addEventListener("toggle", remember, true);
    window.addEventListener("hashchange", revealLinkedOffer);
    return () => {
      root?.removeEventListener("toggle", remember, true);
      window.removeEventListener("hashchange", revealLinkedOffer);
      cancelAnimationFrame(frame);
    };
  }, [offerId, ownerId]);
  return <div ref={list} className={styles.declinedList}>{children}</div>;
}
