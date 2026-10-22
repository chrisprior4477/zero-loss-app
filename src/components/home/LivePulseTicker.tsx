"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import type { LivePulseItem } from "@/lib/home/live-pulse";
import { useVisibleMotion } from "@/components/home/useVisibleMotion";

function TickerSequence({ items, hidden = false }: { items: LivePulseItem[]; hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="flex shrink-0 items-center">
          <span className="mx-5 h-1.5 w-1.5 rounded-full bg-cyan-300/70" aria-hidden="true" />
          <Link href={item.href} aria-label={`${item.label} ${item.value}`} draggable={false} tabIndex={hidden ? -1 : undefined}
            className="flex items-center rounded-sm py-2 hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
          <span className="text-[12px] font-bold uppercase tracking-[0.11em] text-white/65">
            {item.label.startsWith("Popular ") ? <><span className="text-[#31e800]">Popular</span>{item.label.slice(7)}</> : item.label}
          </span>
          <span
            className={`ml-2 text-[13px] font-extrabold ${
              item.tone === "live"
                ? "text-[#31e800]"
                : item.tone === "danger"
                  ? "text-[#ff3038]"
                : item.tone === "urgent"
                  ? "text-[#ff7a22]"
                  : "text-cyan-300"
            }`}
          >
            {item.value}
          </span>
          </Link>
        </div>
      ))}
    </div>
  );
}

export function LivePulseTicker({ items }: { items: LivePulseItem[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sequenceWidthRef = useRef(0);
  const offsetRef = useRef(0);
  const dragRef = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const canAnimate = useVisibleMotion(sectionRef);

  const normalizeAndRender = useCallback(() => {
    const track = trackRef.current;
    const sequenceWidth = sequenceWidthRef.current;
    if (!track || !sequenceWidth) return;
    while (offsetRef.current <= -sequenceWidth) offsetRef.current += sequenceWidth;
    while (offsetRef.current > 0) offsetRef.current -= sequenceWidth;
    track.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
  }, []);

  useEffect(() => {
    const sequence = trackRef.current?.firstElementChild;
    if (!sequence) return;
    const measure = () => {
      sequenceWidthRef.current = sequence.getBoundingClientRect().width;
      normalizeAndRender();
    };
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resizeObserver?.observe(sequence);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [normalizeAndRender]);

  useEffect(() => {
    if (!canAnimate) return;
    let frame = 0;
    let previous = performance.now();

    const animate = (now: number) => {
      if (!dragRef.current && !hoveredRef.current && !focusedRef.current) offsetRef.current -= Math.min(now - previous, 40) * 0.04;
      previous = now;
      normalizeAndRender();
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [canAnimate, normalizeAndRender]);

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <section
      ref={sectionRef}
      aria-label="Marketplace activity"
      className="group relative flex h-10 items-center overflow-hidden border-y border-cyan-300/15 bg-[#020d20]"
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
      onFocusCapture={(event) => {
        focusedRef.current = true;
        // A mouse/touch press must not move its own link before pointerup.
        if (dragRef.current) return;
        const link = (event.target as HTMLElement).closest("a");
        const section = sectionRef.current;
        if (!link || !section) return;
        const linkRect = link.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        if (linkRect.left < sectionRect.left || linkRect.right > sectionRect.right) {
          offsetRef.current -= linkRect.left - sectionRect.left - 20;
          normalizeAndRender();
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) focusedRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        className="flex w-max cursor-grab touch-pan-y select-none will-change-transform active:cursor-grabbing"
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          suppressClickRef.current = false;
          dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.id !== event.pointerId) return;
          const dx = event.clientX - drag.x;
          if (!drag.moved) {
            if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(event.clientY - drag.y)) return;
            drag.moved = true;
            suppressClickRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          event.preventDefault();
          offsetRef.current += dx;
          drag.x = event.clientX;
          normalizeAndRender();
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
        onPointerLeave={(event) => {
          if (!dragRef.current?.moved) finishDrag(event);
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!suppressClickRef.current || event.detail === 0) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClickRef.current = false;
        }}
        aria-label="Drag marketplace activity forward or backward"
      >
        <TickerSequence items={items} />
        <TickerSequence items={items} hidden />
      </div>
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#020d20] to-transparent" aria-hidden="true" />
    </section>
  );
}
