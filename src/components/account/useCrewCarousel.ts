"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";

type Gesture = { id: number; x: number; y: number; start: number; last: number; time: number; velocity: number; moved: boolean };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** One movement model for mouse and touch; vertical gestures remain page scrolling. */
export function useCrewCarousel() {
  const rail = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const maximum = (element: HTMLElement) => Math.max(0, element.scrollWidth - element.clientWidth);
  const position = (element: HTMLElement) => element.scrollLeft - (parseFloat(element.style.getPropertyValue("--crew-overhang")) || 0);

  function stop() { cancelAnimationFrame(frame.current); frame.current = 0; }
  function paint(element: HTMLElement, value: number) {
    const bounded = clamp(value, 0, maximum(element));
    element.scrollLeft = bounded;
    const overhang = reduced() ? 0 : clamp(bounded - value, -42, 42);
    element.style.setProperty("--crew-overhang", `${overhang}px`);
  }

  function coast(velocity: number, destination?: number) {
    const element = rail.current; if (!element) return;
    stop();
    let x = position(element), v = clamp(velocity, -3, 3), previous = performance.now();
    const began = previous;
    if (reduced()) { paint(element, clamp(destination ?? x, 0, maximum(element))); return; }
    function tick(now: number) {
      if (!element?.isConnected) return;
      const dt = Math.min(32, Math.max(1, now - previous)); previous = now;
      const max = maximum(element);
      const target = destination === undefined ? clamp(x, 0, max) : clamp(destination, 0, max);
      const spring = destination !== undefined || x < 0 || x > max;
      if (spring) {
        v += (target - x) * .00032 * dt;
        v *= Math.exp(-.023 * dt);
      } else v *= Math.exp(-.0048 * dt);
      x += v * dt;
      paint(element, x);
      if ((Math.abs(v) < .012 && (!spring || Math.abs(target - x) < .4)) || now - began > 2400) {
        paint(element, destination === undefined ? clamp(x, 0, max) : target);
        frame.current = 0; return;
      }
      frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
  }

  function move(direction: number) {
    const element = rail.current; if (!element) return;
    const step = (element.firstElementChild?.getBoundingClientRect().width ?? 150) + (parseFloat(getComputedStyle(element).columnGap) || 0);
    coast(0, clamp(element.scrollLeft + direction * step, 0, maximum(element)));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || maximum(event.currentTarget) < 1) return;
    stop(); suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position(event.currentTarget), last: position(event.currentTarget), time: event.timeStamp, velocity: 0, moved: false };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (!current.moved) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { gesture.current = null; coast(0); return; }
      current.moved = true; suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    event.preventDefault();
    const raw = current.start - dx, max = maximum(event.currentTarget), bounded = clamp(raw, 0, max);
    const excess = raw - bounded;
    const next = bounded + Math.sign(excess) * 42 * (1 - Math.exp(-Math.abs(excess) / 120));
    const dt = Math.max(4, event.timeStamp - current.time);
    const speed = (next - current.last) / dt;
    current.velocity = .35 * current.velocity + .65 * speed;
    current.last = next; current.time = event.timeStamp;
    paint(event.currentTarget, next);
  }
  function finish(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.moved) coast(cancelled || event.timeStamp - current.time > 90 ? 0 : current.velocity);
    else paint(event.currentTarget, clamp(position(event.currentTarget), 0, maximum(event.currentTarget)));
  }
  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    if (event.detail === 0) return;
    event.preventDefault(); event.stopPropagation();
  }

  useEffect(() => {
    const element = rail.current; if (!element) return;
    const reset = () => { stop(); element.style.removeProperty("--crew-overhang"); };
    // Native trackpad scrolling and focus scrolling can interrupt a fling.
    element.addEventListener("wheel", reset, { passive: true });
    element.addEventListener("focusin", reset);
    const resize = new ResizeObserver(reset); resize.observe(element);
    return () => { stop(); resize.disconnect(); element.removeEventListener("wheel", reset); element.removeEventListener("focusin", reset); };
  }, []);

  return { rail, move, onPointerDown, onPointerMove, onClickCapture,
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => finish(event),
    onPointerCancel: (event: PointerEvent<HTMLDivElement>) => finish(event, true),
    // Touch starts with implicit capture on the tapped card. Its bubbled loss
    // when the rail takes capture is not the end of the drag.
    onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => { if (event.target === event.currentTarget) finish(event, true); },
    onPointerLeave: (event: PointerEvent<HTMLDivElement>) => { if (gesture.current && !gesture.current.moved) finish(event, true); },
  };
}
