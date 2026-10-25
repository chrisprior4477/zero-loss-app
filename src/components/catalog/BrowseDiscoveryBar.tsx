"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { FilterForm, type BrowseFilterProps } from "./BrowseFilters";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";
import { discoveryCategoryHref } from "@/lib/catalog/discovery-navigation";
import { searchTextMatches } from "@/lib/catalog/search-text";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import { VoiceSearchButton } from "@/components/home/VoiceSearchButton";
import styles from "./browse-discovery.module.css";
import popupStyles from "@/components/layout/responsive-popup.module.css";

export function BrowseDiscoveryBar(props: BrowseFilterProps & { browseHref: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const categoryList = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [panel, setPanel] = useState<"categories" | "filters" | null>(null);
  const [mode, setMode] = useState<"categories" | "retailers">("categories");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(props.searchTerm);
  const id = useId();
  const withoutRetailer = new URL(props.browseHref, "https://zeroloss.local");
  withoutRetailer.searchParams.delete("retailer");
  const activeCount = Number(props.filters.type !== "all") + Number(props.filters.availableOnly)
    + Number(props.filters.minValue !== null || props.filters.maxValue !== null)
    + Number(props.filters.sort !== "featured" && !(props.selectedCategory === "ending-soon" && props.filters.sort === "fewest-left"));
  const groups = query.trim().length > 1
    ? searchRetailerDirectory(props.retailerGroups, query.trim(), props.retailerGroups.length)
    : props.retailerGroups.filter(group => !query.trim() || group.category.toLowerCase().startsWith(query.trim().toLowerCase()));
  const retailerGroups = query.trim() ? props.retailerGroups : props.selectedRetailerGroup ? [props.selectedRetailerGroup] : props.retailerGroups;
  const retailers = Array.from(new Map(retailerGroups.flatMap(group => group.options.map(option => [option.value, { ...option, groupId: group.id }] as const))).values())
    .filter(option => !query.trim() || searchTextMatches(option.label, query))
    .sort((left, right) => left.label.localeCompare(right.label));

  useEffect(() => {
    if (!panel) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Keep the chosen row in view when reopening the scrolling picker.
    const frame = requestAnimationFrame(() => categoryList.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" }));
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      element?.close();
      opener.current?.focus({ preventScroll: true });
    };
  }, [panel]);

  function open(next: "categories" | "filters", button: HTMLButtonElement) {
    opener.current = button;
    setQuery(""); setMode("categories"); setPanel(next);
  }
  function choose(href: string) { setPanel(null); router.push(href, { scroll: false }); }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = new URL(props.browseHref, "https://zeroloss.local");
    // A fresh marketplace search must not be trapped in the previous department.
    for (const key of ["category", "partnerCategory", "retailer", "subcategory"]) url.searchParams.delete(key);
    if (search.trim()) url.searchParams.set("q", search.trim()); else url.searchParams.delete("q");
    router.push(`${url.pathname}${url.search}#search-results`, { scroll: false });
  }
  function clearSearch() {
    setSearch("");
    searchInput.current?.focus();
    if (props.searchTerm) {
      const url = new URL(props.browseHref, "https://zeroloss.local");
      url.searchParams.delete("q");
      router.push(`${url.pathname}${url.search}#search-results`, { scroll: false });
    }
  }

  return <div className={styles.discovery}>
    <span id="retailer-categories-heading" className={styles.anchor} />
    <form role="search" aria-label="Search marketplace" onSubmit={submitSearch} className={styles.search}>
      <label htmlFor={`${id}-search`} className={styles.srOnly}>Search products, brands, and categories</label>
      <input ref={searchInput} id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products or brands" enterKeyHint="search" autoComplete="off" />
      {search ? <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={clearSearch}>×</button> : null}
      {search.trim() ? <button type="submit" className={styles.go} aria-label="Go to search results">Go</button> : <VoiceSearchButton onTranscript={setSearch} />}
    </form>
    <div className={styles.controls}>
      <button type="button" className={styles.control} aria-haspopup="dialog" aria-expanded={panel === "categories"} onClick={event => open("categories", event.currentTarget)}>
        <span aria-hidden="true">☷</span><span>{props.selectedRetailerGroup?.category ?? "Categories"}</span>
      </button>
      <button type="button" className={styles.control} aria-haspopup="dialog" aria-expanded={panel === "filters"} onClick={event => open("filters", event.currentTarget)}>
        Filter &amp; sort{activeCount ? <b>{activeCount}</b> : <span aria-hidden="true">↕</span>}
      </button>
    </div>
    {(props.filters.retailer || props.selectedRetailerGroup || props.searchTerm || activeCount > 0) ? <div className={styles.current}>
      <span>{props.filters.retailer ? `Showing ${props.filters.retailer}` : props.selectedRetailerGroup?.category ?? (props.searchTerm ? `Results for “${props.searchTerm}”` : "Filtered results")}</span>
      {props.filters.retailer ? <Link href={`${withoutRetailer.pathname}${withoutRetailer.search}#search-results`}>View all in this category</Link> : null}
      <Link href={`${props.clearHref}#search-results`}>Clear filters</Link>
    </div> : null}
    {panel ? <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} aria-labelledby={`${id}-title`} onCancel={() => setPanel(null)} onKeyDown={containDialogTab} onClick={event => { if (event.target === event.currentTarget) setPanel(null); }}>
      <div className={styles.sheet}>
        <header className={styles.sheetHeader}><div><h2 id={`${id}-title`}>{panel === "categories" ? "Find your category" : "Filter & sort"}</h2><p>{panel === "categories" ? "Scroll or search, then tap to see the products." : "Choose what you’d like to see."}</p></div><button type="button" aria-label="Close browse options" onClick={() => setPanel(null)}>×</button></header>
        {panel === "categories" ? <>
          <div className={styles.pickerModes} role="group" aria-label="Browse by"><button type="button" aria-pressed={mode === "categories"} onClick={() => { setMode("categories"); setQuery(""); }}>Categories</button><button type="button" aria-pressed={mode === "retailers"} onClick={() => { setMode("retailers"); setQuery(""); }}>Retailers</button></div>
          <label className={styles.pickerSearch}><span className={styles.srOnly}>Find a category or retailer</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Automotive, groceries, a brand…" /></label>
          <div ref={categoryList} className={styles.wheel} role="region" aria-label={mode === "categories" ? "Scrollable categories" : "Scrollable retailers"} tabIndex={0}>
            <button type="button" className={styles.choice} aria-current={!props.selectedRetailerGroup && !props.filters.retailer ? "true" : undefined} onClick={() => choose(discoveryCategoryHref("", props.filters, props.selectedCategory))}>All categories<span aria-hidden="true">→</span></button>
            {mode === "categories" ? groups.map(group => <button type="button" key={group.id} className={styles.choice} aria-current={props.selectedRetailerGroup?.id === group.id ? "true" : undefined} onClick={() => choose(discoveryCategoryHref(group.id, props.filters, props.selectedCategory))}><span>{group.category}<small>{group.options.filter(option => option.hasOffer).length} retailers with offers</small></span><span aria-hidden="true">→</span></button>)
              : retailers.map(option => <button type="button" key={option.value} className={styles.choice} aria-current={props.filters.retailer === option.value ? "true" : undefined} onClick={() => choose(discoveryCategoryHref(option.groupId, props.filters, props.selectedCategory, option.value))}><span>{option.label}<small>{option.hasOffer ? "View current offers" : "No current offers"}</small></span><span aria-hidden="true">→</span></button>)}
            {(mode === "categories" ? groups : retailers).length === 0 ? <p className={styles.noMatches}>No match. Try another category or brand.</p> : null}
          </div>
        </> : <div className={styles.filterBody}><FilterForm {...props} id={`${id}-filters`} onNavigate={() => setPanel(null)} /></div>}
      </div>
    </dialog> : null}
  </div>;
}
