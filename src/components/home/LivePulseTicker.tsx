"use client";

import { useCallback, useEffect, useRef } from "react";
import { livePulseDemoItems } from "@/lib/home/demo-data";
import { useVisibleMotion } from "@/components/home/useVisibleMotion";

function TickerSequence({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {livePulseDemoItems.map((item) => (
        <div key={`${item.label}-${item.value}`} className="flex shrink-0 items-center">
          <span className="mx-5 h-1.5 w-1.5 rounded-full bg-cyan-300/70" aria-hidden="true" />
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
        </div>
      ))}
    </div>
  );
}

export function LivePulseTicker() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sequenceWidthRef = useRef(0);
  const offsetRef = useRef(0);
  const draggingRef = useRef(false);
  const pointerXRef = useRef(0);
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
      if (!draggingRef.current) offsetRef.current -= Math.min(now - previous, 40) * 0.04;
      previous = now;
      normalizeAndRender();
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [canAnimate, normalizeAndRender]);

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <section
      ref={sectionRef}
      aria-label="Live marketplace activity"
      className="group relative flex h-10 items-center overflow-hidden border-y border-cyan-300/15 bg-[#020d20]"
    >
      <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-[#020d20] pl-3 pr-3 shadow-[18px_0_24px_#020d20] sm:pl-6 sm:pr-5 lg:pl-[clamp(3rem,6vw,7rem)]">
        <span className="zl-pulse-live mr-2 inline-block h-2 w-2 rounded-full bg-[#31e800] shadow-[0_0_10px_rgba(49,232,0,0.8)]" aria-hidden="true" />
        <span className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
          Live
        </span>
      </div>
      <div
        ref={trackRef}
        className="flex w-max cursor-grab touch-pan-y select-none pl-20 will-change-transform active:cursor-grabbing sm:pl-28 lg:pl-40"
        onPointerDown={(event) => {
          draggingRef.current = true;
          pointerXRef.current = event.clientX;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          offsetRef.current += event.clientX - pointerXRef.current;
          pointerXRef.current = event.clientX;
          normalizeAndRender();
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        aria-label="Drag marketplace activity forward or backward"
      >
        <TickerSequence />
        <TickerSequence hidden />
      </div>
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#020d20] to-transparent" aria-hidden="true" />
    </section>
  );
}
