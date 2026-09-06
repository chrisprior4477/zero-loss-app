"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { dollarChoiceDemoItems } from "@/lib/home/demo-data";

export function CircularProgress({ percent, color, label }: { percent: number; color: string; label: string }) {
  return (
    <span
      className="relative block h-[62px] w-[62px] min-h-[62px] min-w-[62px] shrink-0"
      style={{ width: 62, height: 62, minWidth: 62, minHeight: 62 }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg aria-hidden="true" viewBox="0 0 64 64" className="absolute inset-0 block h-full w-full -rotate-90">
        <circle cx="32" cy="32" r="25.5" fill="#f8fafc" stroke="#dfe6ed" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r="25.5"
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${percent} ${100 - percent}`}
        />
      </svg>
      <span style={{ color: "#10213d" }} className="absolute inset-0 grid place-items-center text-[16px] font-black">{percent}%</span>
    </span>
  );
}

export function DollarChoiceCarouselLight() {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  const scroll = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 760, behavior: "smooth" });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    event.preventDefault();
    dragRef.current = { active: true, moved: false, startX: event.clientX, scrollLeft: track.scrollLeft };
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
    if (trackRef.current?.hasPointerCapture(event.pointerId)) trackRef.current.releasePointerCapture(event.pointerId);
  };

  return (
    <section
      aria-labelledby="dollar-choice-light-title"
      className="relative left-1/2 mt-8 w-screen -translate-x-1/2 overflow-hidden bg-[#031b44] py-8"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[7vw] bottom-[12%] top-[17%] bg-[radial-gradient(ellipse_at_center,rgba(43,125,191,0.26)_0%,rgba(12,74,130,0.17)_48%,transparent_82%)] blur-2xl" />

      <div className="relative z-20 mx-auto flex max-w-[1600px] items-start justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="dollar-choice-light-title" className="text-[20px] font-extrabold tracking-[-0.035em] text-white sm:text-[26px]">Your Next Everyday Upgrade</h2>
            <span className="rounded-full border border-cyan-200/50 bg-[#00132e]/45 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-200">Layout test</span>
          </div>
          <p className="mt-1 text-[13px] text-white/70">A cleaner product-feed treatment designed for ordinary vendor images.</p>
        </div>
        <Link href="/browse" className="hidden shrink-0 rounded-lg border border-cyan-200/35 bg-[#05265a] px-4 py-2.5 text-[12px] font-bold text-cyan-200 transition-colors hover:border-cyan-200 hover:text-white sm:block">
          See all prizes
        </Link>
      </div>

      <div className="relative mt-4">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[78px] z-[2] h-[150px] opacity-80 mix-blend-multiply">
          <Image src="/dollar-choice-energy-trails.png" alt="" fill sizes="100vw" className="object-cover object-center saturate-150 contrast-110" />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[92px] z-[3] h-[128px] opacity-100 mix-blend-screen">
          <Image src="/dollar-choice-energy-trails.png" alt="" fill sizes="100vw" className="object-cover object-center saturate-175 contrast-125 drop-shadow-[0_0_22px_rgba(0,185,255,0.44)]" />
        </div>

        <div
          ref={trackRef}
          className="zl-noscroll relative z-10 flex cursor-grab touch-pan-y select-none gap-3 overflow-x-auto px-4 pb-5 pt-2 active:cursor-grabbing sm:gap-5 sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]"
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
            const meterColor = item.percentFilled >= 90 ? "#f32343" : item.percentFilled >= 75 ? "#ff6b22" : item.percentFilled >= 50 ? "#0787e8" : "#25c46a";
            return (
              <article key={item.id} className="group relative w-[174px] shrink-0 overflow-hidden rounded-2xl border border-[#a9bfd0] bg-white shadow-[0_16px_35px_rgba(0,19,46,0.2)] transition-transform duration-300 hover:-translate-y-1 sm:w-[244px] sm:rounded-[22px]">
                <Link href={item.href} draggable={false} className="block p-3 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500">
                  <div className="relative h-[102px] overflow-hidden rounded-[13px] border border-slate-200 bg-[linear-gradient(145deg,#ffffff,#f3f5f6)] sm:h-[150px] sm:rounded-[15px]">
                    <span aria-hidden="true" className="absolute inset-x-5 bottom-2 h-7 rounded-full opacity-20 blur-lg" style={{ backgroundColor: item.accent }} />
                    <Image src={item.image} alt="" aria-hidden="true" draggable={false} fill sizes="244px" className="relative z-10 object-contain p-3 drop-shadow-[0_10px_9px_rgba(0,19,46,0.2)] transition-transform duration-300 group-hover:scale-[1.04]" />
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <h3 style={{ maxWidth: 150, minHeight: 62 }} className="text-left text-[15px] font-extrabold leading-[1.22] text-[#00132e]">{item.title}</h3>
                    <CircularProgress percent={item.percentFilled} color={meterColor} label={`${item.title} pool filled`} />
                  </div>
                </Link>
                <Link
                  href={item.href}
                  draggable={false}
                  style={{ backgroundColor: "#087ff5", margin: "0 10px 10px", borderRadius: 10 }}
                  className="grid h-9 place-items-center text-[14px] font-extrabold text-white shadow-[0_6px_14px_rgba(8,127,245,0.24)] transition hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                >
                  Enter $1
                </Link>
                <FavoriteButton itemName={`${item.title} alternate layout`} className="absolute right-2 top-2 z-30" />
              </article>
            );
          })}
        </div>

        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[11vw] bg-gradient-to-r from-[#031b44] via-[#031b44]/80 to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[11vw] bg-gradient-to-l from-[#031b44] via-[#031b44]/80 to-transparent" />
        <button type="button" aria-label="Scroll alternate prizes left" onClick={() => scroll(-1)} className="absolute left-[clamp(1rem,2.5vw,3rem)] top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-[#00132e]/95 text-2xl text-white transition-colors hover:border-cyan-300 hover:text-cyan-300 sm:grid">‹</button>
        <button type="button" aria-label="Scroll alternate prizes right" onClick={() => scroll(1)} className="absolute right-[clamp(1rem,2.5vw,3rem)] top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/45 bg-[#00132e]/95 text-2xl text-white transition-colors hover:border-cyan-300 hover:text-cyan-300 sm:grid">›</button>
      </div>
    </section>
  );
}
