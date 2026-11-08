"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export function useHorizontalScrollEdges(ref: RefObject<HTMLElement | null>, rendered = true) {
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const nav = ref.current;
    if (!nav || !rendered) return;
    const updateEdges = () => {
      const left = nav.clientWidth > 0 && nav.scrollLeft > 1;
      const right = nav.clientWidth > 0 && nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 1;
      setEdges(previous => previous.left === left && previous.right === right ? previous : { left, right });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateEdges);
    const measureChildren = () => {
      observer?.disconnect();
      observer?.observe(nav);
      for (const child of nav.children) observer?.observe(child);
      updateEdges();
    };
    measureChildren();
    const changes = new MutationObserver(measureChildren);
    changes.observe(nav, { childList: true });
    nav.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      changes.disconnect();
      observer?.disconnect();
      nav.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [ref, rendered]);
  return edges;
}

export function useHorizontalCategoryScroll() {
  const navRef = useRef<HTMLElement>(null);
  const edges = useHorizontalScrollEdges(navRef);
  const scroll = (direction: -1 | 1) => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollBy({ left: direction * Math.max(220, nav.clientWidth * 0.7), behavior: "smooth" });
  };

  return { navRef, canScrollLeft: edges.left, canScrollRight: edges.right, scroll };
}
