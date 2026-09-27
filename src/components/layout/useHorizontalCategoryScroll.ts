"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useHorizontalCategoryScroll() {
  const navRef = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const updateEdges = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const maxScroll = Math.max(0, nav.scrollWidth - nav.clientWidth);
    setEdges({ left: nav.scrollLeft > 2, right: nav.scrollLeft < maxScroll - 2 });
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    updateEdges();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateEdges);
    observer?.observe(nav);
    if (nav.firstElementChild) observer?.observe(nav.firstElementChild);
    window.addEventListener("resize", updateEdges);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const scroll = (direction: -1 | 1) => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollBy({ left: direction * Math.max(220, nav.clientWidth * 0.7), behavior: "smooth" });
  };

  return { navRef, canScrollLeft: edges.left, canScrollRight: edges.right, updateEdges, scroll };
}
