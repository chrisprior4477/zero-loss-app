"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { rememberAccountHistoryReturn } from "@/components/account/AccountHistoryReturn";
import styles from "./gift-rewards-overview.module.css";

type Drag = { pointerId: number; startX: number; startY: number; scrollLeft: number; moved: boolean };

/** Add mouse dragging to the compact carousel; touch and keyboard scrolling stay native. */
export function RewardHistoryCarousel({ children, focusRow }: { children: ReactNode; focusRow?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const settlingTarget = useRef<number | null>(null);
  useEffect(() => {
    const rail = railRef.current;
    const row = focusRow && document.getElementById(focusRow);
    if (!rail || !row || !rail.contains(row)) return;
    rail.scrollTo?.({ left: rail.scrollLeft + row.getBoundingClientRect().left - rail.getBoundingClientRect().left, behavior: "instant" });
  }, [focusRow]);

  function restoreSnap(rail: HTMLDivElement) {
    settlingTarget.current = null;
    delete rail.dataset.settling;
  }

  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const rail = event.currentTarget;
    drag.current = null;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    // Restoring CSS snap before the smooth scroll would jump straight to the
    // destination. Keep it suspended until the browser finishes easing there.
    if (current.moved && !cancelled) rail.dataset.settling = "true";
    delete rail.dataset.dragging;
    if (cancelled) { suppressClick.current = false; restoreSnap(rail); return; }
    if (!current.moved) return;

    const cards = Array.from(rail.querySelectorAll<HTMLAnchorElement>(":scope > a"));
    const firstLeft = cards[0]?.getBoundingClientRect().left;
    if (firstLeft === undefined) { restoreSnap(rail); return; }
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    const positions = cards.map(card => Math.min(maxScroll, Math.max(0, card.getBoundingClientRect().left - firstLeft)));
    const nearest = positions.reduce((best, position) => Math.abs(position - rail.scrollLeft) < Math.abs(best - rail.scrollLeft) ? position : best, positions[0]);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    settlingTarget.current = nearest;
    const alreadySettled = Math.abs(rail.scrollLeft - nearest) < 1;
    rail.scrollTo({ left: nearest, behavior: reducedMotion ? "auto" : "smooth" });
    if (reducedMotion || alreadySettled) restoreSnap(rail);
  }

  return <div ref={railRef} data-reward-history-rail className={styles.historyTable} role="group" aria-roledescription="carousel" aria-label="Reward cards" tabIndex={0}
    onPointerDown={event => {
      suppressClick.current = false;
      const rail = event.currentTarget;
      restoreSnap(rail);
      if (event.pointerType !== "mouse" || event.button !== 0 || !window.matchMedia("(max-width: 700px)").matches || rail.scrollWidth <= rail.clientWidth + 1) return;
      drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, scrollLeft: rail.scrollLeft, moved: false };
    }}
    onPointerMove={event => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      const distance = event.clientX - current.startX;
      if (!current.moved) {
        if (Math.abs(distance) < 6) return;
        if (Math.abs(event.clientY - current.startY) > Math.abs(distance)) { drag.current = null; return; }
        current.moved = true;
        suppressClick.current = true;
        event.currentTarget.dataset.dragging = "true";
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      event.currentTarget.scrollLeft = current.scrollLeft - distance;
    }}
    onPointerUp={event => finish(event)}
    onPointerCancel={event => finish(event, true)}
    onLostPointerCapture={event => finish(event, true)}
    onPointerLeave={event => { if (drag.current && !drag.current.moved) finish(event, true); }}
    onDragStart={event => { if (drag.current) event.preventDefault(); }}
    onScroll={event => {
      if (settlingTarget.current !== null && Math.abs(event.currentTarget.scrollLeft - settlingTarget.current) < 1) restoreSnap(event.currentTarget);
    }}
    onScrollEnd={event => { if (!drag.current) restoreSnap(event.currentTarget); }}
    onWheel={event => restoreSnap(event.currentTarget)}
    onKeyDown={event => {
      const rail = event.currentTarget;
      restoreSnap(rail);
      if (event.key !== "Tab" || event.shiftKey || event.target !== rail) return;
      const bounds = rail.getBoundingClientRect();
      const current = Array.from(rail.querySelectorAll<HTMLAnchorElement>(":scope > a")).find(link => {
        const card = link.getBoundingClientRect();
        return card.width > 0 && Math.min(card.right, bounds.right) - Math.max(card.left, bounds.left) >= card.width / 2;
      });
      if (current) {
        event.preventDefault();
        current.focus({ preventScroll: true });
      }
    }}
    onClickCapture={event => {
      // Keyboard activation (detail 0) remains available after a mouse drag.
      const dragged = suppressClick.current && event.detail !== 0;
      suppressClick.current = false;
      if (dragged) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-reward-history-link]") : null;
      if (link && (!link.target || link.target === "_self")) rememberAccountHistoryReturn(link, event.currentTarget);
    }}
  >{children}</div>;
}
