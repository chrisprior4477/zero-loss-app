"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VoiceSearchButton } from "@/components/home/VoiceSearchButton";
import type { BrowseFilterState, RetailerFilterGroup } from "@/lib/catalog/browse-filters";
import type { MarketplaceCategoryId } from "@/lib/catalog/navigation";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";

type Props = {
  groups: RetailerFilterGroup[];
  selectedGroupId: string;
  selectedCategory: MarketplaceCategoryId | null;
  filters: BrowseFilterState;
  searchTerm: string;
  subcategory: string;
  collapseByDefault?: boolean;
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
  const [categoriesExpanded, setCategoriesExpanded] = useState(!props.collapseByDefault);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState(0);
  const [mobileSearch, setMobileSearch] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const openGroup = props.groups.find(group => group.id === openId);
  const search = mobileSearch.trim();
  const lowerSearch = search.toLocaleLowerCase();
  const visibleGroups = search.length >= 2
    ? searchRetailerDirectory(props.groups, search, props.groups.length)
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
      Number(Boolean(search && right.label.toLocaleLowerCase().includes(lowerSearch))) - Number(Boolean(search && left.label.toLocaleLowerCase().includes(lowerSearch)))
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
      <details className="group" open={categoriesExpanded} onToggle={event => setCategoriesExpanded(event.currentTarget.open)}>
      <summary className={props.collapseByDefault
        ? "flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-cyan-300/70 bg-[#0b3b69] px-4 font-bold text-white marker:hidden focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden"
        : "mb-3 flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden"}>
        <h2 id="retailer-categories-heading" className={props.collapseByDefault ? "text-base font-black" : "text-xl font-black"}>Shop by retailer category</h2>
        <span className="flex items-center gap-2 text-sm text-cyan-200">
          {props.selectedGroupId ? <span className="hidden sm:inline">{props.groups.find(group => group.id === props.selectedGroupId)?.category}</span> : null}
          <span aria-hidden="true" className="text-2xl leading-none group-open:rotate-45">+</span>
        </span>
      </summary>
      <div className={props.collapseByDefault ? "pt-3" : ""}>
      <p className="mb-3 hidden text-sm text-white/60 lg:block">Hover to preview retailers · click to keep a list open</p>
      <form action="/browse" method="get" className="mb-3 flex min-h-11 w-full items-center rounded-full bg-white px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] focus-within:outline focus-within:outline-2 focus-within:outline-cyan-300 lg:hidden">
        <button type="submit" aria-label="Search catalog" title="Search catalog" className="relative mr-2 h-5 w-5 shrink-0 text-[#087feb]">
          <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-current" />
          <span className="absolute left-[12px] top-[12px] h-0.5 w-2 origin-left rotate-45 rounded-full bg-current" />
        </button>
        <label htmlFor="retailer-category-search" className="sr-only">Search retailer categories or names</label>
        <input id="retailer-category-search" name="q" type="search" value={mobileSearch} onChange={event => {
          setMobileSearch(event.target.value);
          closeMenu();
        }} enterKeyHint="search" placeholder="Search categories or retailers" className="min-w-0 flex-1 bg-transparent text-sm text-[#00132e] outline-none placeholder:text-slate-500" />
        {search ? <button type="submit" aria-label="Go to search results" className="ml-1 min-h-8 shrink-0 rounded-full bg-[#087feb] px-3 text-sm font-black text-white transition hover:bg-[#005fc4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087feb]">Go</button>
          : <VoiceSearchButton onTranscript={text => { setMobileSearch(text); closeMenu(); }} />}
      </form>
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
      </div>
      </details>
    </section>
  );
}
