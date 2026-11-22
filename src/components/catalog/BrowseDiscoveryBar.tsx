"use client";

import Link from "next/link";
import Image from "next/image";
import { DemoOutcomeLetter } from "./DemoOutcomeLetter";
import { BrowseResultsLink } from "./BrowsePrizeLink";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FilterForm, type BrowseFilterProps } from "./BrowseFilters";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";
import { discoveryCategoryHref } from "@/lib/catalog/discovery-navigation";
import { browsePrizeValueLabel, parseBrowseFilterState } from "@/lib/catalog/browse-filters";
import { catalogSearchLimitMessage, catalogSearchTooLong, invalidCatalogSearch, invalidCatalogSearchMessage, maxCatalogSearchLength, searchTextMatches } from "@/lib/catalog/search-text";
import { marketplaceCategories, marketplaceCategoryHref, type MarketplaceCategoryId } from "@/lib/catalog/navigation";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { useMenuViewport } from "@/components/layout/useMenuViewport";
import { useDialogBack } from "@/components/account/useDialogBack";
import { containDialogTab, restoreDialogTrigger } from "@/components/account/dialog-keyboard";
import { VoiceSearchControl } from "@/components/home/VoiceSearchButton";
import { useVoiceSearch } from "@/components/search/useVoiceSearch";
import { scrollToCurrentSearch } from "@/lib/navigation/search-examples";
import styles from "./browse-discovery.module.css";
import { useBrowseResultsSearch } from "./BrowseResultsSearch";
import { requestBrowseResultsFocus } from "./SearchResultsAutoScroll";
import popupStyles from "@/components/layout/responsive-popup.module.css";

const BrowseControlsContext = createContext<ReactNode>(null);
type BrowsePanel = "categories" | "filters";
type ControlsPosition = "top" | "bottom";
type PrizeCategoryChoice = { id: MarketplaceCategoryId | ""; label: string };
export type BrowsePreviewProduct = {
  slug: string;
  title: string;
  image: string;
  remaining: number;
};
type PreviewResume = { destination: string; category: string; position: ControlsPosition; expires: number };
const previewHistoryKey = "zeroLossCategoryPreviewReturn";
let pendingPreview: PreviewResume | null = null;

function rememberPreview(destination: string, category: string, position: ControlsPosition) {
  pendingPreview = { destination, category, position, expires: Date.now() + 10_000 };
}

function comparableBrowseHref(href: string) {
  const url = new URL(href, "https://zeroloss.local");
  url.searchParams.sort();
  return url.pathname + url.search;
}

export function BrowseDiscoveryFooterControls() {
  const controls = useContext(BrowseControlsContext);
  return <div className={`${styles.controls} ${styles.footerControls}`} role="group" aria-label="Browse options at the bottom">{controls}</div>;
}

export function BrowseDiscoveryBar(props: BrowseFilterProps & {
  browseHref: string; scopedOfferRetailers?: string[];
  previews?: Record<string, BrowsePreviewProduct[]>; searchField?: ReactNode; children?: ReactNode;
}) {
  const router = useRouter();
  const desktop = useMenuViewport() === "desktop";
  const dialog = useRef<HTMLDialogElement>(null);
  const categoryList = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const pickerInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const previewFocus = useRef<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const lastPanel = useRef<{ panel: BrowsePanel; position: ControlsPosition; trigger: HTMLButtonElement; href: string; queries: Record<"categories" | "retailers", string>; mode: "categories" | "retailers"; preview: string | null } | null>(null);
  const topCategories = useRef<HTMLButtonElement>(null);
  const bottomCategories = useRef<HTMLButtonElement>(null);
  const [openPanel, setOpenPanel] = useState<{ panel: BrowsePanel; position: ControlsPosition } | null>(null);
  const panel = openPanel?.panel;
  const panelOpen = Boolean(panel);
  const [mode, setMode] = useState<"categories" | "retailers">("categories");
  const [queries, setQueries] = useState({ categories: "", retailers: "" });
  const query = queries[mode];
  const filterDraft = useRef<string | undefined>(undefined);
  const [initialFilterDraft, setInitialFilterDraft] = useState<string>();
  function setQuery(value: string) { setQueries(current => ({ ...current, [mode]: value })); }
  function changeMode(next: typeof mode) {
    if (next === mode) return;
    pickerVoice.reset();
    setMode(next);
    setPreview(null);
  }
  const [preview, setPreview] = useState<string | null>(null);
  const [refineTarget, setRefineTarget] = useState<{ category: MarketplaceCategoryId | null; href: string } | null>(null);
  const refining = panel === "filters" ? refineTarget : null;
  const [localSearch, setLocalSearch] = useState(props.searchTerm);
  const session = useBrowseResultsSearch();
  const search = session?.draft ?? localSearch;
  const setSearch = session?.setDraft ?? setLocalSearch;
  const connectSearchInput = useCallback((node: HTMLInputElement | null) => {
    if (node && !searchInput.current && node.value !== node.defaultValue) {
      const typed = node.value;
      queueMicrotask(() => setSearch(typed));
    }
    searchInput.current = node;
  }, [setSearch]);
  const voice = useVoiceSearch(value => { session?.setEditor(null); setSearch(value); });
  const invalidSearch = invalidCatalogSearch(search);
  const showSearchLimit = (catalogSearchTooLong(search.trim()) || invalidSearch) && (!session?.editor || session.editor === "top");
  const pickerVoice = useVoiceSearch(value => { setQuery(value); setPreview(null); });
  const id = useId();
  const categoryLabel = props.subcategory || marketplaceCategories.find(category => category.id === props.selectedCategory)?.label;
  const retailerScope = props.filters.retailer || props.selectedRetailerGroup?.category;
  const scope = [...new Set([retailerScope, categoryLabel].filter(Boolean))].join(" in ");
  const searchLabel = scope ? `Search ${scope}` : "Search all prizes";
  const withoutRetailer = new URL(props.browseHref, "https://zeroloss.local");
  withoutRetailer.searchParams.delete("retailer");
  if (!props.selectedRetailerGroup) withoutRetailer.searchParams.delete("partnerCategory");
  withoutRetailer.searchParams.delete("batch");
  const withoutRetailerGroup = new URL(props.browseHref, "https://zeroloss.local");
  withoutRetailerGroup.searchParams.delete("partnerCategory");
  withoutRetailerGroup.searchParams.delete("batch");
  const withoutBudget = new URL(props.browseHref, "https://zeroloss.local");
  withoutBudget.searchParams.delete("batch");
  withoutBudget.searchParams.delete("minValue");
  withoutBudget.searchParams.delete("maxValue");
  const budgetLabel = browsePrizeValueLabel(props.filters);
  const activeCount = Number(props.filters.type !== "all") + Number(props.filters.availableOnly) + Number(Boolean(props.ticketsLeft))
    + Number(props.filters.minValue !== null || props.filters.maxValue !== null)
    + Number(props.filters.sort !== "featured" || props.filters.featuredExplicit === true);
  const prizeCategories = marketplaceCategories.filter(category => !query.trim() || searchTextMatches(category.label, query));
  const prizeCategoryLabels = new Set(prizeCategories.map(category => category.label.toLowerCase()));
  const groups = query.trim().length > 1
    ? searchRetailerDirectory(props.retailerGroups, query.trim(), props.retailerGroups.length)
    : props.retailerGroups.filter(group => !query.trim() || group.category.toLowerCase().startsWith(query.trim().toLowerCase()));
  const scopedOfferRetailers = props.scopedOfferRetailers ? new Set(props.scopedOfferRetailers) : null;
  function allCategoriesRetailerHref(retailer: string) {
    const url = new URL(props.browseHref, "https://zeroloss.local");
    for (const key of ["category", "subcategory", "partnerCategory", "batch", "groceryIdea", "ticketsLeft"]) url.searchParams.delete(key);
    if (url.searchParams.get("sort") === "ending-soon") url.searchParams.delete("sort");
    url.searchParams.set("retailer", retailer);
    return `${url.pathname}${url.search}#search-results`;
  }
  const distinctGroups = groups.filter(group => !prizeCategoryLabels.has(group.category.toLowerCase()));
  const retailerGroups = query.trim() ? props.retailerGroups : props.selectedRetailerGroup ? [props.selectedRetailerGroup] : props.retailerGroups;
  const retailers = Array.from(new Map(retailerGroups.flatMap(group => group.options.map(option => [option.value, { ...option, groupId: group.id }] as const))).values())
    .filter(option => !query.trim() || searchTextMatches(option.label, query))
    .sort((left, right) => left.label.localeCompare(right.label));

  useLayoutEffect(() => {
    if (!panelOpen) return;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    // Keep the chosen row in view when reopening the scrolling picker.
    const frame = requestAnimationFrame(() => {
      if (!window.matchMedia("(min-width: 1024px)").matches) categoryList.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      element?.close();
      restoreDialogTrigger(opener.current);
    };
  }, [panelOpen]);

  useLayoutEffect(() => {
    if (panel !== "categories" || preview === null) return;
    previewRef.current?.scrollIntoView?.({ block: "nearest" });
    const target = previewFocus.current;
    if (!target) return;
    previewFocus.current = null;
    const control = target === "refine"
      ? previewRef.current?.querySelector<HTMLButtonElement>("[data-refine-preview]")
      : Array.from(previewRef.current?.querySelectorAll<HTMLAnchorElement>("[data-preview-prize]") ?? [])
        .find(link => link.dataset.previewPrize === target);
    restoreDialogTrigger(control);
  }, [panel, preview]);

  useLayoutEffect(() => {
    if (!desktop) return;
    function restorePreview() {
      const destination = comparableBrowseHref(props.browseHref);
      const state = window.history.state;
      const explicit = /^#category-preview~(top|bottom)~([a-z0-9-]*)~([a-z0-9-]+)$/.exec(window.location.hash);
      const saved = explicit
        ? { destination, position: explicit[1], category: explicit[2], slug: explicit[3] }
        : state?.[previewHistoryKey];
      const fromPrize = saved?.destination === destination && (saved.position === "top" || saved.position === "bottom")
        && typeof saved.slug === "string" && typeof saved.category === "string" && Object.hasOwn(props.previews ?? {}, saved.category);
      const resume = fromPrize ? saved as Pick<PreviewResume, "category" | "position"> : pendingPreview;
      if (!resume || (!fromPrize && (!pendingPreview || pendingPreview.expires < Date.now() || pendingPreview.destination !== destination))) return;
      if (fromPrize) {
        previewFocus.current = saved.slug;
        const nextState = { ...state };
        delete nextState[previewHistoryKey];
        window.history.replaceState(nextState, "", explicit ? "#search-results" : undefined);
      } else pendingPreview = null;
      opener.current = (resume.position === "top" ? topCategories : bottomCategories).current;
      setPreview(resume.category);
      setOpenPanel({ panel: "categories", position: resume.position });
    }
    restorePreview();
    window.addEventListener("popstate", restorePreview);
    return () => window.removeEventListener("popstate", restorePreview);
  }, [desktop, props.browseHref, props.previews]);

  function resetPicker(next: BrowsePanel, position: ControlsPosition) {
    voice.cancel();
    session?.voice.cancel();
    setPreview(null);
    setRefineTarget(null);
    setQueries({ categories: "", retailers: "" });
    filterDraft.current = undefined;
    setInitialFilterDraft(undefined);
    setMode("categories"); setOpenPanel({ panel: next, position });
  }
  function open(next: BrowsePanel, position: ControlsPosition, button: HTMLButtonElement) {
    opener.current = button;
    resetPicker(next, position);
  }
  function stopFilterVoice() {
    pickerVoice.cancel();
    if (panel === "filters" && session?.editor === "filters") {
      session.voice.cancel();
      session.setEditor(null);
    }
  }
  function returnToPreview() {
    stopFilterVoice();
    previewFocus.current = "refine";
    setOpenPanel(current => current && { ...current, panel: "categories" });
  }
  function dismissPicker() {
    stopFilterVoice();
    setOpenPanel(null);
  }
  useLayoutEffect(() => {
    const trigger = opener.current;
    if (openPanel && trigger && !refining) lastPanel.current = { ...openPanel, trigger, href: props.browseHref, queries, mode, preview };
  }, [openPanel, props.browseHref, queries, mode, preview, refining]);
  const endPanelHistory = useDialogBack(panelOpen, dismissPicker, false, true, false, "browse-discovery", () => {
    const last = lastPanel.current;
    if (last?.trigger.isConnected && last.href === props.browseHref) {
      opener.current = last.trigger;
      setQueries(last.queries);
      setMode(last.mode);
      setPreview(last.preview);
      setInitialFilterDraft(filterDraft.current);
      setOpenPanel({ panel: last.panel, position: last.position });
    }
  });
  const endRefineHistory = useDialogBack(Boolean(refining), returnToPreview, false, false, true, "browse-category-refine", () => {
    if (panel === "categories" && refineTarget) setOpenPanel(current => current && { ...current, panel: "filters" });
  });
  function close() {
    if (refining) {
      endRefineHistory();
      returnToPreview();
    } else dismissPicker();
  }
  useLayoutEffect(() => {
    if (!refining) return;
    restoreDialogTrigger(dialog.current?.querySelector<HTMLInputElement>('input[name="q"]'));
  }, [refining]);
  function navigateFromPanel(destination: string) {
    if (panel === "filters" && refining && openPanel) {
      const target = comparableBrowseHref(destination);
      if (target === comparableBrowseHref(props.browseHref)) { close(); return; }
      rememberPreview(target, refining.category ?? "", openPanel.position);
    }
    dismissPicker();
    if (new URL(destination, window.location.origin).href !== window.location.href) {
      endRefineHistory(true);
      endPanelHistory(true);
      if (destination.startsWith("/browse")) requestBrowseResultsFocus(destination);
      router.replace(destination, { scroll: false });
    }
  }
  function choose(href: string, preserveSubcategory = false, replacementSearch = props.searchTerm) {
    const url = new URL(href, "https://zeroloss.local");
    if (replacementSearch) url.searchParams.set("q", replacementSearch);
    if (preserveSubcategory && props.subcategory) url.searchParams.set("subcategory", props.subcategory);
    const destination = `${url.pathname}${url.search}#search-results`;
    navigateFromPanel(destination);
  }
  function prizeCategoryHref(value: string, term = search) {
    const url = new URL(marketplaceCategoryHref(value), "https://zeroloss.local");
    if (props.filters.type !== "all") url.searchParams.set("type", props.filters.type);
    if (props.filters.availableOnly) url.searchParams.set("available", "1");
    if (props.filters.minValue !== null) url.searchParams.set("minValue", String(props.filters.minValue));
    if (props.filters.maxValue !== null) url.searchParams.set("maxValue", String(props.filters.maxValue));
    const endingSoon = url.searchParams.get("sort") === "ending-soon";
    if (endingSoon && props.ticketsLeft) url.searchParams.set("ticketsLeft", props.ticketsLeft);
    if (!endingSoon && props.filters.sort !== "featured") {
      url.searchParams.set("sort", props.filters.sort);
    }
    if (endingSoon && props.selectedCategory === "ending-soon" && (props.filters.sort !== "featured" || props.filters.featuredExplicit)) {
      url.searchParams.set("category", "ending-soon");
      url.searchParams.set("sort", props.filters.sort);
    }
    if (term.trim() && !invalidCatalogSearch(term) && !catalogSearchTooLong(term.trim())) url.searchParams.set("q", term.trim());
    return `${url.pathname}${url.search}#search-results`;
  }
  function choosePrizeCategory(value: string) {
    if (desktop && props.previews) {
      const term = search.trim();
      if (openPanel && term !== props.searchTerm && !invalidCatalogSearch(term) && !catalogSearchTooLong(term)) {
        const href = prizeCategoryHref(value, term);
        rememberPreview(comparableBrowseHref(href), value, openPanel.position);
        navigateFromPanel(href);
      } else setPreview(current => current === value ? null : value);
    } else navigateFromPanel(prizeCategoryHref(value));
  }
  function searchDestination(value: string, allCategories = false) {
    const url = new URL(props.browseHref, "https://zeroloss.local");
    const term = value.trim();
    if (term) url.searchParams.set("q", term);
    else url.searchParams.delete("q");
    url.searchParams.delete("batch");
    if (allCategories) {
      for (const key of ["category", "subcategory", "retailer", "partnerCategory", "groceryIdea", "ticketsLeft"]) {
        url.searchParams.delete(key);
      }
      if (url.searchParams.get("sort") === "ending-soon") url.searchParams.delete("sort");
    }
    return `${url.pathname}${url.search}#search-results`;
  }
  function applySearch(value: string, restoreSearch = false) {
    if (session) {
      session.search(value, undefined, restoreSearch);
      return;
    }
    const destination = searchDestination(value);
    if (restoreSearch || value.trim()) requestBrowseResultsFocus(destination, restoreSearch ? "top-search" : "heading");
    if (!scrollToCurrentSearch(destination)) router.push(destination, { scroll: false });
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (voice.busy) return;
    if (catalogSearchTooLong(search.trim()) || invalidSearch) { searchInput.current?.focus(); return; }
    voice.cancel();
    applySearch(search, Boolean(props.searchTerm && !search.trim()));
  }
  function clearSearch() {
    voice.reset();
    setSearch("");
    searchInput.current?.focus();
    if (props.searchTerm || session?.pending) applySearch("", true);
  }
  function submitPickerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim() || pickerVoice.busy) return;
    if (catalogSearchTooLong(query.trim()) || invalidCatalogSearch(query)) { pickerInput.current?.focus(); return; }
    navigateFromPanel(searchDestination(query, true));
  }

  function navigatePreview(href: string) {
    return (event: { preventDefault: () => void }) => {
      event.preventDefault();
      navigateFromPanel(href);
    };
  }

  const categoryChoices: PrizeCategoryChoice[] = [
    ...(!query.trim() ? [{ id: "" as const, label: "All categories" }] : []),
    ...prizeCategories,
  ];
  const wideCategories = desktop && Boolean(props.previews) && panel === "categories";
  function prizeButton(category: PrizeCategoryChoice) {
    const current = category.id ? props.selectedCategory === category.id && !props.selectedRetailerGroup
      : !props.selectedCategory && !props.selectedRetailerGroup && !props.filters.retailer;
    return <button type="button" key={category.id} className={styles.choice}
      aria-current={current ? "true" : undefined} aria-expanded={wideCategories ? preview === category.id : undefined}
      onClick={() => choosePrizeCategory(category.id)}>
      <span>{category.label}{!wideCategories && category.id ? <small>Browse prizes</small> : null}</span>
      <span aria-hidden="true">{wideCategories ? preview === category.id ? "⌄" : "›" : "→"}</span>
    </button>;
  }
  function previewSection(category: PrizeCategoryChoice) {
    const products = props.previews?.[category.id] ?? [];
    // The preview was matched on the server using the applied search.
    const href = prizeCategoryHref(category.id);
    return <section ref={previewRef} className={styles.preview} aria-label={`${category.label} product preview`}>
      <div className={styles.previewHeader}><h3>{category.label}{search.trim() !== props.searchTerm && props.searchTerm ? <> · “{props.searchTerm}”</> : null}</h3>{budgetLabel ? <span>{budgetLabel}</span> : null}</div>
      {products.length ? <div className={styles.previewProducts}>{products.map(product => {
        const back = `${props.browseHref.split("#")[0]}#category-preview~${openPanel?.position ?? "top"}~${category.id}~${product.slug}`;
        const destination = productHrefWithBrowseReturn(product.slug, back);
        return <Link key={product.slug} data-preview-prize={product.slug} className={styles.previewProduct} prefetch={false} href={destination}
          onNavigate={() => {
            window.history.replaceState({ ...window.history.state, [previewHistoryKey]: {
              destination: comparableBrowseHref(props.browseHref), category: category.id, position: openPanel?.position ?? "top", slug: product.slug,
            } }, "");
          }}>
          <div className={styles.previewImage}>
            <Image src={product.image} alt="" fill sizes="190px" />
            {product.remaining > 0 && <DemoOutcomeLetter product={product.slug} />}
          </div>
          <strong>{product.title}</strong>
          <small>{product.remaining ? `${product.remaining.toLocaleString()} left` : "No open entries"}</small>
        </Link>;
      })}</div> : <p className={styles.noMatches}>No matching prizes with these filters.</p>}
      <div className={styles.previewActions}>
        <Link href={href} prefetch={false} scroll={false} onNavigate={event => { event.preventDefault(); navigateFromPanel(href); }}>
          {category.id ? `See all ${category.label}` : "See all products"} <span aria-hidden="true">→</span>
        </Link>
        <button type="button" data-refine-preview onClick={() => {
          pickerVoice.cancel();
          setRefineTarget({ category: category.id || null, href });
          setInitialFilterDraft(undefined);
          setOpenPanel(current => current && { ...current, panel: "filters" });
        }}>Refine search</button>
      </div>
    </section>;
  }

  const retailerCategoryChoices = distinctGroups.map(group => <button type="button" key={group.id} className={styles.choice}
    aria-current={props.selectedRetailerGroup?.id === group.id ? "true" : undefined}
    onClick={() => choose(discoveryCategoryHref(group.id, props.filters, props.selectedCategory, "", props.ticketsLeft), false,
      query.trim() && !searchTextMatches(group.category, query) && group.options.some(option => searchTextMatches(option.label, query))
        ? query.trim() : props.searchTerm)}>
    <span>{group.category}<small>{group.options.filter(option => option.hasOffer).length} retailers with offers</small></span><span aria-hidden="true">→</span>
  </button>);

  const filterProps = refineTarget ? {
    ...props,
    selectedCategory: refineTarget.category, selectedRetailerGroup: null, subcategory: "",
    ticketsLeft: refineTarget.category === "ending-soon" ? props.ticketsLeft : null,
    filters: parseBrowseFilterState(Object.fromEntries(new URL(refineTarget.href, "https://zeroloss.local").searchParams), []),
    clearHref: refineTarget.category ? marketplaceCategoryHref(refineTarget.category) : "/browse",
  } : props;

  const controls = (position: ControlsPosition) => <>
    <button ref={position === "top" ? topCategories : bottomCategories} type="button" className={styles.control} aria-haspopup="dialog" aria-expanded={panel === "categories" && openPanel?.position === position} onClick={event => open("categories", position, event.currentTarget)}>
      <span aria-hidden="true">☷</span><span>{props.selectedRetailerGroup?.category ?? "Categories"}</span>
    </button>
    <button type="button" data-browse-filter={position} className={styles.control} aria-haspopup="dialog" aria-expanded={panel === "filters" && openPanel?.position === position} onClick={event => open("filters", position, event.currentTarget)}>
      Filter &amp; sort{activeCount ? <b>{activeCount}</b> : <span aria-hidden="true">↕</span>}
    </button>
  </>;

  return <BrowseControlsContext.Provider value={controls("bottom")}>
  <div className={styles.discovery}>
    <span id="retailer-categories-heading" className={styles.anchor} />
    {props.searchField ?? <div><form role="search" aria-label="Search marketplace" onSubmit={submitSearch} className={styles.search}
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        voice.reset();
        setSearch(props.searchTerm);
      }}>
      <label htmlFor={`${id}-search`} className={styles.srOnly}>{searchLabel}</label>
      <input ref={connectSearchInput} id={`${id}-search`} type="search" value={search} maxLength={maxCatalogSearchLength} aria-invalid={catalogSearchTooLong(search.trim()) || invalidSearch || undefined} aria-describedby={showSearchLimit ? `${id}-search-limit` : undefined} onChange={event => { voice.reset(); session?.setEditor(null); setSearch(event.target.value); }} placeholder={searchLabel} enterKeyHint="search" autoComplete="off" />
      {search ? <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={clearSearch}>×</button> : null}
      {search.trim() && !voice.busy && !invalidSearch && !catalogSearchTooLong(search.trim()) ? <button type="submit" className={styles.go} aria-label="Go to search results">Go</button> : null}
      <VoiceSearchControl {...voice} />
    </form>{showSearchLimit ? <p id={`${id}-search-limit`} role="status" className="mb-2 text-sm font-bold text-amber-100">{invalidSearch ? invalidCatalogSearchMessage : catalogSearchLimitMessage}</p> : null}</div>}
    <div className={styles.controls} role="group" aria-label="Browse options at the top">{controls("top")}</div>
    {(props.filters.retailer || props.selectedRetailerGroup || props.searchTerm || props.subcategory || activeCount > 0) ? <div className={styles.current}>
      {budgetLabel ? <span className={styles.budgetChip}>Prize value: <strong>{budgetLabel}</strong><Link scroll={false} href={`${withoutBudget.pathname}${withoutBudget.search}#search-results`} onNavigate={() => requestBrowseResultsFocus(`${withoutBudget.pathname}${withoutBudget.search}#search-results`)} aria-label={`Remove prize value filter: ${budgetLabel}`}>×</Link></span> : null}
      <span>{props.filters.retailer ? `Showing ${props.filters.retailer}` : props.searchTerm ? `Results for “${props.searchTerm}”${scope ? ` · ${scope}` : ""}` : props.selectedRetailerGroup?.category ?? (props.subcategory || "Filtered results")}</span>
      {props.filters.retailer ? <BrowseResultsLink target="heading" href={`${withoutRetailer.pathname}${withoutRetailer.search}#search-results`}>View all in this category</BrowseResultsLink> : null}
      {!props.filters.retailer && props.selectedRetailerGroup ? <BrowseResultsLink target="heading" href={`${withoutRetailerGroup.pathname}${withoutRetailerGroup.search}#search-results`}>Remove {props.selectedRetailerGroup.category}</BrowseResultsLink> : null}
      {activeCount > 0 || props.filters.retailer || props.subcategory ? <BrowseResultsLink target="heading" href={`${props.clearHref}#search-results`}>Clear filters</BrowseResultsLink> : null}
    </div> : null}
    {panel ? <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog} ${wideCategories && mode === "categories" ? styles.wideDialog : ""}`} aria-labelledby={`${id}-title`} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={containDialogTab} onKeyDownCapture={event => {
      if (event.key === "Escape" && event.target instanceof HTMLInputElement && event.target.type === "search") {
        event.preventDefault(); event.stopPropagation(); close();
      }
    }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.sheet}>
        <header className={styles.sheetHeader}><div><h2 id={`${id}-title`}>{panel === "categories" ? "Find your category" : "Filter & sort"}</h2><p>{panel === "categories" ? wideCategories ? "Choose a category to preview its prizes." : "Scroll or search, then tap to see the products." : "Choose what you’d like to see."}</p></div><button type="button" aria-label={refining && panel === "filters" ? "Back to category preview" : "Close browse options"} onClick={() => close()}>×</button></header>
        {panel === "categories" ? <>
          <div className={styles.pickerModes} role="group" aria-label="Browse by"><button type="button" aria-pressed={mode === "categories"} onClick={() => changeMode("categories")}>Categories</button><button type="button" aria-pressed={mode === "retailers"} onClick={() => changeMode("retailers")}>Retailers</button></div>
          <form role="search" aria-label="Find a category or retailer" className={`${styles.search} ${styles.pickerSearch}`} onSubmit={submitPickerSearch}>
            <label className={styles.srOnly} htmlFor={`${id}-picker`}>Find a category or retailer</label>
            <input id={`${id}-picker`} ref={pickerInput} type="search" value={query} maxLength={maxCatalogSearchLength} aria-invalid={(invalidCatalogSearch(query) || catalogSearchTooLong(query.trim())) || undefined} aria-describedby={(invalidCatalogSearch(query) || catalogSearchTooLong(query.trim())) ? `${id}-picker-limit` : undefined} enterKeyHint="search" autoComplete="off"
              onChange={event => { pickerVoice.reset(); setQuery(event.target.value); setPreview(null); }} placeholder="Search categories, retailers, or prizes" />
            {query ? <button type="button" className={styles.clearSearch} aria-label="Clear search" onClick={() => {
              pickerVoice.reset(); setQuery(""); setPreview(null); pickerInput.current?.focus();
            }}>×</button> : null}
            {query.trim() && !pickerVoice.busy && !invalidCatalogSearch(query) && !(invalidCatalogSearch(query) || catalogSearchTooLong(query.trim())) ? <button type="submit" className={styles.go} aria-label="Go to search results">Go</button> : null}
            <VoiceSearchControl {...pickerVoice} />
          </form>
          {(invalidCatalogSearch(query) || catalogSearchTooLong(query.trim())) ? <p id={`${id}-picker-limit`} role="status" className="mb-2 text-sm font-bold text-amber-100">{invalidCatalogSearch(query) ? invalidCatalogSearchMessage : catalogSearchLimitMessage}</p> : null}
          <div ref={categoryList} className={wideCategories && mode === "categories" ? styles.wideChoices : styles.wheel}
            role="region" aria-label={mode === "categories" ? wideCategories ? "Prize categories" : "Scrollable categories" : "Scrollable retailers"} tabIndex={0}>
            {mode === "categories" ? <>
              {wideCategories ? Array.from({ length: Math.ceil(categoryChoices.length / 4) }, (_, index) => {
                const row = categoryChoices.slice(index * 4, index * 4 + 4);
                const expanded = row.find(category => category.id === preview);
                return <div key={row[0].id}>
                  <div className={styles.categoryRow}>{row.map(prizeButton)}</div>
                  {expanded ? previewSection(expanded) : null}
                </div>;
              }) : categoryChoices.map(category => {
                if (preview !== category.id) return prizeButton(category);
                const href = prizeCategoryHref(category.id);
                return <div key={category.id}>
                  {prizeButton(category)}
                  <div className={styles.previewActions}>
                    <Link href={href} onNavigate={navigatePreview(href)}>
                      {category.id ? `See all ${category.label}` : "See all products"} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>;
              })}
              {wideCategories && retailerCategoryChoices.length ? <details className={styles.directory} open={query.trim() ? true : undefined}>
                <summary>Retailer categories</summary>
                <div className={styles.categoryRow}>{retailerCategoryChoices}</div>
              </details> : retailerCategoryChoices}
            </>
              : <>{!query.trim() ? <button type="button" className={styles.choice} onClick={() => navigateFromPanel(prizeCategoryHref(""))}>
                All categories<span aria-hidden="true">→</span>
              </button> : null}{retailers.map(option => {
                const hasScopedOffer = scopedOfferRetailers ? scopedOfferRetailers.has(option.value) : option.hasOffer;
                return <div key={option.value}>
                  <button type="button" className={styles.choice} aria-current={props.filters.retailer === option.value ? "true" : undefined} onClick={() => choose(discoveryCategoryHref(option.groupId, props.filters, props.selectedCategory, option.value, props.ticketsLeft), true)}><span>{option.label}<small>{hasScopedOffer ? "View current offers" : "No current offers here"}</small></span><span aria-hidden="true">→</span></button>
                  {scopedOfferRetailers && !hasScopedOffer && option.hasOffer && (props.selectedCategory || props.subcategory)
                    ? <Link className="block px-3 py-2 text-sm font-bold underline" href={allCategoriesRetailerHref(option.value)} onNavigate={event => { event.preventDefault(); navigateFromPanel(allCategoriesRetailerHref(option.value)); }}>View {option.label} across all categories</Link> : null}
                </div>;
              })}</>}
            {(mode === "categories" ? prizeCategories.length + distinctGroups.length : retailers.length) === 0
              ? <p className={styles.noMatches}>{invalidCatalogSearch(query) || catalogSearchTooLong(query.trim()) ? "" : query.trim() ? "No matching category or retailer. Choose Go to search for prizes." : "No categories or retailers available."}</p> : null}
          </div>
        </> : null}
        {panel === "filters" || refineTarget ? <div className={styles.filterBody} hidden={panel !== "filters"}><FilterForm key={refineTarget?.href ?? "filters"} {...filterProps} active={panel === "filters"} initialSearch={initialFilterDraft ?? search} onSearchDraft={value => { filterDraft.current = value; }} id={`${id}-filters`} onNavigate={navigateFromPanel} /></div> : null}
      </div>
    </dialog> : null}
  </div>
  {props.children}
  </BrowseControlsContext.Provider>;
}
