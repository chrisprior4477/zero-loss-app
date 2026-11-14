"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  categorySubcategories,
  endingSoonItemHrefs,
} from "@/lib/home/placeholder-data";
import { marketplaceCategoryHref, marketplaceCategoryId, productMatchesMarketplaceCategory } from "@/lib/catalog/navigation";
import { expansionProducts } from "@/lib/catalog/expansion-products";
import { isResolvedCatalogHref } from "@/lib/catalog/demo-visibility";
import { HomeIcon } from "./HomeIcon";
import { AccountIcon } from "@/components/account/AccountIcon";
import styles from "./site-menu.module.css";

const desktopCategories = [
  "Ending Soon",
  "All",
  "Everyday Items",
  "Groceries",
  "Gas",
  "Electronics",
  "Gift Cards",
  "Home Essentials",
  "Outdoor & Camping",
  "Tools & DIY",
  "Kitchen",
  "Sports & Fitness",
  "Pet Supplies",
  "Fishing",
  "Health",
  "Beauty",
  "Arts & Crafts",
  "Travel",
  "Games & Puzzles",
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

export function DesktopCategoryNav({ endingSoonItems, resolvedSlugs = [], preview = false, showPinnedShortcuts = true }: { endingSoonItems: EndingSoonMenuItem[]; resolvedSlugs?: string[]; preview?: boolean; showPinnedShortcuts?: boolean }) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const resolved = new Set(resolvedSlugs);
  const navRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const railGroupRef = useRef<HTMLDivElement>(null);
  const railId = useId();
  const [edges, setEdges] = useState({ overflow: false, left: false, right: false });
  const categoryLinks = useRef(new Map<string, HTMLAnchorElement>());
  const restoringFocus = useRef(false);
  const dragRef = useRef<{ x: number; left: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [menuTop, setMenuTop] = useState(0);
  const openMenu = (category: string) => {
    if (preview || restoringFocus.current || dragRef.current?.dragging) return;
    setMenuTop(navRef.current?.getBoundingClientRect().bottom ?? 0);
    setOpenCategory(category);
  };

  useEffect(() => {
    const nav = railRef.current;
    const group = railGroupRef.current;
    if (!nav || !group) return;

    const slideWithWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (event.target instanceof Element && event.target.closest('[role="menu"]')) return;

      const maxScroll = nav.scrollWidth - nav.clientWidth;
      if (maxScroll <= 0) return;
      const next = Math.max(0, Math.min(maxScroll, nav.scrollLeft + event.deltaY));
      if (Math.abs(next - nav.scrollLeft) < 1) return;

      event.preventDefault();
      setOpenCategory(null);
      nav.scrollBy({ left: event.deltaY, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "instant" : "smooth" });
    };

    const measure = () => {
      const overflow = group.clientWidth > 0 && nav.scrollWidth > group.clientWidth + 1;
      const left = overflow && nav.scrollLeft > 1;
      const right = overflow && nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 1;
      setEdges(current => current.overflow === overflow && current.left === left && current.right === right
        ? current : { overflow, left, right });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(group);
    observer?.observe(nav);
    if (nav.firstElementChild) observer?.observe(nav.firstElementChild);
    measure();
    nav.addEventListener("scroll", measure, { passive: true });
    nav.addEventListener("wheel", slideWithWheel, { passive: false });
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      nav.removeEventListener("scroll", measure);
      nav.removeEventListener("wheel", slideWithWheel);
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (!openCategory) return;

    const closeOutside = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (navRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        restoringFocus.current = true;
        categoryLinks.current.get(openCategory)?.focus({ preventScroll: true });
        restoringFocus.current = false;
      }
      setOpenCategory(null);
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

  function scrollCategories(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail || !(direction === -1 ? edges.left : edges.right)) return;
    setOpenCategory(null);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.85, behavior: reduceMotion ? "instant" : "smooth" });
  }

  function renderCategory(category: typeof desktopCategories[number]) {
    const isOpen = openCategory === category;
    const isMerchandising = category === "Ending Soon";
    const categoryId = marketplaceCategoryId(category);
    const picturedItems = isOpen ? expansionProducts.filter(product => !resolved.has(product.slug)
      && (category === "All" || (categoryId && productMatchesMarketplaceCategory(product, categoryId))))
      .map(product => ({ label: product.title,
        href: `/items/${product.slug}?from=${encodeURIComponent(marketplaceCategoryHref(category))}`, remaining: null })) : [];
    const items = !isOpen ? [] : category === "Ending Soon"
      ? endingSoonItems.map((item) => ({ label: item.title, href: item.href, remaining: item.remaining }))
      : (desktopCategoryItems[category] ?? []).filter(item => category !== "All" || !isResolvedCatalogHref(endingSoonItemHrefs[item], resolved)).map((item) => ({
          label: item,
          href: category === "All" && endingSoonItemHrefs[item]
            ? `${endingSoonItemHrefs[item]}?from=${encodeURIComponent("/browse")}`
            : marketplaceCategoryHref(category, item),
          remaining: null,
        })).concat(picturedItems);

    return (
      <li
        key={category}
        className="flex h-full shrink-0 items-center"
        onMouseEnter={() => openMenu(category)}
      >
        <Link
          ref={element => { if (element) categoryLinks.current.set(category, element); else categoryLinks.current.delete(category); }}
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
                  className="zl-see-all col-span-full mt-2 justify-self-end"
                  aria-label={category === "All" ? "See all prizes" : `See all prizes in ${category}`}
                >
                  See all prizes
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </li>
    );
  }

  return <nav ref={navRef} aria-label="Marketplace categories" className={styles.categoryNav}
    onMouseLeave={() => setOpenCategory(null)}
    onBlur={event => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpenCategory(null);
    }}
  >
    {showPinnedShortcuts ? <ul className={styles.pinnedCategories}>
      <li className="flex h-full shrink-0 items-center">
        <Link href="/" aria-label="Home" onClick={() => setOpenCategory(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-cyan-100 transition-colors hover:bg-cyan-300/10 hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300 sm:h-9 sm:w-9">
          <HomeIcon className="h-[18px] w-[18px]" />
        </Link>
      </li>
      {renderCategory("Ending Soon")}
    </ul> : null}
    <div ref={railGroupRef} className={styles.categoryGroup}>
      {edges.overflow && <button type="button" className={styles.categoryChevron} aria-label="Scroll marketplace categories left"
        aria-controls={railId} aria-disabled={!edges.left} onClick={() => scrollCategories(-1)}>
        <AccountIcon name="chevron" className="h-4 w-4 rotate-180" />
      </button>}
      <div id={railId} ref={railRef} className={styles.categoryRail} data-category-rail
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
      >
        <ul className="flex h-full w-max min-w-full items-center gap-1 xl:gap-2">
          {desktopCategories.slice(1).map(renderCategory)}
        </ul>
      </div>
      {edges.overflow && <button type="button" className={styles.categoryChevron} aria-label="Scroll marketplace categories right"
        aria-controls={railId} aria-disabled={!edges.right} onClick={() => scrollCategories(1)}>
        <AccountIcon name="chevron" className="h-4 w-4" />
      </button>}
    </div>
  </nav>;
}
