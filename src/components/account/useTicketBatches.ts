"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Reveal whole tickets per screen. Earlier batches remain reachable inside the same list. */
export function useTicketBatches<T extends HTMLElement>(total: number, fallbackSize: number, initialIndex = 0) {
  const initial = Math.max(0, initialIndex);
  const [origin, setOrigin] = useState(initial);
  const [start, setStart] = useState(initial);
  const [size, setSize] = useState(fallbackSize);
  const list = useRef<T>(null);
  const nextRow = useRef({ index: -1, height: 0, width: 0 });
  const moveToStart = useRef(false);
  const end = Math.min(total, start + size);
  if (start > 0 && start >= total) {
    setOrigin(0);
    setStart(0);
    setSize(fallbackSize);
  }

  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const header = document.querySelector("header.sticky");
    const filters = document.getElementById(`${el.id}-filters`);
    function fit() {
      if (!el) return;
      const rows = Array.from(el.children).slice(start - origin);
      const first = rows[0]?.getBoundingClientRect();
      if (!first?.height || !first.width) return;
      const viewport = window.visualViewport?.height ?? window.innerHeight;
      // Leave space for the sticky header, two 44px control rows and their gaps.
      const available = viewport - (header?.getBoundingClientRect().height ?? 0) - (filters?.getBoundingClientRect().height ?? 0) - 124;
      const room = Math.max(Math.min(140, viewport / 2), available);
      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
      let used = 0;
      let count = 0;
      for (const row of rows) {
        const bounds = row.getBoundingClientRect();
        const height = bounds.bottom - first.top;
        if (count > 0 && height > room) {
          nextRow.current = { index: start + count, height: bounds.height, width: first.width };
          break;
        }
        used = height;
        count++;
      }
      el.style.maxHeight = `${Math.min(room, Math.ceil(used))}px`;
      if (count < rows.length) {
        setSize(count);
      } else if (end < total) {
        const next = nextRow.current;
        const required = next.index === end && next.width === first.width ? next.height : 1;
        if (used + gap + required <= room) {
          const averageHeight = Math.max(1, used / count + gap);
          const extra = Math.max(1, Math.floor((room - used) / averageHeight));
          setSize(Math.min(total - start, size + extra));
        }
      }
      if (moveToStart.current) {
        el.scrollTop += first.top - el.getBoundingClientRect().top;
        moveToStart.current = false;
        el.focus({ preventScroll: true });
      }
    }
    fit();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(el);
    for (const row of Array.from(el.children).slice(start - origin)) observer?.observe(row);
    if (header) observer?.observe(header);
    if (filters) observer?.observe(filters);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [end, origin, size, start, total]);

  function more() {
    moveToStart.current = true;
    setStart(end);
  }
  const reset = useCallback(() => {
    moveToStart.current = false;
    nextRow.current.index = -1;
    setOrigin(0);
    setStart(0);
    setSize(fallbackSize);
    if (list.current) list.current.scrollTop = 0;
  }, [fallbackSize]);

  // A link to the current page can be a hash-only navigation with no remount.
  useEffect(() => {
    if (!start) return;
    function onNavigate(event: MouseEvent) {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname) return;
      if (url.hash === "#balance" || url.hash === "#notifications-intro" ||
        (!url.hash && !url.searchParams.has("transaction"))) reset();
    }
    document.addEventListener("click", onNavigate, true);
    return () => document.removeEventListener("click", onNavigate, true);
  }, [start, reset]);
  return { list, origin, end, remaining: total - end, expanded: start > 0, more, reset };
}
