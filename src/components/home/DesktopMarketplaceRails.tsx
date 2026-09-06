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

const desktopCategories = [
  { id: "groceries", label: "Groceries", image: "/category-groceries-v2.png" },
  { id: "everyday-items", label: "Everyday Items", image: "/category-everyday-items-v3.png" },
  { id: "gas", label: "Gas", image: "/category-gas-v2.png" },
  { id: "electronics", label: "Electronics", image: "/category-electronics-v2.png" },
  { id: "gift-cards", label: "Gift Cards", image: "/category-gift-cards-v3.png" },
  { id: "home-essentials", label: "Home Essentials", image: "/category-home-essentials-v2.png" },
  { id: "movie-night", label: "Movie Night", image: "/category-movie-night-v2.png" },
];

const endingSoon = [
  ...placeholderFeaturedOpportunities,
  ...placeholderDiscoveryOpportunities,
];

const popularBrands = [
  { name: "Amazon", color: "linear-gradient(145deg,#ffb11b,#ff6b00)" },
  { name: "Walmart", color: "linear-gradient(145deg,#1599df,#0572bd)" },
  { name: "Starbucks", color: "linear-gradient(145deg,#138f68,#006241)" },
  { name: "DoorDash", color: "linear-gradient(145deg,#ff5a4d,#e92819)" },
  { name: "The Home Depot", color: "linear-gradient(145deg,#ff9c22,#f26822)" },
  { name: "Nintendo", color: "linear-gradient(145deg,#f04444,#d51625)" },
  { name: "CVS", color: "linear-gradient(145deg,#f54b5c,#cc1634)" },
  { name: "Uber Eats", color: "linear-gradient(145deg,#37c875,#078c50)" },
  { name: "Adidas", color: "linear-gradient(145deg,#344961,#101820)" },
  { name: "PetSmart", color: "linear-gradient(145deg,#238ed0,#005696)" },
];

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

function useDragRail(ref: React.RefObject<HTMLDivElement | null>) {
  const drag = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  return {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const track = ref.current;
      if (!track) return;
      event.preventDefault();
      drag.current = {
        active: true,
        moved: false,
        startX: event.clientX,
        scrollLeft: track.scrollLeft,
      };
      track.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const track = ref.current;
      if (!track || !drag.current.active) return;
      const distance = event.clientX - drag.current.startX;
      if (Math.abs(distance) > 5) drag.current.moved = true;
      if (drag.current.moved) event.preventDefault();
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
    <section className="relative left-1/2 mt-3 w-screen -translate-x-1/2 space-y-4 px-4 sm:mt-8 sm:space-y-8 sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]">
      <div>
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
            {endingSoon.map((item, index) => {
            const demoRemaining = [5, 8, 12, 25, 32, 18, 7, 14, 21][index] ?? 5;
            const percent = Math.min(
              ((item.ticketCapacity - demoRemaining) / item.ticketCapacity) * 100,
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
            const urgencyLabel = demoRemaining <= 10 ? "Almost gone!" : "Going fast!";

            return (
              <article
                key={item.id}
                className="relative w-[150px] shrink-0 overflow-hidden rounded-xl bg-white text-[#00132e] transition-transform hover:-translate-y-0.5 sm:w-[220px] sm:rounded-2xl"
              >
                <Link
                  href="/browse"
                  draggable={false}
                  className="block h-full p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-500"
                >
                  <div className="relative h-[72px] overflow-hidden rounded-lg bg-[#f2f4f7] sm:h-[105px] sm:rounded-xl">
                    <Image src={item.image} alt="" aria-hidden="true" draggable={false} fill sizes="220px" className="object-contain p-2" />
                  </div>
                  <h3 className="mt-2.5 h-8 overflow-hidden text-[13px] font-bold leading-[1.2]">{item.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-500">{item.ticketCapacity.toLocaleString()} entries</p>
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
                    {demoRemaining}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-[14px] font-bold text-[#e31937]">{demoRemaining} left</span>
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
            {popularBrands.map((brand) => (
              <Link
                key={brand.name}
                href="/browse"
                draggable={false}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none sm:w-[116px] sm:gap-2.5"
              >
                <span
                  className="grid h-[62px] w-[62px] place-items-center rounded-full border border-white/15 px-1.5 text-center text-[10px] font-bold leading-tight text-white shadow-[0_12px_26px_rgba(0,0,0,0.2)] transition-transform group-hover:-translate-y-1 group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-cyan-300 sm:h-[104px] sm:w-[104px] sm:px-3 sm:text-[15px]"
                  style={{ background: brand.color }}
                >
                  {brand.name}
                </span>
              </Link>
            ))}
          </div>
          <SideRailButtons onScroll={(direction) => scroll(brandsRef.current, direction)} />
        </div>
      </div>

      <DollarChoiceCarousel />
      <div className="mt-0 grid grid-cols-1 gap-3 sm:mt-8 sm:gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <RecentWinnerRoll />
        <SocialActivityFeed />
      </div>
      <MarketplaceMosaicRail />
      <DollarChoiceCarouselLight />
    </section>
  );
}
