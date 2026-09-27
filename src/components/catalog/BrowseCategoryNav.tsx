"use client";

import Link from "next/link";
import {
  marketplaceCategories,
  marketplaceCategoryHref,
  type MarketplaceCategoryId,
} from "@/lib/catalog/navigation";
import { useHorizontalCategoryScroll } from "@/components/layout/useHorizontalCategoryScroll";

function categoryHref(category: MarketplaceCategoryId | null, query: string) {
  const url = new URL(category ? marketplaceCategoryHref(category) : "/browse", "https://zeroloss.local");
  if (query) url.searchParams.set("q", query);
  return `${url.pathname}${url.search}`;
}

export function BrowseCategoryNav({ selectedCategory, searchTerm }: { selectedCategory: MarketplaceCategoryId | null; searchTerm: string }) {
  const { navRef, canScrollLeft, canScrollRight, updateEdges, scroll } = useHorizontalCategoryScroll();
  const arrowClass = "hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/60 bg-[#063765] text-xl font-bold text-cyan-200 transition hover:bg-cyan-300 hover:text-[#00132e] disabled:pointer-events-none disabled:opacity-30 sm:grid";

  return (
    <div className="mt-7 flex min-w-0 items-center gap-2">
      <button type="button" aria-label="Scroll search categories left" disabled={!canScrollLeft} onClick={() => scroll(-1)} className={arrowClass}>‹</button>
      <nav ref={navRef} onScroll={updateEdges} aria-label="Browse categories" className="zl-noscroll flex min-w-0 flex-1 gap-2 overflow-x-auto overscroll-x-contain pb-2">
        <Link href={categoryHref(null, searchTerm)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${!selectedCategory ? "border-cyan-300 bg-cyan-300 text-[#00132e]" : "border-white/20 text-white hover:border-cyan-300"}`}>All</Link>
        {marketplaceCategories.map((category) => (
          <Link key={category.id} href={categoryHref(category.id, searchTerm)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${selectedCategory === category.id ? "border-cyan-300 bg-cyan-300 text-[#00132e]" : "border-white/20 text-white hover:border-cyan-300"}`}>{category.label}</Link>
        ))}
      </nav>
      <button type="button" aria-label="Scroll search categories right" disabled={!canScrollRight} onClick={() => scroll(1)} className={arrowClass}>›</button>
    </div>
  );
}
