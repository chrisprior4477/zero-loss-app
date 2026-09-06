"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { CircularProgress } from "@/components/home/DollarChoiceCarouselLight";
import { dollarChoiceDemoItems, marketplaceMovementDemoItems } from "@/lib/home/demo-data";

const products = dollarChoiceDemoItems;

function EntryButton() {
  return <span style={{ minWidth: 78 }} className="grid h-9 shrink-0 place-items-center whitespace-nowrap rounded-md bg-[#73e72d] px-3 text-[12px] font-extrabold text-[#00132e] shadow-[0_0_14px_rgba(49,232,0,0.22)]">$1 Entry</span>;
}

function FeatureCard({ item }: { item: (typeof products)[number] }) {
  const meterColor = item.percentFilled >= 90 ? "#f32343" : item.percentFilled >= 75 ? "#ff6b22" : item.percentFilled >= 50 ? "#0787e8" : "#25c46a";
  const movement = marketplaceMovementDemoItems.find((entry) => entry.itemId === item.id);
  const ticketsLeft = movement?.spotsLeft ?? Math.max(25, Math.round((100 - item.percentFilled) * 12));

  return (
    <article className="group relative w-[320px] shrink-0 overflow-hidden rounded-[22px] border border-cyan-200/20 bg-[#031a3d] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
      <Link href={item.href} draggable={false} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
        <div className="relative h-[196px] overflow-hidden bg-[linear-gradient(145deg,#fff,#e9eef2)]">
          <span aria-hidden="true" className="absolute inset-x-[20%] bottom-3 h-10 rounded-full opacity-20 blur-xl" style={{ backgroundColor: item.accent }} />
          <Image
            src={item.image}
            alt=""
            aria-hidden="true"
            draggable={false}
            fill
            sizes="320px"
            style={{ paddingRight: 92, objectPosition: "left center" }}
            className="object-contain p-4 drop-shadow-[0_15px_14px_rgba(0,19,46,0.22)] transition-transform duration-300 group-hover:scale-[1.035]"
          />
          <span style={{ position: "absolute", right: 14, top: 76 }} className="z-10 text-right text-[10px] font-extrabold uppercase leading-tight tracking-[0.04em] text-slate-500">
            <span className="block text-[15px] leading-none text-[#00132e]">{ticketsLeft.toLocaleString()}</span>
            tickets left
          </span>
          <span style={{ position: "absolute", right: 16, bottom: 20 }} className="z-10">
            <CircularProgress percent={item.percentFilled} color={meterColor} label={`${item.title} pool filled`} />
          </span>
        </div>
        <div className="flex min-h-[68px] items-center justify-between gap-4 px-5 py-3">
          <div style={{ maxWidth: 180 }} className="min-w-0">
            <h3 className="text-[15px] font-extrabold leading-tight text-white">{item.title}</h3>
          </div>
          <EntryButton />
        </div>
      </Link>
      <FavoriteButton itemName={`${item.title} marketplace`} className="absolute right-3 top-3 z-20" />
    </article>
  );
}

function CompactCard({ item }: { item: (typeof products)[number] }) {
  return (
    <article className="group relative h-[123px] w-[230px] overflow-hidden rounded-[20px] border border-cyan-200/15 bg-[linear-gradient(120deg,#052350,#021630)] shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
      <Link href={item.href} draggable={false} className="flex h-full items-center gap-3 px-3 pr-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
        <div className="relative h-[94px] w-[92px] shrink-0 overflow-hidden rounded-[16px] bg-[radial-gradient(circle,#f9fbfc_0%,#dce8ef_66%,rgba(116,231,45,0.18)_100%)]">
          <span aria-hidden="true" className="absolute inset-4 rounded-full opacity-20 blur-xl" style={{ backgroundColor: item.accent }} />
          <Image src={item.image} alt="" aria-hidden="true" draggable={false} fill sizes="92px" className="object-contain p-2 drop-shadow-[0_10px_10px_rgba(0,0,0,0.28)] transition-transform duration-300 group-hover:scale-105" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-extrabold leading-tight text-white">{item.title}</h3>
          <p className="mt-2 text-[11px] font-semibold text-white/55">{item.percentFilled}% filled</p>
          <div className="mt-2"><EntryButton /></div>
        </div>
      </Link>
      <FavoriteButton itemName={`${item.title} marketplace`} className="absolute right-2 top-2 z-20" />
    </article>
  );
}

export function MarketplaceMosaicRail() {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

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

  const scroll = (direction: -1 | 1) => trackRef.current?.scrollBy({ left: direction * 760, behavior: "smooth" });

  return (
    <section aria-labelledby="marketplace-mosaic-title" className="relative left-1/2 mt-8 w-screen -translate-x-1/2 overflow-hidden bg-[#031b44] py-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_50%,rgba(0,185,255,0.09),transparent_30%),radial-gradient(circle_at_72%_50%,rgba(49,232,0,0.07),transparent_31%)]" />
      <div className="relative z-10 mx-auto mb-5 flex max-w-[1600px] items-end justify-between px-4 sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]">
        <div className="border-l-4 border-[#31e800] pl-4">
          <h2 id="marketplace-mosaic-title" className="text-[22px] font-extrabold tracking-[-0.035em] text-white sm:text-[26px]">Browse the marketplace</h2>
          <p className="mt-1 text-[13px] text-white/58">Discover all rewards</p>
        </div>
        <Link href="/browse" className="text-[13px] font-bold text-cyan-300 hover:text-white">See all rewards</Link>
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          className="zl-noscroll relative z-10 flex cursor-grab touch-pan-y select-none gap-5 overflow-x-auto px-4 pb-3 active:cursor-grabbing sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]"
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
          <FeatureCard item={products[1]} />
          <div className="flex shrink-0 flex-col gap-[14px]"><CompactCard item={products[0]} /><CompactCard item={products[5]} /></div>
          <FeatureCard item={products[2]} />
          <div className="flex shrink-0 flex-col gap-[14px]"><CompactCard item={products[4]} /><CompactCard item={products[3]} /></div>
          <FeatureCard item={products[6]} />
          <div className="flex shrink-0 flex-col gap-[14px]"><CompactCard item={products[3]} /><CompactCard item={products[0]} /></div>
          <FeatureCard item={products[3]} />
          <div className="flex shrink-0 flex-col gap-[14px]"><CompactCard item={products[2]} /><CompactCard item={products[5]} /></div>
          <FeatureCard item={products[0]} />
          <div className="flex shrink-0 flex-col gap-[14px]"><CompactCard item={products[6]} /><CompactCard item={products[1]} /></div>
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-20 w-[8vw] bg-gradient-to-r from-[#031b44] to-transparent" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-20 w-[8vw] bg-gradient-to-l from-[#031b44] to-transparent" />
        <button type="button" aria-label="Scroll marketplace left" onClick={() => scroll(-1)} className="absolute left-[clamp(1rem,2.5vw,3rem)] top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#00132e]/95 text-2xl text-white hover:border-cyan-300 sm:grid">‹</button>
        <button type="button" aria-label="Scroll marketplace right" onClick={() => scroll(1)} className="absolute right-[clamp(1rem,2.5vw,3rem)] top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#00132e]/95 text-2xl text-white hover:border-cyan-300 sm:grid">›</button>
      </div>
    </section>
  );
}
