"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { DollarChoiceCarousel } from "@/components/home/DollarChoiceCarousel";
import { DollarChoiceCarouselLight } from "@/components/home/DollarChoiceCarouselLight";
import { MarketplaceMosaicRail } from "@/components/home/MarketplaceMosaicRail";
import { RecentWinnerRoll } from "@/components/home/RecentWinnerRoll";
import { SocialActivityFeed } from "@/components/home/SocialActivityFeed";
import {
  placeholderDiscoveryOpportunities,
  placeholderFeaturedOpportunities,
} from "@/lib/home/placeholder-data";
import { popularRewardBrands } from "@/lib/catalog/popular-rewards";

const desktopCategories = [
  { id: "groceries", label: "Groceries", image: "/category-groceries-v2.png" },
  { id: "everyday-items", label: "Everyday Items", image: "/category-everyday-items-v3.png" },
  { id: "gas", label: "Gas", image: "/category-gas-v2.png" },
  { id: "electronics", label: "Electronics", image: "/category-electronics-v2.png" },
  { id: "gift-cards", label: "Gift Cards", image: "/category-gift-cards-v3.png" },
  { id: "home-essentials", label: "Home Essentials", image: "/category-home-essentials-v2.png" },
  { id: "movie-night", label: "Movie Night", image: "/category-movie-night-v2.png" },
];

const endingSoonRemaining = [1, 1, 1, 5, 7, 8, 12, 14, 21] as const;

const endingSoon = [
  ...placeholderFeaturedOpportunities,
  ...placeholderDiscoveryOpportunities,
]
  .map((item, index) => ({
    item,
    remaining: endingSoonRemaining[index] ?? 21,
  }))
  .sort((a, b) => a.remaining - b.remaining);

function SideRailButtons({ onScroll }: { onScroll: (direction: -1 | 1) => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => onScroll(-1)}
        className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[#00132e]/90 text-2xl text-white shadow-lg transition-colors hover:border-cyan-300 hover:text-cyan-300 sm:grid"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => onScroll(1)}
        className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-[#00132e]/90 text-2xl text-white shadow-lg transition-colors hover:border-cyan-300 hover:text-cyan-300 sm:grid"
      >
        ›
      </button>
    </>
  );
}

function EndingSoonArtwork({ item }: { item: (typeof placeholderDiscoveryOpportunities)[number] }) {
  if (item.image.startsWith("/catalog/")) {
    return (
      <Image
        src={item.image}
        alt=""
        aria-hidden="true"
        draggable={false}
        fill
        sizes="220px"
        className="object-contain p-2"
      />
    );
  }

  if (item.id === "placeholder-discovery-1") {
    return (
      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_0%,#fff7ec_0%,#ffe7c4_58%,#ffc77d_100%)] p-2">
        <div className="grid aspect-[1.62/1] w-[82%] place-items-center rounded-md border border-[#ff8a00]/50 bg-white text-center shadow-[0_5px_12px_rgba(105,48,0,0.2)] -rotate-2">
          <span className="text-[12px] font-black uppercase leading-none tracking-[-0.06em] sm:text-[17px]">
            <span className="text-[#f58220]">Dunkin&apos;</span>{" "}
            <span className="text-[#e11383]">Donuts</span>
          </span>
        </div>
      </div>
    );
  }

  if (item.id === "placeholder-discovery-2") {
    return (
      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_0%,#fff_0%,#f6f1e7_58%,#e9dfcd_100%)] p-2">
        <div className="grid aspect-[1.62/1] w-[82%] place-items-center rounded-md border border-[#d8cbb7] bg-white text-center shadow-[0_5px_12px_rgba(48,38,24,0.18)] -rotate-2">
          <span className="text-[13px] font-black tracking-[-0.06em] text-[#111] sm:text-[18px]">HomeGoods</span>
        </div>
      </div>
    );
  }

  if (item.id === "placeholder-discovery-3") {
    return (
      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_0%,#eef8ff_0%,#d8ebf7_58%,#bdd9e8_100%)] p-2">
        <div className="grid aspect-[1.62/1] w-[82%] place-items-center rounded-md border border-[#004990]/35 bg-[#004990] text-center shadow-[0_5px_12px_rgba(0,38,79,0.28)] rotate-2">
          <span className="text-[17px] font-black italic tracking-[-0.05em] text-white sm:text-[24px]">LOWE&apos;S</span>
        </div>
      </div>
    );
  }

  if (item.id === "placeholder-discovery-4") {
    return (
      <div className="relative h-full bg-[radial-gradient(circle_at_50%_0%,#fff_0%,#eef2f8_58%,#dce3ed_100%)]">
        <div className="absolute left-[9%] top-[16%] grid aspect-[1.62/1] w-[64%] place-items-center rounded-md bg-[#1747ff] px-2 text-center text-[7px] font-black leading-tight text-white shadow-[0_5px_12px_rgba(0,19,46,0.25)] -rotate-6 sm:text-[10px]">
          BED BATH &amp; BEYOND
        </div>
        <div className="absolute bottom-[13%] right-[8%] grid aspect-[1.62/1] w-[64%] place-items-center rounded-md bg-[#7b2cbf] text-center text-[12px] font-black italic text-white shadow-[0_5px_12px_rgba(0,19,46,0.3)] rotate-6 sm:text-[17px]">
          wayfair
        </div>
      </div>
    );
  }

  if (item.id === "placeholder-discovery-6") {
    return (
      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_35%,#2b0508_0%,#080808_62%,#000_100%)] p-2">
        <div className="grid aspect-[1.62/1] w-[82%] place-items-center rounded-md border border-white/10 bg-[#090909] text-[30px] font-black text-[#e50914] shadow-[0_5px_15px_rgba(229,9,20,0.35)] sm:text-[42px]">
          N
        </div>
      </div>
    );
  }

  if (item.id === "placeholder-discovery-5") {
    return (
      <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_0%,#fffbdc_0%,#fff29b_58%,#f5dd35_100%)] p-2">
        <div className="grid aspect-[1.62/1] w-[82%] place-items-center rounded-md border border-[#003b64]/25 bg-[#fff200] text-center shadow-[0_5px_12px_rgba(0,34,59,0.22)] -rotate-2">
          <span className="text-[15px] font-black tracking-[-0.07em] text-[#003b64] sm:text-[21px]">BEST BUY</span>
        </div>
      </div>
    );
  }

  return <Image src={item.image} alt="" aria-hidden="true" draggable={false} fill sizes="220px" className="object-contain p-2" />;
}

function useDragRail(ref: React.RefObject<HTMLDivElement | null>) {
  const drag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const track = ref.current;
      if (!track) return;
      drag.current = {
        active: true,
        moved: false,
        startX: event.clientX,
        scrollLeft: track.scrollLeft,
      };
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const track = ref.current;
      if (!track || !drag.current.active) return;
      const distance = event.clientX - drag.current.startX;
      if (Math.abs(distance) > 5) drag.current.moved = true;
      if (drag.current.moved) {
        event.preventDefault();
        if (!track.hasPointerCapture(event.pointerId)) {
          track.setPointerCapture(event.pointerId);
        }
      }
      track.scrollLeft = drag.current.scrollLeft - distance;
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      drag.current.active = false;
      const track = ref.current;
      if (track?.hasPointerCapture(event.pointerId)) {
        track.releasePointerCapture(event.pointerId);
      }
    },
    onPointerCancel: () => {
      drag.current.active = false;
    },
    onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
      if (drag.current.moved) {
        event.preventDefault();
        event.stopPropagation();
        drag.current.moved = false;
      }
    },
  };
}

export function DesktopMarketplaceRails() {
  const categoriesRef = useRef<HTMLDivElement>(null);
  const endingRef = useRef<HTMLDivElement>(null);
  const brandsRef = useRef<HTMLDivElement>(null);
  const categoryDrag = useDragRail(categoriesRef);
  const endingDrag = useDragRail(endingRef);
  const brandsDrag = useDragRail(brandsRef);

  const scroll = (track: HTMLDivElement | null, direction: -1 | 1) => {
    track?.scrollBy({ left: direction * 720, behavior: "smooth" });
  };

  return (
    <section className="relative left-1/2 mt-3 w-screen -translate-x-1/2 space-y-4 px-4 sm:mt-8 sm:space-y-8 sm:px-6 md:mt-3 md:space-y-4 lg:px-[clamp(3rem,6vw,7rem)]">
      <div id="popular-rewards" className="scroll-mt-28">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-[21px] font-bold tracking-[-0.02em] text-white sm:text-[24px]">Shop by category</h2>
            <p className="mt-1 text-[13px] text-white/60">Find the kinds of products you already shop for.</p>
          </div>
          <Link href="/browse" className="text-[14px] font-semibold text-cyan-300 hover:text-cyan-200">See all</Link>
        </div>

        <div className="relative">
          <div
            ref={categoriesRef}
            className="zl-noscroll flex cursor-grab touch-auto select-none gap-3 overflow-x-auto overscroll-x-contain px-1 pb-1 active:cursor-grabbing sm:gap-4"
            onDragStart={(event) => event.preventDefault()}
            {...categoryDrag}
          >
            {desktopCategories.map((category) => (
            <div
              key={category.id}
              className="group relative h-[112px] w-[130px] shrink-0 overflow-hidden rounded-xl border border-white/20 bg-[#00132e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:h-[178px] sm:w-[210px] sm:rounded-2xl"
            >
              <Link href="/browse" draggable={false} className="absolute inset-0">
                <Image
                  src={category.image}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  fill
                  sizes="210px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#00132e] via-transparent to-transparent" />
                <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 text-[14px] font-bold text-white sm:px-4 sm:pb-3 sm:text-[16px]">{category.label}</span>
              </Link>
            </div>
            ))}
          </div>
          <SideRailButtons onScroll={(direction) => scroll(categoriesRef.current, direction)} />
        </div>
      </div>

      <div id="ending-soon" className="scroll-mt-[180px] md:scroll-mt-[128px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[21px] font-bold tracking-[-0.02em] text-white sm:text-[24px]">Ending Soon</h2>
              <span className="rounded-full border border-cyan-300/50 px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-cyan-300">Demo data</span>
            </div>
            <p className="mt-1 text-[13px] text-white/60">Popular opportunities closest to completion.</p>
          </div>
          <Link href="/browse" className="text-[14px] font-semibold text-cyan-300 hover:text-cyan-200">See all</Link>
        </div>

        <div className="relative">
          <div
            ref={endingRef}
            className="zl-noscroll flex cursor-grab touch-auto select-none gap-4 overflow-x-auto overscroll-x-contain px-1 pb-1 pt-3 active:cursor-grabbing"
            onDragStart={(event) => event.preventDefault()}
            {...endingDrag}
          >
            {endingSoon.map(({ item, remaining }) => {
            const percent = Math.min(
              ((item.ticketCapacity - remaining) / item.ticketCapacity) * 100,
              100
            );
            const filledSegments = Math.round(percent / 10);
            const progressColor =
              percent >= 90
                ? "#e31937"
                : percent >= 72
                  ? "#ff6b22"
                  : percent >= 45
                    ? "#0787e8"
                    : "#70c51c";
            const urgencyLabel = remaining <= 10 ? "Almost gone!" : "Going fast!";

            return (
              <article
                key={item.id}
                className="relative w-[150px] shrink-0 overflow-hidden rounded-xl bg-white text-[#00132e] transition-transform hover:-translate-y-0.5 sm:w-[220px] sm:rounded-2xl"
              >
                <Link
                  href={item.href ?? "/browse"}
                  draggable={false}
                  className="block h-full p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500"
                >
                  <div className="relative h-[72px] overflow-hidden rounded-lg bg-[#f2f4f7] sm:h-[105px] sm:rounded-xl">
                    <EndingSoonArtwork item={item} />
                  </div>
                  <h3 className="mt-2.5 h-8 overflow-hidden text-[13px] font-bold leading-[1.2]">{item.title}</h3>
                  <p className="mt-1 whitespace-nowrap text-[10px] font-semibold text-slate-500 sm:text-[11px]">
                    <span className="text-[#00132e]">{item.faceValueLabel} value</span>
                    <span aria-hidden="true"> · </span>
                    <span>{item.ticketCapacity.toLocaleString()} entries</span>
                  </p>
                  <div className="mt-2 flex gap-1" aria-label={`${Math.round(percent)}% filled`}>
                  {Array.from({ length: 10 }, (_, segment) => (
                    <span
                      key={segment}
                      aria-hidden="true"
                      className="h-2 flex-1 rounded-[3px]"
                      style={{
                        backgroundColor:
                          segment < filledSegments ? progressColor : "#e5e7eb",
                      }}
                    />
                  ))}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="relative grid h-9 w-[54px] shrink-0 place-items-center overflow-hidden rounded-[4px] bg-[#e31937] text-[19px] font-extrabold leading-none text-white before:absolute before:-left-1.5 before:top-1/2 before:h-3 before:w-3 before:-translate-y-1/2 before:rounded-full before:bg-white after:absolute after:-right-1.5 after:top-1/2 after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-white"
                  >
                    {remaining}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[14px] font-bold text-[#e31937]">{remaining} left</span>
                    <span className="mt-1 block text-[12px] font-semibold text-slate-500">{urgencyLabel}</span>
                  </span>
                  </div>
                </Link>
                <FavoriteButton itemName={item.title} className="absolute right-1.5 top-1.5 z-10" />
              </article>
            );
            })}
          </div>
          <SideRailButtons onScroll={(direction) => scroll(endingRef.current, direction)} />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[21px] font-bold tracking-[-0.02em] text-white sm:text-[24px]">Popular Rewards</h2>
            <span className="rounded-full border border-cyan-300/50 px-2 py-1 text-[9px] uppercase tracking-[0.08em] text-cyan-300">Demo order</span>
          </div>
          <Link href="/browse" className="text-[14px] font-semibold text-cyan-300 hover:text-cyan-200">See all</Link>
        </div>

        <div className="relative">
          <div
            ref={brandsRef}
            className="zl-noscroll flex cursor-grab touch-auto select-none gap-3 overflow-x-auto overscroll-x-contain px-1 py-2 active:cursor-grabbing sm:gap-7"
            onDragStart={(event) => event.preventDefault()}
            {...brandsDrag}
          >
            {popularRewardBrands.map((brand) => (
              <Link
                key={brand.name}
                href={`/rewards/${brand.slug}`}
                draggable={false}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none sm:w-[116px] sm:gap-2.5"
              >
                <span
                  className="grid h-[62px] w-[62px] place-items-center rounded-full border border-white/15 px-1.5 text-center text-[10px] font-bold leading-tight text-white shadow-[0_12px_26px_rgba(0,0,0,0.2)] transition-transform group-hover:-translate-y-1 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-cyan-300 sm:h-[104px] sm:w-[104px] sm:px-3 sm:text-[15px]"
                  style={{ background: brand.homeColor, color: "white" }}
                >
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
          <SideRailButtons onScroll={(direction) => scroll(brandsRef.current, direction)} />
        </div>
      </div>

      <div>
        <DollarChoiceCarousel />
        <div className="mt-0 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-6 md:mt-3 md:grid-cols-[280px_minmax(0,1fr)] md:gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <RecentWinnerRoll />
          <SocialActivityFeed />
        </div>
      </div>
      <MarketplaceMosaicRail />
      <DollarChoiceCarouselLight />
    </section>
  );
}
