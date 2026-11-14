"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FilterForm, type BrowseFilterProps } from "./BrowseFilters";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";
import { discoveryCategoryHref } from "@/lib/catalog/discovery-navigation";
import { browsePrizeValueLabel } from "@/lib/catalog/browse-filters";
import { searchTextMatches } from "@/lib/catalog/search-text";
import { marketplaceCategories, marketplaceCategoryHref } from "@/lib/catalog/navigation";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import { VoiceSearchControl } from "@/components/home/VoiceSearchButton";
import { useVoiceSearch } from "@/components/search/useVoiceSearch";
import styles from "./browse-discovery.module.css";
import { useBrowseResultsSearch } from "./BrowseResultsSearch";
import popupStyles from "@/components/layout/responsive-popup.module.css";

const BrowseControlsContext = createContext<ReactNode>(null);
type BrowsePanel = "categories" | "filters";
type ControlsPosition = "top" | "bottom";

export function BrowseDiscoveryFooterControls() {
  const controls = useContext(BrowseControlsContext);
  return <div className={`${styles.controls} ${styles.footerControls}`} role="group" aria-label="Browse options at the bottom">{controls}</div>;
}

export function BrowseDiscoveryBar(props: BrowseFilterProps & { browseHref: string; searchField?: ReactNode; children?: ReactNode }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const categoryList = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [openPanel, setOpenPanel] = useState<{ panel: BrowsePanel; position: ControlsPosition } | null>(null);
  const panel = openPanel?.panel;
  const [mode, setMode] = useState<"categories" | "retailers">("categories");
  const [query, setQuery] = useState("");
  const [localSearch, setLocalSearch] = useState(props.searchTerm);
  const session = useBrowseResultsSearch();
  const search = session?.draft ?? localSearch;
  const setSearch = session?.setDraft ?? setLocalSearch;
  const voice = useVoiceSearch(setSearch);
  const id = useId();
  const categoryLabel = props.subcategory || marketplaceCategories.find(category => category.id === props.selectedCategory)?.label;
  const scope = props.filters.retailer
    ? [props.filters.retailer, categoryLabel].filter(Boolean).join(" in ")
    : categoryLabel || props.selectedRetailerGroup?.category;
  const searchLabel = scope ? `Search ${scope}` : "Search all prizes";
  const withoutRetailer = new URL(props.browseHref, "https://zeroloss.local");
  withoutRetailer.searchParams.delete("retailer");
  if (props.selectedCategory) withoutRetailer.searchParams.delete("partnerCategory");
  const withoutBudget = new URL(props.browseHref, "https://zeroloss.local");
  withoutBudget.searchParams.delete("minValue");
  withoutBudget.searchParams.delete("maxValue");
  const budgetLabel = browsePrizeValueLabel(props.filters);
  const activeCount = Number(props.filters.type !== "all") + Number(props.filters.availableOnly)
    + Number(props.filters.minValue !== null || props.filters.maxValue !== null)
    + Number(props.filters.sort !== "featured" && !(props.selectedCategory === "ending-soon" && props.filters.sort === "fewest-left"));
  const prizeCategories = marketplaceCategories.filter(category => !query.trim() || searchTextMatches(category.label, query));
  const prizeCategoryLabels = new Set(prizeCategories.map(category => category.label.toLowerCase()));
  const groups = query.trim().length > 1
    ? searchRetailerDirectory(props.retailerGroups, query.trim(), props.retailerGroups.length)
    : props.retailerGroups.filter(group => !query.trim() || group.category.toLowerCase().startsWith(query.trim().toLowerCase()));
  const distinctGroups = groups.filter(group => !prizeCategoryLabels.has(group.category.toLowerCase()));
  const retailerGroups = query.trim() ? props.retailerGroups : props.selectedRetailerGroup ? [props.selectedRetailerGroup] : props.retailerGroups;
  const retailers = Array.from(new Map(retailerGroups.flatMap(group => group.options.map(option => [option.value, { ...option, groupId: group.id }] as const))).values())
    .filter(option => !query.trim() || searchTextMatches(option.label, query))
    .sort((left, right) => left.label.localeCompare(right.label));

  useLayoutEffect(() => {
    if (!panel) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    // Keep the chosen row in view when reopening the scrolling picker.
    const frame = requestAnimationFrame(() => categoryList.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" }));
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      element?.close();
      opener.current?.focus({ preventScroll: true });
    };
  }, [panel]);

  function open(next: BrowsePanel, position: ControlsPosition, button: HTMLButtonElement) {
    opener.current = button;
    setQuery(""); setMode("categories"); setOpenPanel({ panel: next, position });
  }
  function close() {
    setOpenPanel(null);
  }
  function choose(href: string) {
    const url = new URL(href, "https://zeroloss.local");
    if (props.searchTerm) url.searchParams.set("q", props.searchTerm);
    close();
    router.push(`${url.pathname}${url.search}#search-results`, { scroll: false });
  }
  function choosePrizeCategory(value: string) {
    const url = new URL(marketplaceCategoryHref(value), "https://zeroloss.local");
    if (props.filters.type !== "all") url.searchParams.set("type", props.filters.type);
    if (props.filters.availableOnly) url.searchParams.set("available", "1");
    if (props.filters.minValue !== null) url.searchParams.set("minValue", String(props.filters.minValue));
    if (props.filters.maxValue !== null) url.searchParams.set("maxValue", String(props.filters.maxValue));
    const endingSoon = url.searchParams.get("sort") === "ending-soon";
    const currentSort = new URL(props.browseHref, url).searchParams.get("sort");
    const implicitEndingSort = props.selectedCategory === "ending-soon" && props.filters.sort === "fewest-left" && currentSort !== "fewest-left";
    if (!endingSoon && props.filters.sort !== "featured" && !implicitEndingSort) {
      url.searchParams.set("sort", props.filters.sort);
    }
    if (endingSoon && props.selectedCategory === "ending-soon" && props.filters.sort !== "fewest-left") {
      url.searchParams.set("category", "ending-soon");
      url.searchParams.set("sort", props.filters.sort);
    }
    choose(`${url.pathname}${url.search}`);
  }
  function applySearch(value: string) {
    const url = new URL(props.browseHref, "https://zeroloss.local");
    const term = value.trim();
    if (term) url.searchParams.set("q", term);
    else url.searchParams.delete("q");
    url.searchParams.delete("batch");
    router.push(`${url.pathname}${url.search}#search-results`, { scroll: false });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (voice.listening) return;
    voice.cancel();
    applySearch(search);
  }
  function clearSearch() {
    voice.cancel();
    setSearch("");
    searchInput.current?.focus();
    if (props.searchTerm) applySearch("");
  }

  const controls = (position: ControlsPosition) => <>
    <button type="button" className={styles.control} aria-haspopup="dialog" aria-expanded={panel === "categories" && openPanel?.position === position} onClick={event => open("categories", position, event.currentTarget)}>
      <span aria-hidden="true">☷</span><span>{props.selectedRetailerGroup?.category ?? "Categories"}</span>
    </button>
    <button type="button" className={styles.control} aria-haspopup="dialog" aria-expanded={panel === "filters" && openPanel?.position === position} onClick={event => open("filters", position, event.currentTarget)}>
      Filter &amp; sort{activeCount ? <b>{activeCount}</b> : <span aria-hidden="true">↕</span>}
    </button>
  </>;

  return <BrowseControlsContext.Provider value={controls("bottom")}>
  <div className={styles.discovery}>
    <span id="retailer-categories-heading" className={styles.anchor} />
    {props.searchField ?? <form role="search" aria-label="Search marketplace" onSubmit={submitSearch} className={styles.search}>
      <label htmlFor={`${id}-search`} className={styles.srOnly}>{searchLabel}</label>
      <input ref={searchInput} id={`${id}-search`} type="search" value={search} onChange={event => { voice.cancel(); setSearch(event.target.value); }} placeholder={searchLabel} enterKeyHint="search" autoComplete="off" />
      {search ? <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={clearSearch}>×</button> : null}
      {search.trim() && !voice.listening ? <button type="submit" className={styles.go} aria-label="Go to search results">Go</button> : null}
      <VoiceSearchControl {...voice} />
    </form>}
    <div className={styles.controls} role="group" aria-label="Browse options at the top">{controls("top")}</div>
    {(props.filters.retailer || props.selectedRetailerGroup || props.searchTerm || props.subcategory || activeCount > 0) ? <div className={styles.current}>
      {budgetLabel ? <span className={styles.budgetChip}>Prize value: <strong>{budgetLabel}</strong><Link href={`${withoutBudget.pathname}${withoutBudget.search}#search-results`} aria-label={`Remove prize value filter: ${budgetLabel}`}>×</Link></span> : null}
      <span>{props.filters.retailer ? `Showing ${props.filters.retailer}` : props.searchTerm ? `Results for “${props.searchTerm}”${scope ? ` in ${scope}` : ""}` : props.selectedRetailerGroup?.category ?? (props.subcategory || "Filtered results")}</span>
      {props.filters.retailer ? <Link href={`${withoutRetailer.pathname}${withoutRetailer.search}#search-results`}>View all in this category</Link> : null}
      {activeCount > 0 || props.filters.retailer || props.subcategory ? <Link href={`${props.clearHref}#search-results`}>Clear filters</Link> : null}
    </div> : null}
    {panel ? <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} aria-labelledby={`${id}-title`} onCancel={close} onKeyDown={containDialogTab} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.sheet}>
        <header className={styles.sheetHeader}><div><h2 id={`${id}-title`}>{panel === "categories" ? "Find your category" : "Filter & sort"}</h2><p>{panel === "categories" ? "Scroll or search, then tap to see the products." : "Choose what you’d like to see."}</p></div><button type="button" aria-label="Close browse options" onClick={close}>×</button></header>
        {panel === "categories" ? <>
          <div className={styles.pickerModes} role="group" aria-label="Browse by"><button type="button" aria-pressed={mode === "categories"} onClick={() => { setMode("categories"); setQuery(""); }}>Categories</button><button type="button" aria-pressed={mode === "retailers"} onClick={() => { setMode("retailers"); setQuery(""); }}>Retailers</button></div>
          <label className={styles.pickerSearch}><span className={styles.srOnly}>Find a category or retailer</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Automotive, groceries, a brand…" /></label>
          <div ref={categoryList} className={styles.wheel} role="region" aria-label={mode === "categories" ? "Scrollable categories" : "Scrollable retailers"} tabIndex={0}>
            <button type="button" className={styles.choice} aria-current={!props.selectedCategory && !props.selectedRetailerGroup && !props.filters.retailer ? "true" : undefined} onClick={() => choosePrizeCategory("")}>All categories<span aria-hidden="true">→</span></button>
            {mode === "categories" ? <>
              {prizeCategories.map(category => <button type="button" key={category.id} className={styles.choice} aria-current={props.selectedCategory === category.id && !props.selectedRetailerGroup ? "true" : undefined} onClick={() => choosePrizeCategory(category.id)}><span>{category.label}<small>Browse prizes</small></span><span aria-hidden="true">→</span></button>)}
              {distinctGroups.map(group => <button type="button" key={group.id} className={styles.choice} aria-current={props.selectedRetailerGroup?.id === group.id ? "true" : undefined} onClick={() => choose(discoveryCategoryHref(group.id, props.filters, props.selectedCategory))}><span>{group.category}<small>{group.options.filter(option => option.hasOffer).length} retailers with offers</small></span><span aria-hidden="true">→</span></button>)}
            </>
              : retailers.map(option => <button type="button" key={option.value} className={styles.choice} aria-current={props.filters.retailer === option.value ? "true" : undefined} onClick={() => choose(discoveryCategoryHref(option.groupId, props.filters, props.selectedCategory, option.value))}><span>{option.label}<small>{option.hasOffer ? "View current offers" : "No current offers"}</small></span><span aria-hidden="true">→</span></button>)}
            {(mode === "categories" ? prizeCategories.length + distinctGroups.length : retailers.length) === 0 ? <p className={styles.noMatches}>No match. Try another category or brand.</p> : null}
          </div>
        </> : <div className={styles.filterBody}><FilterForm {...props} id={`${id}-filters`} onNavigate={close} /></div>}
      </div>
    </dialog> : null}
  </div>
  {props.children}
  </BrowseControlsContext.Provider>;
}
