"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BrowseFilterState, RetailerFilterGroup } from "@/lib/catalog/browse-filters";
import type { MarketplaceCategoryId } from "@/lib/catalog/navigation";

type Props = {
  groups: RetailerFilterGroup[];
  selectedGroupId: string;
  selectedCategory: MarketplaceCategoryId | null;
  filters: BrowseFilterState;
  searchTerm: string;
  subcategory: string;
};

function retailerHref(groupId: string, props: Props, retailer = "") {
  const params = new URLSearchParams();
  if (props.selectedCategory) params.set("category", props.selectedCategory);
  if (props.searchTerm) params.set("q", props.searchTerm);
  if (props.subcategory) params.set("subcategory", props.subcategory);
  if (props.filters.type !== "all") params.set("type", props.filters.type);
  if (props.filters.availableOnly) params.set("available", "1");
  if (props.filters.minValue !== null) params.set("minValue", String(props.filters.minValue));
  if (props.filters.maxValue !== null) params.set("maxValue", String(props.filters.maxValue));
  if (props.selectedCategory === "ending-soon") {
    if (props.filters.sort !== "fewest-left") params.set("sort", props.filters.sort);
  } else if (props.filters.sort !== "featured") params.set("sort", props.filters.sort);
  if (groupId) params.set("partnerCategory", groupId);
  if (retailer) params.set("retailer", retailer);
  return `/browse${params.size ? `?${params}` : ""}`;
}

export function RetailerCategoryNav(props: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);
  const [mobileSearch, setMobileSearch] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const openGroup = props.groups.find(group => group.id === openId);
  const search = mobileSearch.trim().toLocaleLowerCase();
  const visibleGroups = search
    ? props.groups.filter(group => group.category.toLocaleLowerCase().includes(search)
      || group.options.some(option => option.label.toLocaleLowerCase().includes(search)))
    : props.groups;

  const closeMenu = () => {
    setOpenId(null);
    setPinnedId(null);
  };

  useEffect(() => {
    if (!openId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenId(null);
      setPinnedId(null);
      buttonRefs.current[openId]?.focus();
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!sectionRef.current?.contains(event.target as Node)) {
        setOpenId(null);
        setPinnedId(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [openId]);

  const showGroup = (id: string, button: HTMLButtonElement) => {
    const sectionTop = sectionRef.current?.getBoundingClientRect().top ?? 0;
    setMenuTop(button.getBoundingClientRect().bottom - sectionTop);
    setOpenId(id);
  };

  const brands = openGroup
    ? [...openGroup.options].sort((left, right) =>
      Number(Boolean(search && right.label.toLocaleLowerCase().includes(search))) - Number(Boolean(search && left.label.toLocaleLowerCase().includes(search)))
      || Number(right.hasOffer) - Number(left.hasOffer)
      || left.label.localeCompare(right.label))
    : [];

  const panel = openGroup ? (
    <div id="retailer-category-panel" style={{ top: menuTop }} aria-label={`${openGroup.category} retailers`} className="absolute left-0 right-0 z-30 rounded-2xl border border-cyan-300/50 bg-[#061e3d] p-4 shadow-[0_22px_48px_rgba(0,0,0,0.42)] lg:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">{openGroup.category}</h3>
          <p className="text-xs text-white/60">GiftCard Partners directory · current offers are marked</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={retailerHref(openGroup.id, props)} onClick={closeMenu} className="inline-flex min-h-10 items-center rounded-xl bg-cyan-300 px-4 text-sm font-black text-[#00132e] hover:bg-cyan-200">See all {openGroup.category}</Link>
          <button type="button" onClick={closeMenu} aria-label="Close retailer list" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-xl text-white hover:border-cyan-300">×</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {brands.map(option => (
          <Link key={`${openGroup.id}-${option.label}`} href={retailerHref(openGroup.id, props, option.value)} onClick={closeMenu} className="flex min-h-10 items-center justify-between gap-2 rounded-lg border-b border-white/10 px-2 py-1.5 text-sm text-white/90 hover:border-cyan-300 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-cyan-300">
            <span>{option.label}</span>
            <span className={`shrink-0 text-[10px] ${option.hasOffer ? "text-[#31e800]" : "text-white/45"}`}>{option.hasOffer ? "Live" : "No offer"}</span>
          </Link>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <section ref={sectionRef} aria-labelledby="retailer-categories-heading" className="relative mt-5" onPointerLeave={() => {
      if (!pinnedId) setOpenId(null);
    }}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 id="retailer-categories-heading" className="text-xl font-black">Shop by retailer category</h2>
        <p className="hidden text-sm text-white/60 lg:block">Hover to preview retailers · click to keep a list open</p>
      </div>
      <label className="mb-3 block lg:hidden">
        <span className="sr-only">Search retailer categories or names</span>
        <input type="search" value={mobileSearch} onChange={event => {
          setMobileSearch(event.target.value);
          closeMenu();
        }} placeholder="Search categories or retailers" className="min-h-11 w-full rounded-xl border border-cyan-300/45 bg-[#0d2b50] px-4 text-sm text-white placeholder:text-white/55 focus-visible:outline-2 focus-visible:outline-cyan-300" />
      </label>
      <nav aria-label="Retailer categories" className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {!search ? <Link href={retailerHref("", props)} aria-current={!props.selectedGroupId ? "page" : undefined} onPointerEnter={() => { if (!pinnedId) setOpenId(null); }} onClick={closeMenu} className={`flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-center text-sm font-bold transition-colors lg:min-h-14 lg:px-3 ${!openId && !props.selectedGroupId ? "border-cyan-300 bg-cyan-300 text-[#00132e]" : "border-white/25 bg-[#0d2b50] text-white hover:border-cyan-300"}`}>All retailers</Link> : null}
        {visibleGroups.map(group => (
          <div key={group.id} className="min-w-0">
            <button
              ref={node => { buttonRefs.current[group.id] = node; }}
              type="button"
              aria-pressed={props.selectedGroupId === group.id}
              aria-expanded={openId === group.id}
              aria-controls={openId === group.id ? "retailer-category-panel" : undefined}
              onPointerEnter={event => {
                if (event.pointerType === "mouse" && (!window.matchMedia || window.matchMedia("(min-width: 1024px)").matches) && !pinnedId) showGroup(group.id, event.currentTarget);
              }}
              onClick={event => {
                if (pinnedId === group.id) closeMenu();
                else {
                  setPinnedId(group.id);
                  showGroup(group.id, event.currentTarget);
                }
              }}
              className={`flex min-h-11 w-full items-center justify-center rounded-xl border px-4 py-2 text-center text-sm font-bold leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-300 lg:min-h-14 lg:px-3 ${openId === group.id || (!openId && props.selectedGroupId === group.id) ? "border-cyan-300 bg-cyan-300 text-[#00132e]" : "border-white/25 bg-[#0d2b50] text-white hover:border-cyan-300 hover:bg-[#164573]"}`}
            >{group.category}</button>
            {openId === group.id ? panel : null}
          </div>
        ))}
      </nav>
      {search && visibleGroups.length === 0 ? <p className="mt-3 text-sm text-white/70">No matching retailer category. Try another name.</p> : null}
      {props.filters.retailer ? <p className="mt-3 text-sm text-white/75">Showing {props.filters.retailer}. <Link href={retailerHref(props.selectedGroupId, props)} className="font-bold text-cyan-300 underline-offset-4 hover:underline">View all in this category</Link></p> : null}
    </section>
  );
}
