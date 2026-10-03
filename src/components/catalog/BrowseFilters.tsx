"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { BrowseFilterState } from "@/lib/catalog/browse-filters";
import type { RetailerFilterGroup } from "@/lib/catalog/browse-filters";
import type { MarketplaceCategoryId } from "@/lib/catalog/navigation";

type Props = {
  filters: BrowseFilterState;
  selectedRetailerGroup: RetailerFilterGroup | null;
  selectedCategory: MarketplaceCategoryId | null;
  searchTerm: string;
  subcategory: string;
  clearHref: string;
};

function FilterForm({ filters, selectedRetailerGroup, selectedCategory, searchTerm, subcategory, clearHref, id }: Props & { id: string }) {
  const router = useRouter();
  const presetValue = filters.minValue === null && [25, 50, 75, 100].includes(filters.maxValue ?? -1)
    ? String(filters.maxValue) : filters.minValue !== null || filters.maxValue !== null ? "custom" : "all";
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const params = new URLSearchParams();
    const valueMode = data.get("valueMode")?.toString() ?? "all";
    if (valueMode === "custom") {
      const min = data.get("minValue")?.toString() ?? "";
      const max = data.get("maxValue")?.toString() ?? "";
      const maxField = form.elements.namedItem("maxValue") as HTMLInputElement | null;
      if (min && max && Number(min) > Number(max)) {
        maxField?.setCustomValidity("Maximum must be at least the minimum.");
        maxField?.reportValidity();
        return;
      }
      if (min) params.set("minValue", min);
      if (max) params.set("maxValue", max);
    } else if (["25", "50", "75", "100"].includes(valueMode)) {
      params.set("maxValue", valueMode);
    }
    for (const key of ["category", "q", "subcategory", "partnerCategory", "type", "retailer", "available", "sort"]) {
      const value = data.get(key)?.toString().trim() ?? "";
      if (value && !(key === "type" && value === "all") && !(key === "sort" && value === "featured" && selectedCategory !== "ending-soon")) params.set(key, value);
    }
    const mobileDrawer = form.closest("details");
    if (mobileDrawer) mobileDrawer.open = false;
    router.push(`/browse${params.size ? `?${params}` : ""}`, { scroll: false });
  };

  return (
    <form action="/browse" method="get" onSubmit={submit} onChange={event => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.name === "valueMode" && target.value !== "custom") {
        event.currentTarget.querySelector<HTMLInputElement>('input[name="maxValue"]')?.setCustomValidity("");
      }
      if ((target instanceof HTMLInputElement || target instanceof HTMLSelectElement)
        && !["q", "minValue", "maxValue"].includes(target.name)
        && !(target.name === "valueMode" && target.value === "custom")) event.currentTarget.requestSubmit();
    }} className="space-y-5 rounded-2xl border border-cyan-300/25 bg-[#0d2b50] p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,.14)]">
      {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
      {subcategory ? <input type="hidden" name="subcategory" value={subcategory} /> : null}
      {selectedRetailerGroup ? <input type="hidden" name="partnerCategory" value={selectedRetailerGroup.id} /> : null}
      {filters.retailer ? <input type="hidden" name="retailer" value={filters.retailer} /> : null}
      <div>
        <label htmlFor={`${id}-search`} className="mb-2 block text-xs font-black uppercase tracking-[.1em] text-cyan-200">Search products</label>
        <input id={`${id}-search`} type="search" name="q" defaultValue={searchTerm} placeholder="Product or retailer" className="min-h-11 w-full rounded-xl border border-white/30 bg-[#061e3d] px-3 text-sm text-white placeholder:text-white/55 focus-visible:outline-2 focus-visible:outline-cyan-300" />
      </div>
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
      <fieldset>
        <legend className="mb-2 text-xs font-black uppercase tracking-[.1em] text-cyan-200">Prize value</legend>
        <div className="grid grid-cols-2 gap-2">
          {([ ["all", "Any value"], ["25", "$25 & below"], ["50", "$50 & below"], ["75", "$75 & below"], ["100", "$100 & below"], ["custom", "Custom range"] ] as const).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="valueMode" value={value} defaultChecked={presetValue === value} />
              <span className="flex min-h-11 h-full items-center justify-center rounded-xl border border-white/25 px-2 py-2 text-center text-xs font-bold leading-4 text-white/85 transition hover:border-cyan-300 peer-checked:border-cyan-300 peer-checked:bg-cyan-300 peer-checked:text-[#00132e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-300">{label}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-white/75">From ($)
            <input type="number" name="minValue" min="0" max="1000000" step="0.01" inputMode="decimal" defaultValue={presetValue === "custom" ? filters.minValue ?? "" : ""} onFocus={event => event.currentTarget.form?.querySelector<HTMLInputElement>('input[name="valueMode"][value="custom"]')?.click()} className="mt-1 min-h-10 w-full rounded-lg border border-white/30 bg-[#061e3d] px-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-cyan-300" />
          </label>
          <label className="text-xs font-bold text-white/75">To ($)
            <input type="number" name="maxValue" min="0" max="1000000" step="0.01" inputMode="decimal" defaultValue={presetValue === "custom" ? filters.maxValue ?? "" : ""} onInput={event => event.currentTarget.setCustomValidity("")} onFocus={event => event.currentTarget.form?.querySelector<HTMLInputElement>('input[name="valueMode"][value="custom"]')?.click()} className="mt-1 min-h-10 w-full rounded-lg border border-white/30 bg-[#061e3d] px-2 text-sm text-white focus-visible:outline-2 focus-visible:outline-cyan-300" />
          </label>
        </div>
      </fieldset>
      {filters.retailer ? <p className="rounded-xl border border-cyan-300/35 bg-[#061e3d] px-3 py-2 text-xs text-white/75">Retailer: <strong className="text-white">{filters.retailer}</strong></p> : null}
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
  const activeCount = Number(props.filters.type !== "all") + Number(Boolean(props.selectedRetailerGroup))
    + Number(Boolean(props.filters.retailer)) + Number(props.filters.availableOnly) + Number(sortActive)
    + Number(props.filters.minValue !== null || props.filters.maxValue !== null);
  const key = `${props.selectedCategory}-${props.selectedRetailerGroup?.id}-${props.searchTerm}-${props.filters.type}-${props.filters.retailer}-${props.filters.availableOnly}-${props.filters.sort}-${props.filters.minValue}-${props.filters.maxValue}`;
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
