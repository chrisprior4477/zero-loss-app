"use client";

import { type RefObject, useLayoutEffect, useRef } from "react";
import styles from "./crew-people.module.css";

type Rect = Pick<DOMRect, "left" | "right" | "top" | "bottom">;

// One stroke, like the homepage: the selected card and activity are a single
// silhouette, not two bordered boxes with a seam between them.
export function crewActivityPath(stage: Rect, rail: Rect, tab: Rect, panel: Rect) {
  const left = panel.left - stage.left + 1;
  const right = panel.right - stage.left - 1;
  const top = panel.top - stage.top + 1;
  const bottom = panel.bottom - stage.top - 1;
  if (right <= left || bottom <= top) return "";
  const radius = 18;
  const tabLeft = Math.max(left, Math.max(tab.left, rail.left) - stage.left + 1);
  const tabRight = Math.min(right, Math.min(tab.right, rail.right) - stage.left - 1);
  const tabTop = tab.top - stage.top + 1;
  const joinRight = Math.min(12, (right - radius - tabRight) / 2);
  const joinLeft = Math.min(12, (tabLeft - left - radius) / 2);
  const rightEdgeJoin = joinRight < 3 && tabRight >= right - radius - 6;
  const visible = tab.right > rail.left + 3 && tab.left < rail.right - 3;
  const connected = visible && tabRight - tabLeft > 36 && tabTop < top - radius && (joinRight >= 3 || rightEdgeJoin);
  const base = `M ${left + radius} ${bottom} H ${right - radius} Q ${right} ${bottom} ${right} ${bottom - radius}`;

  // Scrolling the selected portrait off screen must not erase the panel edge.
  if (!connected) return `${base} V ${top + radius} Q ${right} ${top} ${right - radius} ${top} H ${left + radius} Q ${left} ${top} ${left} ${top + radius} V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;

  let path = rightEdgeJoin
    ? `${base} V ${tabTop + radius} Q ${right} ${tabTop} ${right - radius} ${tabTop}`
    : `${base} V ${top + radius} Q ${right} ${top} ${right - radius} ${top} H ${tabRight + joinRight} Q ${tabRight} ${top} ${tabRight} ${top - joinRight} V ${tabTop + radius} Q ${tabRight} ${tabTop} ${tabRight - radius} ${tabTop}`;
  path += ` H ${tabLeft + radius} Q ${tabLeft} ${tabTop} ${tabLeft} ${tabTop + radius}`;
  if (tabLeft <= left + 4) {
    path += ` V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
  } else if (joinLeft >= 3) {
    path += ` V ${top - joinLeft} Q ${tabLeft} ${top} ${tabLeft - joinLeft} ${top} H ${left + radius} Q ${left} ${top} ${left} ${top + radius} V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
  } else {
    const smallJoin = Math.max(2, (tabLeft - left) / 2);
    path += ` V ${top - smallJoin} Q ${tabLeft} ${top} ${tabLeft - smallJoin} ${top} H ${left + smallJoin} Q ${left} ${top} ${left} ${top + smallJoin} V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
  }
  return path;
}

export function CrewActivityOutline({ stageRef, railRef, selectedRef, panelRef }: {
  stageRef: RefObject<HTMLDivElement | null>;
  railRef: RefObject<HTMLDivElement | null>;
  selectedRef: RefObject<HTMLDivElement | null>;
  panelRef: RefObject<HTMLElement | null>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  // Rebind after content changes too (loading, failure, or Crew tab re-entry).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const rail = railRef.current;
    const tab = selectedRef.current;
    const panel = panelRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!stage || !rail || !tab || !panel || !svg || !path) return;
    let frame = 0;
    const draw = () => {
      const bounds = stage.getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
      path.setAttribute("d", crewActivityPath(bounds, rail.getBoundingClientRect(), tab.getBoundingClientRect(), panel.getBoundingClientRect()));
    };
    const scheduleDraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const card = tab.getBoundingClientRect();
    const viewport = rail.getBoundingClientRect();
    if ((card.left < viewport.left || card.right > viewport.right) && typeof rail.scrollTo === "function") {
      rail.scrollTo({ left: rail.scrollLeft + card.left - viewport.left - 3, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    draw();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleDraw) : null;
    for (const element of [stage, rail, tab, panel]) observer?.observe(element);
    rail.addEventListener("scroll", scheduleDraw, { passive: true });
    window.addEventListener("resize", scheduleDraw);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      rail.removeEventListener("scroll", scheduleDraw);
      window.removeEventListener("resize", scheduleDraw);
    };
  });

  return <svg ref={svgRef} className={styles.outline} aria-hidden="true" preserveAspectRatio="none">
    <path ref={pathRef} fill="none" stroke="#67f768" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  </svg>;
}
