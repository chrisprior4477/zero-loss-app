"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { BrowseFilterState } from "@/lib/catalog/browse-filters";
import type { RetailerFilterGroup } from "@/lib/catalog/browse-filters";
import type { MarketplaceCategoryId } from "@/lib/catalog/navigation";

type Props = {
  filters: BrowseFilterState;
  retailers: string[];
  retailerGroups: RetailerFilterGroup[];
  selectedCategory: MarketplaceCategoryId | null;
  searchTerm: string;
  subcategory: string;
  clearHref: string;
};

function FilterForm({ filters, retailers, retailerGroups, selectedCategory, searchTerm, subcategory, clearHref, id }: Props & { id: string }) {
  const router = useRouter();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const mobileDrawer = form.closest("details");
    if (mobileDrawer) mobileDrawer.open = false;
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const key of ["category", "q", "subcategory", "type", "retailer", "available", "sort"]) {
      const value = data.get(key)?.toString() ?? "";
      if (value && !(key === "type" && value === "all") && !(key === "sort" && value === "featured" && selectedCategory !== "ending-soon")) params.set(key, value);
    }
    router.push(`/browse${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <form action="/browse" method="get" onSubmit={submit} onChange={event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
    }} className="space-y-5 rounded-2xl border border-cyan-300/25 bg-[#0d2b50] p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,.14)]">
      {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
      {searchTerm ? <input type="hidden" name="q" value={searchTerm} /> : null}
      {subcategory ? <input type="hidden" name="subcategory" value={subcategory} /> : null}
      <fieldset>
        <legend className="mb-2 text-xs font-black uppercase tracking-[.1em] text-cyan-200">Show</legend>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {([ ["all", "All products"], ["pictured", "Pictured products"], ["gift-cards", "Gift cards"] ] as const).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="type" value={value} defaultChecked={filters.type === value} />
              <span className="inline-flex min-h-10 w-full items-center rounded-xl border border-white/25 px-3 py-2 text-sm font-bold text-white/85 transition hover:border-cyan-300 peer-checked:border-cyan-300 peer-checked:bg-cyan-300 peer-checked:text-[#00132e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-300">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-bold">
        <input type="checkbox" name="available" value="1" defaultChecked={filters.availableOnly} className="h-5 w-5 accent-[#31e800]" />
        Available only
      </label>
      <div>
        <label htmlFor={`${id}-retailer`} className="mb-2 block text-xs font-black uppercase tracking-[.1em] text-cyan-200">Retailer</label>
        <select id={`${id}-retailer`} name="retailer" defaultValue={filters.retailer} className="min-h-11 w-full rounded-xl border border-white/30 bg-white px-3 text-sm font-bold text-[#00132e] focus-visible:outline-2 focus-visible:outline-cyan-300">
          <option value="">All retailers</option>
          <optgroup label="Current offers in this category">
            {retailers.map(retailer => <option key={retailer} value={retailer}>{retailer}</option>)}
          </optgroup>
          {retailerGroups.map(group => <optgroup key={group.category} label={group.category}>
            {group.options.map(option => <option key={`${group.category}-${option.label}`} value={option.value}>{option.label}{option.hasOffer ? " · current offer" : " · no current offer"}</option>)}
          </optgroup>)}
        </select>
        <p className="mt-2 text-xs leading-5 text-white/60">GiftCard Partners directory; brands are subject to availability. Only current offers have product listings.</p>
      </div>
      <div>
        <label htmlFor={`${id}-sort`} className="mb-2 block text-xs font-black uppercase tracking-[.1em] text-cyan-200">Sort by</label>
        <select id={`${id}-sort`} name="sort" defaultValue={filters.sort} className="min-h-11 w-full rounded-xl border border-white/30 bg-white px-3 text-sm font-bold text-[#00132e] focus-visible:outline-2 focus-visible:outline-cyan-300">
          <option value="featured">Featured</option>
          <option value="fewest-left">Fewest tickets left</option>
          <option value="price-low">Lowest entry price</option>
          <option value="value-high">Highest prize value</option>
        </select>
      </div>
      <button type="submit" className="min-h-11 w-full rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-[#00132e] hover:bg-cyan-200">Apply filters</button>
      <Link href={clearHref} className="block text-center text-sm font-bold text-cyan-200 underline-offset-4 hover:underline">Clear filters</Link>
    </form>
  );
}

export function BrowseFilters(props: Props) {
  const sortActive = props.filters.sort !== "featured" && !(props.selectedCategory === "ending-soon" && props.filters.sort === "fewest-left");
  const activeCount = Number(props.filters.type !== "all") + Number(Boolean(props.filters.retailer)) + Number(props.filters.availableOnly) + Number(sortActive);
  const key = `${props.selectedCategory}-${props.searchTerm}-${props.filters.type}-${props.filters.retailer}-${props.filters.availableOnly}-${props.filters.sort}`;
  return (
    <>
      <details className="group lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-cyan-300/70 bg-[#0b3b69] px-4 font-bold text-white marker:content-none focus-visible:outline-2 focus-visible:outline-cyan-300">
          <span>Filter &amp; sort{activeCount ? ` (${activeCount})` : ""}</span><span aria-hidden="true" className="text-2xl leading-none group-open:rotate-45">+</span>
        </summary>
        <div className="mt-2"><FilterForm key={`mobile-${key}`} {...props} id="mobile-browse" /></div>
      </details>
      <aside aria-label="Filter products" className="hidden lg:block">
        <h2 className="mb-3 text-lg font-black">Filter &amp; sort</h2>
        <FilterForm key={`desktop-${key}`} {...props} id="desktop-browse" />
      </aside>
    </>
  );
}
