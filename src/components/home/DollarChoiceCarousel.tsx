"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { dollarChoiceDemoItems } from "@/lib/home/demo-data";

export function DollarChoiceCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  const scroll = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 760, behavior: "smooth" });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    event.preventDefault();
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      scrollLeft: track.scrollLeft,
    };
    track.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !dragRef.current.active) return;
    const distance = event.clientX - dragRef.current.startX;
    if (Math.abs(distance) > 5) dragRef.current.moved = true;
    track.scrollLeft = dragRef.current.scrollLeft - distance;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    if (trackRef.current?.hasPointerCapture(event.pointerId)) {
      trackRef.current.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section
      data-testid="dollar-choice-carousel"
      className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#031b44] pb-2 pt-0 sm:py-7"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_48%,rgba(117,65,255,0.18),transparent_22%),radial-gradient(circle_at_39%_54%,rgba(0,185,255,0.16),transparent_23%),radial-gradient(circle_at_63%_50%,rgba(49,232,0,0.12),transparent_22%),radial-gradient(circle_at_84%_48%,rgba(201,70,255,0.16),transparent_22%)]" />
      <div className="relative z-20 mx-auto mb-1 flex max-w-[1600px] items-start justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[20px] font-extrabold tracking-[-0.035em] text-white sm:text-[26px]">Where would you put your $1?</h2>
            <span className="rounded-full border border-cyan-300/40 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300">Demo data</span>
          </div>
          <p className="mt-1 text-[13px] text-white/60">Real products. One dollar. You choose.</p>
        </div>
        <Link href="/browse" className="hidden shrink-0 rounded-lg border border-cyan-300/25 bg-[#05265a] px-4 py-2.5 text-[12px] font-bold text-cyan-300 transition-colors hover:border-cyan-300/60 hover:text-white sm:block">
          See all prizes
        </Link>
      </div>

      <div className="relative mt-1">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[42px] z-[1] h-[220px] opacity-80 mix-blend-screen">
          <Image
            src="/dollar-choice-energy-trails.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center drop-shadow-[0_0_20px_rgba(0,185,255,0.38)]"
          />
        </div>

        <div
          ref={trackRef}
          data-testid="dollar-choice-track"
          className="zl-noscroll relative z-10 flex cursor-grab touch-auto select-none gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 pt-3 active:cursor-grabbing sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { dragRef.current.active = false; }}
          onClickCapture={(event) => {
            if (dragRef.current.moved) {
              event.preventDefault();
              event.stopPropagation();
              dragRef.current.moved = false;
            }
          }}
          onDragStart={(event) => event.preventDefault()}
        >
          {dollarChoiceDemoItems.map((item) => {
            const meterColor = item.percentFilled >= 80 ? "#ff630f" : item.percentFilled >= 60 ? "#31e800" : "#00b9ff";
            return (
              <article key={item.id} className="group relative w-[156px] shrink-0 sm:w-[230px]">
                <Link href={item.href} draggable={false} className="block rounded-2xl px-2 pb-3 pt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span className="absolute left-2 top-1 z-20 grid h-9 w-9 place-items-center rounded-full bg-[#74e72d] text-[14px] font-extrabold text-[#00132e] shadow-[0_0_18px_rgba(49,232,0,0.55)] sm:h-11 sm:w-11 sm:text-[17px]">$1</span>
                  <div
                    className="relative h-[112px] overflow-visible rounded-[44%] transition-transform duration-300 group-hover:-translate-y-1 sm:h-[174px]"
                    style={{ background: `radial-gradient(circle at center, ${item.accentSoft} 0%, rgba(0,19,46,0.42) 48%, transparent 72%)` }}
                  >
                    <span aria-hidden="true" className="absolute inset-[18%] rounded-full blur-2xl" style={{ backgroundColor: item.accentSoft, boxShadow: `0 0 42px ${item.accent}` }} />
                    <Image src={item.image} alt="" aria-hidden="true" draggable={false} fill sizes="230px" className="relative z-10 object-contain p-1 drop-shadow-[0_18px_18px_rgba(0,0,0,0.42)] transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <h3 className="mt-2 min-h-10 text-center text-[14px] font-bold leading-[1.25] text-white">{item.title}</h3>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12" role="progressbar" aria-label={`${item.title} pool filled`} aria-valuenow={item.percentFilled} aria-valuemin={0} aria-valuemax={100}>
                    <span className="block h-full rounded-full" style={{ width: `${item.percentFilled}%`, backgroundColor: meterColor }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-white">{item.percentFilled}% filled</span>
                    <span className="text-white/55">Ending in {item.timeRemaining}</span>
                  </div>
                </Link>
                <FavoriteButton itemName={item.title} className="absolute right-1 top-1 z-30" />
              </article>
            );
          })}
        </div>

        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[9vw] bg-gradient-to-r from-[#031b44] via-[#031b44]/85 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[9vw] bg-gradient-to-l from-[#031b44] via-[#031b44]/85 to-transparent" />
        <button type="button" aria-label="Scroll prizes left" onClick={() => scroll(-1)} className="absolute left-[clamp(1rem,2.5vw,3rem)] top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#00132e]/95 text-2xl text-white transition-colors hover:border-cyan-300 hover:text-cyan-300 sm:grid">‹</button>
        <button type="button" aria-label="Scroll prizes right" onClick={() => scroll(1)} className="absolute right-[clamp(1rem,2.5vw,3rem)] top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#00132e]/95 text-2xl text-white transition-colors hover:border-cyan-300 hover:text-cyan-300 sm:grid">›</button>
      </div>
    </section>
  );
}
