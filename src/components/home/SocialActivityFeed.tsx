"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { socialActivityDemoItems } from "@/lib/home/demo-data";

type Platform = "x" | "facebook" | "instagram" | "tiktok";

const platforms: Array<{ id: Platform; label: string; mark: string; color: string }> = [
  { id: "x", label: "X", mark: "X", color: "#eef2f7" },
  { id: "facebook", label: "Facebook", mark: "f", color: "#1877f2" },
  { id: "instagram", label: "Instagram", mark: "◎", color: "#d946ef" },
  { id: "tiktok", label: "TikTok", mark: "♪", color: "#111827" },
];

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "x") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M4 3h4.7l4.2 5.7L18 3h2l-6.2 7.1L21 21h-4.7l-4.7-6.3L6 21H4l6.7-7.7L4 3Zm3.7 1.6L17.1 19h2.1L9.8 4.6H7.7Z" /></svg>;
  }
  if (platform === "facebook") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M14 8h3V4.3c-.5-.1-2.2-.3-4-.3-3 0-5 1.8-5 5.2V12H5v4h3v8h4v-8h3.3l.7-4h-4V9.6c0-1.2.3-1.6 2-1.6Z" /></svg>;
  }
  if (platform === "instagram") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#25f4ee" d="M14 3v11.2a3.2 3.2 0 1 1-2.3-3.1V8.4a5.8 5.8 0 1 0 5.1 5.8V8.1c1.2.9 2.7 1.4 4.2 1.4V6.7A4.3 4.3 0 0 1 16.8 3H14Z" /><path fill="#fe2c55" opacity=".8" d="M16 3v10.7a3.2 3.2 0 1 1-2.3-3.1v2.7a1 1 0 1 0 .3.7V3h2Z" /></svg>;
}

export function SocialActivityFeed() {
  const [platform, setPlatform] = useState<Platform>("x");
  const [paused, setPaused] = useState(false);
  const trackViewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, wasPaused: false, startX: 0, scrollLeft: 0 });

  const items = useMemo(
    () => socialActivityDemoItems.filter((item) => item.platform === platform),
    [platform],
  );
  const stripItems = useMemo(
    () => Array.from({ length: 8 }, (_, repetition) =>
      items.map((item) => ({ item, repetition })),
    ).flat(),
    [items],
  );

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setPlatform((current) => {
        const index = platforms.findIndex((item) => item.id === current);
        return platforms[(index + 1) % platforms.length].id;
      });
    }, 20000);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const viewport = trackViewportRef.current;
    if (!viewport) return;
    if (paused) return;

    let frame = 0;
    let previousTime = performance.now();
    const move = (time: number) => {
      const elapsed = Math.min(time - previousTime, 50);
      previousTime = time;
      viewport.scrollLeft += elapsed * 0.035;
      const loopPoint = viewport.scrollWidth / 2;
      if (loopPoint > 0 && viewport.scrollLeft >= loopPoint) {
        viewport.scrollLeft -= loopPoint;
      }
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [paused, platform, stripItems.length]);

  useEffect(() => {
    if (trackViewportRef.current) trackViewportRef.current.scrollLeft = 0;
  }, [platform]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current.wasPaused = paused;
    setPaused(true);
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const viewport = trackViewportRef.current;
    if (!viewport) return;
    dragRef.current = { active: true, moved: false, wasPaused: paused, startX: event.clientX, scrollLeft: viewport.scrollLeft };
    viewport.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = trackViewportRef.current;
    if (!viewport || !dragRef.current.active) return;
    const distance = event.clientX - dragRef.current.startX;
    if (Math.abs(distance) > 5) dragRef.current.moved = true;
    viewport.scrollLeft = dragRef.current.scrollLeft - distance;
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    const viewport = trackViewportRef.current;
    if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  };

  return (
    <section aria-labelledby="social-activity-title" className="relative min-w-0 overflow-hidden rounded-[22px] border border-orange-300/45 bg-[radial-gradient(ellipse_at_8%_-15%,rgba(255,176,58,.78)_0%,transparent_36%),radial-gradient(ellipse_at_92%_115%,rgba(255,67,8,.7)_0%,transparent_43%),linear-gradient(125deg,#d94b0b_0%,#f65c0d_42%,#c9400a_72%,#10254a_100%)] shadow-[0_16px_40px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,220,166,.28)]">
      <h2 id="social-activity-title" className="sr-only">Social Activity Live Feed</h2>
      <svg aria-hidden="true" viewBox="0 0 1000 220" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-5 h-full w-full opacity-75">
        <path d="M-40 62C120 8 214 118 370 65S626 8 782 67s214 38 292-3" fill="none" stroke="rgba(255,125,22,.92)" strokeWidth="24" strokeLinecap="round" />
        <path d="M-55 166c151-67 274 31 413-8s267-71 397-17 233 53 321 6" fill="none" stroke="rgba(255,65,5,.88)" strokeWidth="36" strokeLinecap="round" />
        <path d="M-20 111c148-42 251 46 398 4s250-55 390-8 214 29 276-5" fill="none" stroke="rgba(255,190,92,.72)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 1000 220" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <filter id="social-orange-neon-glow" x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d="M-25 31C92 2 171 18 258 70S432 108 548 55 706 26 799 83 918 153 1025 31 M-20 91C105 156 199 143 301 105S470 152 583 146 720 49 823 67 923 146 1024 185 M-20 187C91 130 180 206 289 185S433 117 550 142 670 217 784 181 906 91 1020 72" fill="none" stroke="#ff9400" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" filter="url(#social-orange-neon-glow)" />
        <path d="M-25 31C92 2 171 18 258 70S432 108 548 55 706 26 799 83 918 153 1025 31 M-20 91C105 156 199 143 301 105S470 152 583 146 720 49 823 67 923 146 1024 185 M-20 187C91 130 180 206 289 185S433 117 550 142 670 217 784 181 906 91 1020 72" fill="none" stroke="#fff0a6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-20 67C118 114 201 27 335 53S488 182 612 157 757 91 1025 126 M-20 132C96 88 185 170 299 154S438 49 559 63 702 176 819 146 921 95 1020 101 M68 214C208 151 309 194 419 174S559 83 670 104 808 191 948 170" fill="none" stroke="#ffc04a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#social-orange-neon-glow)" />
        <path d="M-20 67C118 114 201 27 335 53S488 182 612 157 757 91 1025 126 M-20 132C96 88 185 170 299 154S438 49 559 63 702 176 819 146 921 95 1020 101 M68 214C208 151 309 194 419 174S559 83 670 104 808 191 948 170" fill="none" stroke="#fff8d7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="group relative z-10 flex h-[152px] gap-3 p-3">
        <nav aria-label="Filter social activity" className="flex w-[48px] shrink-0 flex-col items-center justify-center gap-1 py-1">
          {platforms.map((item) => (
            <button key={item.id} type="button" onClick={() => setPlatform(item.id)} aria-label={item.label} aria-pressed={platform === item.id} className="grid h-9 w-9 place-items-center rounded-full border text-[12px] font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" style={{ color: item.id === "x" ? "#071426" : "white", background: item.color, borderColor: platform === item.id ? "white" : "rgba(255,255,255,.12)", boxShadow: platform === item.id ? `0 0 0 2px #071426, 0 0 0 4px ${item.color}` : "none" }}>
              <PlatformIcon platform={item.id} />
            </button>
          ))}
        </nav>

        <div
          ref={trackViewportRef}
          className="zl-noscroll min-w-0 flex-1 cursor-grab touch-pan-x overflow-x-auto overscroll-x-contain active:cursor-grabbing"
          aria-label={`${platform} posts`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={() => { dragRef.current.active = false; }}
          onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (dragRef.current.moved) {
              dragRef.current.moved = false;
              return;
            }
            if (dragRef.current.wasPaused) setPaused(false);
          }}
        >
          <div className="flex h-full w-max">
            {[0, 1].map((copy) => (
              <div key={copy} aria-hidden={copy === 1} className="flex h-full gap-3 pr-3">
                {stripItems.map(({ item, repetition }) => {
                  const decorativeCopy = copy === 1 || repetition > 0;
                  return (
                  <Link href={item.href} aria-hidden={decorativeCopy || undefined} tabIndex={decorativeCopy ? -1 : undefined} key={`${copy}-${repetition}-${item.id}`} className={`flex h-full w-[225px] min-w-0 flex-col rounded-[15px] border p-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${item.platform === "tiktok" ? "border-cyan-100/35 bg-[#087ff5]/90 shadow-[inset_0_1px_0_rgba(255,255,255,.22),0_8px_20px_rgba(8,127,245,.3)] hover:bg-[#1692ff]" : "border-white/10 bg-[#071426]/65 hover:border-orange-200/50 hover:bg-[#071426]/80"}`}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/25" style={{ backgroundColor: item.accent }}>
                        <Image src={item.avatar} alt={`${item.name} profile`} fill sizes="40px" className="object-cover object-top" />
                      </span>
                      <span className="min-w-0">
                        <strong className="block truncate text-[13px] text-white">{item.name}</strong>
                        <span className="block truncate text-[10px] text-white/50">{item.handle}</span>
                      </span>
                    </span>
                    <span className="mt-auto line-clamp-2 block pt-2 text-[13px] font-bold leading-[1.3] text-white/95">{item.message}</span>
                  </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
