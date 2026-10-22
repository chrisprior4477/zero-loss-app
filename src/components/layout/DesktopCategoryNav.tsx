"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  categorySubcategories,
  endingSoonItemHrefs,
} from "@/lib/home/placeholder-data";
import { marketplaceCategoryHref } from "@/lib/catalog/navigation";
import { isResolvedCatalogHref } from "@/lib/catalog/demo-visibility";
import { HomeIcon } from "./HomeIcon";

const desktopCategories = [
  "Ending Soon",
  "All",
  "Everyday Items",
  "Groceries",
  "Gas",
  "Electronics",
  "Gift Cards",
  "Home Essentials",
] as const;

const desktopCategoryItems: Record<string, readonly string[]> = {
  ...categorySubcategories,
  Groceries: [
    "Grocery Gift Cards",
    "Meal Kits",
    "Coffee & Tea",
    "Snack Boxes",
    "Beverages",
    "Pantry Staples",
    "Fresh Produce Credit",
    "Bulk Essentials",
    "Convenience Bundles",
  ],
  Gas: [
    "Gas Cards",
    "Fuel Rewards",
    "Road-Trip Bundles",
    "Convenience Store Credit",
    "Car Washes",
    "EV Charging",
  ],
};

type EndingSoonMenuItem = { title: string; href: string; remaining: number };

export function DesktopCategoryNav({ endingSoonItems, resolvedSlugs = [], preview = false, showHome = true }: { endingSoonItems: EndingSoonMenuItem[]; resolvedSlugs?: string[]; preview?: boolean; showHome?: boolean }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const resolved = new Set(resolvedSlugs);
  const navRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{ x: number; left: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [menuTop, setMenuTop] = useState(0);
  const openMenu = (category: string) => {
    if (preview || dragRef.current?.dragging) return;
    setMenuTop(navRef.current?.getBoundingClientRect().bottom ?? 0);
    setOpenCategory(category);
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const slideWithWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (event.target instanceof Element && event.target.closest('[role="menu"]')) return;

      const maxScroll = nav.scrollWidth - nav.clientWidth;
      if (maxScroll <= 0) return;
      const next = Math.max(0, Math.min(maxScroll, nav.scrollLeft + event.deltaY));
      if (Math.abs(next - nav.scrollLeft) < 1) return;

      event.preventDefault();
      nav.scrollBy({ left: event.deltaY, behavior: "smooth" });
    };

    nav.addEventListener("wheel", slideWithWheel, { passive: false });
    return () => nav.removeEventListener("wheel", slideWithWheel);
  }, []);

  useEffect(() => {
    if (!openCategory) return;

    const closeOutside = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenCategory(null);
    };

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    const closeOnPageScroll = (event: Event) => { if (event.target === document) setOpenCategory(null); };
    window.addEventListener("scroll", closeOnPageScroll, true);
    const closeOnResize = () => setOpenCategory(null);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnPageScroll, true);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [navRef, openCategory]);

  return <>
    <nav
      ref={navRef}
      aria-label="Marketplace categories"
      className="min-w-0 self-stretch flex-1 overflow-x-auto overscroll-x-contain zl-noscroll"
      style={{ cursor: "grab" }}
      onDragStart={event => event.preventDefault()}
      onPointerDown={event => {
        if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as Element).closest('[role="menu"]')) return;
        suppressClick.current = false;
        dragRef.current = { x: event.clientX, left: event.currentTarget.scrollLeft, dragging: false };
      }}
      onPointerMove={event => {
        const drag = dragRef.current;
        if (!drag || event.buttons !== 1) return;
        const distance = event.clientX - drag.x;
        if (!drag.dragging && Math.abs(distance) < 6) return;
        drag.dragging = true;
        suppressClick.current = true;
        setOpenCategory(null);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.currentTarget.style.cursor = "grabbing";
        event.currentTarget.style.userSelect = "none";
        event.preventDefault();
        event.currentTarget.scrollLeft = drag.left - distance;
      }}
      onPointerUp={event => {
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        event.currentTarget.style.cursor = "grab";
        event.currentTarget.style.userSelect = "";
      }}
      onPointerCancel={event => { dragRef.current = null; event.currentTarget.style.cursor = "grab"; event.currentTarget.style.userSelect = ""; }}
      onClickCapture={event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
      onMouseLeave={() => setOpenCategory(null)}
    >
      <ul className="flex h-full w-max min-w-full items-center justify-start gap-1 px-2 lg:justify-center lg:px-0 xl:gap-2">
        {showHome ? <li className="flex h-full shrink-0 items-center">
          <Link href="/" aria-label="Home" onClick={() => setOpenCategory(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-cyan-100 transition-colors hover:bg-cyan-300/10 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300 sm:h-9 sm:w-9">
            <HomeIcon className="h-[18px] w-[18px]" />
          </Link>
        </li> : null}
        {desktopCategories.map((category, index) => {
          const isOpen = openCategory === category;
          const isMerchandising = index === 0;
          const items = category === "Ending Soon"
            ? endingSoonItems.map((item) => ({ label: item.title, href: item.href, remaining: item.remaining }))
            : (desktopCategoryItems[category] ?? []).filter(item => category !== "All" || !isResolvedCatalogHref(endingSoonItemHrefs[item], resolved)).map((item) => ({
                label: item,
                href: category === "All" && endingSoonItemHrefs[item]
                  ? `${endingSoonItemHrefs[item]}?from=${encodeURIComponent("/browse")}`
                  : marketplaceCategoryHref(category, item),
                remaining: null,
              }));

          return (
            <li
              key={category}
              className="flex h-full shrink-0 items-center"
              onMouseEnter={() => openMenu(category)}
            >
              <Link
                href={marketplaceCategoryHref(category)}
                data-ending-soon-link={isMerchandising || undefined}
                aria-expanded={preview ? undefined : isOpen}
                aria-haspopup={preview ? undefined : "menu"}
                onFocus={() => openMenu(category)}
                onClick={() => setOpenCategory(null)}
                className={
                  isMerchandising
                    ? "inline-flex h-8 items-center rounded-full bg-[var(--urgent)] px-3 text-[13px] font-medium text-white shadow-[0_2px_0_rgba(0,0,0,0.14)] transition-colors hover:bg-[#ff7a24] sm:px-4 sm:text-[15px] lg:text-[16px]"
                    : "inline-flex h-7 items-center rounded-md px-2 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/8 hover:text-white sm:text-[15px] lg:text-[16px]"
                }
              >
                {category}
              </Link>

              {isOpen ? (
                <div
                  role="menu"
                  aria-label={`${category} menu`}
                  style={{ top: menuTop, maxHeight: `calc(100dvh - ${menuTop}px)`, overflowY: "auto", cursor: "auto" }}
                  className="fixed left-0 z-50 w-screen border-y border-white/10 bg-[#00132e]/[0.98] px-4 py-5 shadow-[0_22px_48px_rgba(0,0,0,0.42)] backdrop-blur-md sm:px-6 lg:px-[clamp(3rem,8vw,10rem)] lg:py-7"
                >
                  <div className="mx-auto max-w-[1440px]">
                    <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                      {category}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:gap-x-10 lg:grid-cols-3 xl:grid-cols-4">
                      {items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setOpenCategory(null)}
                        className="flex min-h-11 items-center justify-between gap-2 border-b border-white/8 px-1 text-[16px] font-medium text-white/85 transition-colors hover:border-[var(--accent)] hover:text-white focus-visible:border-[var(--accent)] focus-visible:text-white focus-visible:outline-none"
                      >
                        <span>{item.label}</span>
                        {item.remaining !== null ? <span className="shrink-0 text-xs text-cyan-300">{item.remaining} left</span> : null}
                      </Link>
                      ))}
                      {category === "Ending Soon" && !items.length ? <p className="col-span-full py-2 text-sm text-white/70">No offers are near capacity right now.</p> : null}
                      <Link
                        href={marketplaceCategoryHref(category)}
                        role="menuitem"
                        onClick={() => setOpenCategory(null)}
                        className="col-span-full mt-2 flex min-h-11 items-center justify-center rounded-lg border border-[var(--accent)]/55 bg-[var(--accent)]/10 px-4 text-[14px] font-extrabold text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[#00132e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                      >
                        {category === "All" ? "See all products" : `See all ${category}`}
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  </>;
}
