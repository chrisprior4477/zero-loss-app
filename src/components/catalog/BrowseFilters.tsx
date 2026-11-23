"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { MAX_PRIZE_VALUE, type BrowseFilterState } from "@/lib/catalog/browse-filters";
import type { RetailerFilterGroup } from "@/lib/catalog/browse-filters";
import { catalogSearchLimitMessage, catalogSearchTooLong, invalidCatalogSearch, invalidCatalogSearchMessage, maxCatalogSearchLength } from "@/lib/catalog/search-text";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";
import { discoveryCategoryHref } from "@/lib/catalog/discovery-navigation";
import { marketplaceCategories, type MarketplaceCategoryId } from "@/lib/catalog/navigation";
import { VoiceSearchControl } from "@/components/home/VoiceSearchButton";
import { useVoiceSearch } from "@/components/search/useVoiceSearch";
import { useBrowseResultsSearch } from "./BrowseResultsSearch";
import { PrizeDollarField } from "./PrizeDollarField";
import type { EndingSoonTicketRange } from "@/lib/catalog/ending-soon-ticket-ranges";

export type BrowseFilterProps = {
  filters: BrowseFilterState;
  retailerGroups: RetailerFilterGroup[];
  selectedRetailerGroup: RetailerFilterGroup | null;
  selectedCategory: MarketplaceCategoryId | null;
  ticketsLeft?: EndingSoonTicketRange | null;
  searchTerm: string;
  subcategory: string;
  clearHref: string;
  initialSearch?: string;
  collapseOnDesktop?: boolean;
  onNavigate?: (destination: string) => void;
};

export function FilterForm({ filters, retailerGroups, selectedRetailerGroup, selectedCategory, ticketsLeft, searchTerm, subcategory, clearHref, initialSearch, id, onNavigate, onSearchDraft, active = true }: BrowseFilterProps & { id: string; onSearchDraft?: (draft: string) => void; active?: boolean }) {
  const router = useRouter();
  const department = subcategory || marketplaceCategories.find(category => category.id === selectedCategory)?.label || selectedRetailerGroup?.category;
  const scope = [filters.retailer, department].filter(Boolean).join(" in ");
  const selectingByKeyboard = useRef(false);
  const applyingPreset = useRef(false);
  const session = useBrowseResultsSearch();
  const [localDraft, updateLocalDraft] = useState(initialSearch ?? session?.draft ?? searchTerm);
  function setLocalDraft(value: string) { updateLocalDraft(value); onSearchDraft?.(value); }
  const searchDraft = localDraft;
  const searchTooLong = catalogSearchTooLong(searchDraft.trim());
  const invalidSearch = invalidCatalogSearch(searchDraft);
  const invalidSearchDraft = searchTooLong || invalidSearch;
  const voice = useVoiceSearch(setLocalDraft);
  const stopVoice = useEffectEvent(() => voice.cancel());
  useEffect(() => { if (!active) stopVoice(); }, [active]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const directoryMatches = showSearchSuggestions ? searchRetailerDirectory(retailerGroups, searchDraft) : [];
  const presetValue = filters.minValue === null && [25, 50, 75, 100].includes(filters.maxValue ?? -1)
    ? String(filters.maxValue) : filters.minValue !== null || filters.maxValue !== null ? "custom" : "all";
  const [mode, setMode] = useState(presetValue);
  const [productType, setProductType] = useState(filters.type);
  const [availableOnly, setAvailableOnly] = useState(filters.availableOnly);
  const [sort, setSort] = useState(filters.sort);
  const [bounds, setBounds] = useState({ minValue: String(filters.minValue ?? ""), maxValue: String(filters.maxValue ?? "") });
  const fields = ["minValue", "maxValue"] as const;
  const invalidAmount = fields.find(field => bounds[field] !== "" && bounds[field] !== String(filters[field] ?? "") && (!/^\d+$/.test(bounds[field]) || Number(bounds[field]) > MAX_PRIZE_VALUE));
  const reversed = bounds.minValue !== "" && bounds.maxValue !== "" && Number(bounds.minValue) > Number(bounds.maxValue);
  const issue = invalidAmount ? "Enter a whole dollar amount from $0 to $1,000,000."
    : reversed ? "Maximum must be at least the minimum." : "";
  const issueField = invalidAmount ?? "maxValue";
  const draftedMinimum = mode === "custom" && bounds.minValue !== "" ? Number(bounds.minValue) : null;
  const draftedMaximum = mode === "custom" ? bounds.maxValue === "" ? null : Number(bounds.maxValue)
    : mode === "all" ? null : Number(mode);
  function focusIssue(form: HTMLFormElement) {
    const trigger = form.querySelector<HTMLButtonElement>(`button[data-bound="${issueField}"]`);
    const input = form.elements.namedItem(issueField) as HTMLInputElement;
    (trigger?.getClientRects().length ? trigger : input).focus();
  }
  const clearUrl = new URL(clearHref, "https://zeroloss.local");
  const retainedSearch = searchDraft.trim();
  const appliedSearch = searchTerm.trim();
  const clearedFilterSearch = !invalidSearchDraft ? retainedSearch
    : catalogSearchTooLong(appliedSearch) || invalidCatalogSearch(appliedSearch) ? "" : appliedSearch;
  if (clearedFilterSearch) clearUrl.searchParams.set("q", clearedFilterSearch);
  else clearUrl.searchParams.delete("q");
  const clearFiltersHref = `${clearUrl.pathname}${clearUrl.search}`;
  const collection = clearUrl.searchParams.get("collection");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (invalidSearchDraft || voice.busy) { form.querySelector<HTMLInputElement>('input[name="q"]')?.focus(); return; }
    const data = new FormData(form);
    const params = new URLSearchParams();
    if (collection === "rare-finds") params.set("collection", collection);
    const valueMode = data.get("valueMode")?.toString() ?? "all";
    if (valueMode === "custom") {
      if (issue) {
        focusIssue(form);
        return;
      }
      for (const field of fields) {
        const input = form.elements.namedItem(field) as HTMLInputElement;
        if (input.validity.badInput || (bounds[field] !== String(filters[field] ?? "") && !input.validity.valid)) {
          input.reportValidity();
          return;
        }
        if (bounds[field] !== "") params.set(field, String(Number(bounds[field])));
      }
    } else if (["25", "50", "75", "100"].includes(valueMode)) {
      params.set("maxValue", valueMode);
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const filtersOnly = applyingPreset.current || submitter?.hasAttribute("data-apply-filters");
    for (const key of ["category", "q", "subcategory", "partnerCategory", "type", "retailer", "available", "sort", "ticketsLeft"]) {
      const value = data.get(key)?.toString().trim() ?? "";
      const defaultSort = key === "sort" && value === "featured" && (selectedCategory !== "ending-soon" || (!filters.featuredExplicit && filters.sort === "featured"));
      if (value && !(key === "type" && value === "all") && !defaultSort) params.set(key, value);
    }
    if (voice.busy && !filtersOnly) return;
    voice.cancel();
    session?.voice.cancel();
    session?.setDraft(params.get("q") ?? "");
    const mobileDrawer = form.closest("details");
    if (mobileDrawer) mobileDrawer.open = false;
    const destination = `/browse${params.size ? `?${params}` : ""}`;
    if (onNavigate) { onNavigate(`${destination}#search-results`); return; }
    const { pathname, search, hash } = window.location;
    if (destination === pathname + search) {
      if (hash !== "#search-results") {
        window.history.pushState(window.history.state, "", `${destination}#search-results`);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
      return;
    }
    router.push(`${destination}#search-results`, { scroll: false });
  };

  return (
    <form action="/browse" method="get" noValidate onSubmit={submit}
      onKeyDownCapture={event => {
        if (event.target instanceof HTMLInputElement && event.target.type === "radio" && (event.key.startsWith("Arrow") || event.key === " ")) selectingByKeyboard.current = true;
      }}
      onPointerDownCapture={() => { selectingByKeyboard.current = false; }}
      onChange={event => {
        const target = event.target;
        if ((target instanceof HTMLInputElement || target instanceof HTMLSelectElement)
          && !(target instanceof HTMLInputElement && target.type === "radio" && selectingByKeyboard.current)
          && !["q", "minValue", "maxValue"].includes(target.name)
          && (target.name === "valueMode" ? target.value !== "custom" : mode !== "custom")) {
          applyingPreset.current = true;
          try { event.currentTarget.requestSubmit(); }
          finally { applyingPreset.current = false; }
        }
      }} className="space-y-5 rounded-2xl border border-cyan-300/25 bg-[#0d2b50] p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,.14)]">
      {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
      {selectedCategory === "ending-soon" && ticketsLeft ? <input type="hidden" name="ticketsLeft" value={ticketsLeft} /> : null}
      {subcategory ? <input type="hidden" name="subcategory" value={subcategory} /> : null}
      {selectedRetailerGroup ? <input type="hidden" name="partnerCategory" value={selectedRetailerGroup.id} /> : null}
      {filters.retailer ? <input type="hidden" name="retailer" value={filters.retailer} /> : null}
      <div onFocusCapture={() => setShowSearchSuggestions(true)}>
        <label htmlFor={`${id}-search`} className="mb-2 block text-xs font-black uppercase tracking-[.1em] text-cyan-200">{scope ? `Search ${scope}` : "Search all prizes"}</label>
        <div className="flex min-h-11 w-full items-center rounded-full bg-white px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)] focus-within:outline focus-within:outline-2 focus-within:outline-cyan-300">
          <button type="submit" aria-label="Search catalog" title="Search catalog" className="relative mr-2 h-5 w-5 shrink-0 text-[#087feb]">
            <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-current" />
            <span className="absolute left-[12px] top-[12px] h-0.5 w-2 origin-left rotate-45 rounded-full bg-current" />
          </button>
          <input id={`${id}-search`} type="search" name="q" value={searchDraft} maxLength={maxCatalogSearchLength} aria-invalid={invalidSearchDraft || undefined} aria-describedby={invalidSearchDraft ? `${id}-search-limit` : undefined} onChange={event => { voice.reset(); setLocalDraft(event.target.value); }} enterKeyHint="search" placeholder="Product, brand, or category" className="min-w-0 flex-1 bg-transparent text-sm text-[#00132e] outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:appearance-none" />
          {searchDraft ? <button type="button" aria-label="Clear search" className="min-h-8 min-w-7 shrink-0 font-bold text-[#315878]" onClick={() => { voice.reset(); setLocalDraft(""); document.getElementById(`${id}-search`)?.focus(); }}>×</button> : null}
          {searchDraft.trim() && !voice.busy && !invalidSearchDraft ? (
            <button type="submit" aria-label="Go to search results" className="ml-1 min-h-8 shrink-0 rounded-full bg-[#0067cb] px-3 text-sm font-black text-white transition hover:bg-[#005fc4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087feb]">Go</button>
          ) : null}
          <VoiceSearchControl listening={voice.listening} finishing={voice.finishing} error={voice.error} toggle={() => { session?.voice.cancel(); voice.toggle(); }} />
        </div>
        {invalidSearchDraft ? <p id={`${id}-search-limit`} role="status" className="mt-2 text-sm font-bold text-amber-100">{invalidSearch ? invalidCatalogSearchMessage : catalogSearchLimitMessage}</p> : null}
        {directoryMatches.length ? (
          <div role="region" aria-label="Matching retailer categories" className="mt-2 space-y-1 rounded-xl border border-cyan-300/45 bg-[#061e3d] p-2">
            <p className="px-2 py-1 text-[11px] font-black uppercase tracking-[.1em] text-cyan-200">Retailer categories</p>
            {directoryMatches.map(group => (
              <Link key={group.id} href={discoveryCategoryHref(group.id, mode === "custom" && issue ? filters : { ...filters, type: productType, availableOnly, sort, minValue: draftedMinimum, maxValue: draftedMaximum }, selectedCategory, "", ticketsLeft,
                retainedSearch, collection)} onClick={event => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                const form = event.currentTarget.closest("form");
                if (form && mode === "custom" && issue) { event.preventDefault(); focusIssue(form); return; }
                const drawer = event.currentTarget.closest("details");
                if (drawer) drawer.open = false;
                if (onNavigate) { event.preventDefault(); onNavigate(`${event.currentTarget.pathname}${event.currentTarget.search}#search-results`); }
              }} className="flex min-h-10 items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm font-bold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300">
                <span>{group.category}</span><span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-black uppercase tracking-[.1em] text-cyan-200">Show</legend>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          {([ ["all", "All products"], ["pictured", "Pictured products"], ["gift-cards", "Gift cards"] ] as const).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="type" value={value} defaultChecked={filters.type === value} onChange={() => setProductType(value)} />
              <span className="inline-flex min-h-10 w-full items-center rounded-xl border border-white/25 px-3 py-2 text-sm font-bold text-white/85 transition hover:border-cyan-300 peer-checked:border-cyan-300 peer-checked:bg-cyan-300 peer-checked:text-[#00132e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-300">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-bold">
        <input type="checkbox" name="available" value="1" defaultChecked={filters.availableOnly} onChange={event => setAvailableOnly(event.target.checked)} className="h-5 w-5 accent-[#31e800]" />
        Available only
      </label>
      <fieldset>
        <legend className="mb-2 text-xs font-black uppercase tracking-[.1em] text-cyan-200">Prize value</legend>
        <div className="grid grid-cols-2 gap-2">
          {([ ["all", "Any value"], ["25", "$25 & below"], ["50", "$50 & below"], ["75", "$75 & below"], ["100", "$100 & below"], ["custom", "Custom range"] ] as const).map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input className="peer sr-only" type="radio" name="valueMode" value={value} checked={mode === value} onChange={() => {
                setMode(value);
                if (value !== "custom") setBounds({ minValue: "", maxValue: value === "all" ? "" : value });
              }} />
              <span className="flex min-h-11 h-full items-center justify-center rounded-xl border border-white/25 px-2 py-2 text-center text-xs font-bold leading-4 text-white/85 transition hover:border-cyan-300 peer-checked:border-cyan-300 peer-checked:bg-cyan-300 peer-checked:text-[#00132e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cyan-300">{label}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {fields.map(name => <PrizeDollarField key={name} name={name} value={bounds[name]}
            issueId={mode === "custom" && issue && issueField === name ? `${id}-range-error` : undefined}
            onActivate={() => setMode("custom")} onChange={value => setBounds(current => ({ ...current, [name]: value }))} />)}
        </div>
        <p id={`${id}-range-error`} aria-live="polite" className="mt-1 text-sm font-bold text-amber-200 empty:hidden">{mode === "custom" ? issue : ""}</p>
      </fieldset>
      {filters.retailer ? <p className="rounded-xl border border-cyan-300/35 bg-[#061e3d] px-3 py-2 text-xs text-white/75">Retailer: <strong className="text-white">{filters.retailer}</strong></p> : null}
      <fieldset>
        <legend className="mb-2 text-xs font-black uppercase tracking-[.1em] text-cyan-200">Sort by</legend>
        <div className="grid grid-cols-2 gap-2">
          {([["featured", "Featured"], ["fewest-left", "Fewest tickets left"], ["price-low", "Lowest entry price"], ["value-high", "Highest prize value"]] as const).map(([value, label]) => <label key={value} className="cursor-pointer">
            <input className="peer sr-only" type="radio" name="sort" value={value} defaultChecked={filters.sort === value} onChange={() => setSort(value)} />
            <span className="flex min-h-11 h-full items-center justify-center rounded-xl border border-white/25 px-3 py-2 text-center text-xs font-bold peer-checked:bg-cyan-300 peer-checked:text-[#00132e] peer-focus-visible:outline-2 peer-focus-visible:outline-cyan-300">{label}</span>
          </label>)}
        </div>
      </fieldset>
      <button type="submit" data-apply-filters className="min-h-11 w-full rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-[#00132e] hover:bg-cyan-200">Apply filters</button>
      <Link href={clearFiltersHref} onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        setMode("all");
        setBounds({ minValue: "", maxValue: "" });
        setLocalDraft(clearedFilterSearch);
        session?.setDraft(clearedFilterSearch);
        if (onNavigate) { event.preventDefault(); onNavigate(`${clearFiltersHref}#search-results`); }
      }} className="block text-center text-sm font-bold text-cyan-200 underline-offset-4 hover:underline">Clear filters</Link>
    </form>
  );
}

export function BrowseFilters(props: BrowseFilterProps) {
  const sortActive = props.filters.sort !== "featured" || props.filters.featuredExplicit === true;
  const activeCount = Number(props.filters.type !== "all") + Number(Boolean(props.selectedRetailerGroup))
    + Number(Boolean(props.filters.retailer)) + Number(props.filters.availableOnly) + Number(sortActive)
    + Number(props.filters.minValue !== null || props.filters.maxValue !== null);
  const key = `${props.selectedCategory}-${props.selectedRetailerGroup?.id}-${props.searchTerm}-${props.filters.type}-${props.filters.retailer}-${props.filters.availableOnly}-${props.filters.sort}-${props.filters.minValue}-${props.filters.maxValue}`;
  if (props.collapseOnDesktop) {
    return <details key={key} className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-cyan-300/70 bg-[#0b3b69] px-4 font-bold text-white marker:hidden focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden">
        <span>Filter &amp; sort{activeCount ? ` (${activeCount})` : ""}</span><span aria-hidden="true" className="text-2xl leading-none group-open:rotate-45">+</span>
      </summary>
      <div className="mt-2 max-w-xl"><FilterForm key={`collapsed-${key}`} {...props} id="collapsed-browse" /></div>
    </details>;
  }
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
