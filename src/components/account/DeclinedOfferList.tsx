"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./my-activity.module.css";

export function DeclinedOfferList({ children, offerId }: { children: ReactNode; offerId?: string }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    function revealLinkedOffer() {
      const id = window.location.hash.slice(1) || (offerId ? `declined-offer-${offerId}` : "");
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
    revealLinkedOffer();
    window.addEventListener("hashchange", revealLinkedOffer);
    return () => {
      window.removeEventListener("hashchange", revealLinkedOffer);
      cancelAnimationFrame(frame);
    };
  }, [offerId]);
  return <div ref={list} className={styles.declinedList}>{children}</div>;
}
