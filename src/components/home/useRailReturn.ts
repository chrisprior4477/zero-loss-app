"use client";

import { useLayoutEffect, type RefObject } from "react";

const stateKey = "zeroLossShoppingRows";
type Position = { left: number; anchor: string | null; inset: number };
type Bookmark = { path: string; rows: Record<string, Position> };

function bookmark(): Bookmark | null {
  const value = window.history.state?.[stateKey];
  return value && value.path === window.location.pathname + window.location.search && value.rows && typeof value.rows === "object" ? value : null;
}

/** Keep each row in this history entry, including touch scrolling and browser Back. */
export function useRailReturn(ref: RefObject<HTMLDivElement | null>, id: string) {
  useLayoutEffect(() => {
    const track = ref.current;
    if (!track) return;
    const path = window.location.pathname + window.location.search;
    let saving: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let restoring = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const children = () => Array.from(track.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
    function save() {
      clearTimeout(saving);
      if (restoring || !track || !track.clientWidth || path !== window.location.pathname + window.location.search) return;
      const bounds = track.getBoundingClientRect();
      const first = children().find(child => child.getBoundingClientRect().right > bounds.left);
      const position: Position = { left: track.scrollLeft, anchor: first?.querySelector("a[href]")?.getAttribute("href") ?? null, inset: first ? first.getBoundingClientRect().left - bounds.left : 0 };
      try {
        window.history.replaceState({ ...window.history.state, [stateKey]: { path, rows: { ...bookmark()?.rows, [id]: position } } }, "");
      } catch { /* A restricted history API must never block product navigation. */ }
    }
    function stopRestoring() {
      restoring = false;
      cancelAnimationFrame(frame);
      timers.splice(0).forEach(clearTimeout);
    }
    function restore() {
      stopRestoring();
      const saved = bookmark()?.rows[id];
      if (!saved || !Number.isFinite(saved.left) || saved.left < 0 || !Number.isFinite(saved.inset)) return;
      restoring = true;
      const align = () => {
        if (!restoring || !track?.clientWidth) return;
        const anchor = typeof saved.anchor === "string" ? children().find(child => Array.from(child.querySelectorAll("a[href]")).some(link => link.getAttribute("href") === saved.anchor)) : null;
        const left = anchor ? track.scrollLeft + anchor.getBoundingClientRect().left - track.getBoundingClientRect().left - saved.inset : saved.left;
        track.scrollLeft = Math.max(0, Math.min(left, track.scrollWidth - track.clientWidth));
      };
      align();
      frame = requestAnimationFrame(align);
      // Let the restored layout and availability data settle, but never fight
      // a customer's next gesture or change the page's vertical position.
      for (const delay of [150, 400]) timers.push(setTimeout(align, delay));
      timers.push(setTimeout(() => { align(); restoring = false; }, 900));
    }
    function onScroll() {
      if (restoring) return;
      clearTimeout(saving);
      saving = setTimeout(save, 150);
    }
    function onClick() { stopRestoring(); save(); }
    restore();
    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("click", onClick, true);
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    window.addEventListener("pagehide", save);
    for (const event of ["pointerdown", "touchstart", "wheel", "keydown"]) window.addEventListener(event, stopRestoring, { passive: true });
    return () => {
      clearTimeout(saving);
      stopRestoring();
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("pagehide", save);
      for (const event of ["pointerdown", "touchstart", "wheel", "keydown"]) window.removeEventListener(event, stopRestoring);
    };
  }, [ref, id]);
}
