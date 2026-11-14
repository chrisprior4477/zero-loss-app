import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { demoProducts } from "@/lib/catalog/demo-products";
import {
  marketplaceCategories,
  marketplaceCategoryId,
  isGiftCardListing,
  isRetailerCollection,
  productMatchesMarketplaceCategory,
} from "@/lib/catalog/navigation";
import { searchCatalogMatches, filterCatalogSubcategory } from "@/lib/catalog/search";
import { catalogSearchTooLong, normalizeSearch } from "@/lib/catalog/search-text";
import { searchDenominations } from "@/lib/catalog/search-denomination";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { availabilityStatus } from "@/lib/catalog/availability";
import { BrowseDiscoveryBar, BrowseDiscoveryFooterControls } from "@/components/catalog/BrowseDiscoveryBar";
import { BrowseResultsSearch, BrowseResultsSearchSession } from "@/components/catalog/BrowseResultsSearch";
import { BrowsePrizeLink } from "@/components/catalog/BrowsePrizeLink";
import browseStyles from "@/components/catalog/browse-discovery.module.css";
import { browseRetailers, filterBrowseProducts, parseBrowseFilterState, retailerFilterGroups, browsePrizeValueLabel } from "@/lib/catalog/browse-filters";
import { searchResultsHref } from "@/lib/navigation/search-examples";
import { getGiftCardPartnerGroups } from "@/lib/catalog/gift-card-partners-reader";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";
import { resolvedProductDestination } from "@/lib/catalog/resolved-destination";
import { SearchResultsAutoScroll } from "@/components/catalog/SearchResultsAutoScroll";
import { GroceryInspiration } from "@/components/catalog/GroceryInspiration";
import { groceryInspirationOfferSlugs } from "@/lib/catalog/grocery-themes";
import { groceryStoreFirst } from "@/lib/catalog/grocery-order";

export const metadata: Metadata = {
  title: "Browse",
};

type BrowsePageProps = {
  searchParams: Promise<{ category?: string; sort?: string; batch?: string; subcategory?: string; q?: string | string[]; type?: string; retailer?: string; partnerCategory?: string; available?: string; minValue?: string; maxValue?: string; groceryIdea?: string | string[] }>;
};
const batchSize = 24;

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const query = await searchParams;
  const [{ availability, account, hidden, unavailable }, partnerGroups] = await Promise.all([getShoppingCatalog(), getGiftCardPartnerGroups()]);
  const resolved = new Set(resolvedCatalogSlugs(account?.activity));
  const availableProducts = demoProducts.filter(product => !hidden.has(product.slug)).map(product => {
    const current = availability?.[product.slug];
    return current ? { ...product, capacity: current.capacity, sold: current.sold, entryPrice: current.entryPriceCents / 100 } : product;
  });
  const searchTerm = (Array.isArray(query.q) ? query.q[0] : query.q)?.trim() ?? "";
  const searchTooLong = catalogSearchTooLong(searchTerm);
  const selectedCategory = marketplaceCategoryId(query.category ?? (query.sort === "ending-soon" ? "ending-soon" : ""));
  const endingSoon = selectedCategory === "ending-soon";
  const selectedLabel = marketplaceCategories.find((category) => category.id === selectedCategory)?.label;
  const subcategory = query.subcategory?.trim().slice(0, 128) ?? "";
  const showCatalogDenominations = !endingSoon && !unavailable
    && Boolean(searchTerm || selectedCategory || query.retailer || query.partnerCategory || query.type === "gift-cards");
  const unavailableDenominations = showCatalogDenominations ? demoProducts.filter(product =>
    hidden.has(product.slug) && product.value === 100 && isGiftCardListing(product))
    .map(product => ({ ...product, sold: product.capacity })) : [];
  const searchableProducts = [...availableProducts, ...unavailableDenominations];
  const categoryProducts = filterCatalogSubcategory(searchableProducts.filter(
    product => !selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory)), subcategory);
  const retailers = browseRetailers(categoryProducts);
  const retailerGroups = retailerFilterGroups(partnerGroups, categoryProducts.filter(product => !hidden.has(product.slug)), categoryProducts);
  const selectedRetailerGroup = retailerGroups.find(group => group.id === query.partnerCategory) ?? null;
  const denomination = searchDenominations(searchTooLong ? "" : searchTerm, demoProducts);
  const directoryMatches = searchTerm && !searchTooLong && !endingSoon && !denomination.values.size && !denomination.budget ? searchRetailerDirectory(retailerGroups, searchTerm) : [];
  const filters = parseBrowseFilterState(query, [...retailers, ...retailerGroups.flatMap(group => group.options.map(option => option.value))]);
  const budgetLabel = browsePrizeValueLabel(filters);
  const appliedFilters = [
    selectedLabel,
    subcategory,
    selectedRetailerGroup?.category,
    filters.retailer,
    filters.type === "gift-cards" ? "Gift Cards" : filters.type === "pictured" ? "Products with photos" : null,
    filters.availableOnly ? "Available only" : null,
    budgetLabel,
  ].filter((label): label is string => Boolean(label));
  const discoveryGroups = retailerFilterGroups(partnerGroups, availableProducts, demoProducts);
  const searchMatches = searchTerm && !searchTooLong ? searchCatalogMatches(categoryProducts, searchTerm, denomination, { includeLowerGiftCards: !endingSoon }) : [];
  const savedMatches = searchTerm && !searchTooLong ? searchCatalogMatches(filterCatalogSubcategory(demoProducts.filter(product => resolved.has(product.slug) && (!selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory))), subcategory), searchTerm, denomination) : [];
  const relatedRetailers = new Set(searchMatches.filter(match => match.kind === "retailer").map(match => match.product.slug));
  const matchedProducts = searchTerm ? searchMatches.map(match => match.product) : categoryProducts;
  const allowedRetailers = selectedRetailerGroup
    ? new Set(selectedRetailerGroup.options.map(option => option.value))
    : undefined;
  const filteredProducts = filterBrowseProducts(matchedProducts, filters, searchTerm, selectedCategory === "ending-soon", allowedRetailers);
  const savedWithinFilters = new Set(filterBrowseProducts(savedMatches.map(({ product }) =>
    ({ ...product, sold: product.capacity })), filters, searchTerm, endingSoon, allowedRetailers).map(product => product.slug));
  const savedOutsideFilters = savedMatches.some(({ product }) => !savedWithinFilters.has(product.slug));
  const products = selectedCategory === "groceries" && !searchTerm && filters.sort === "featured"
    ? groceryStoreFirst(filteredProducts, retailerGroups.find(group => group.id === "groceries")?.options.map(option => option.value) ?? [])
    : filteredProducts;
  const hasOpenResults = products.some(product => !hidden.has(product.slug));
  const includesLowerGiftCards = denomination.values.size > 0
    && products.some(product => isGiftCardListing(product) && !denomination.values.has(product.value));
  const requestedValues = Array.from(denomination.values, value => `$${value.toLocaleString("en-US")}`).join(" or ");
  const requestedBatch = typeof query.batch === "string" && /^[1-9]\d*$/.test(query.batch) ? Number(query.batch) : 1;
  const lastBatch = Math.max(1, Math.ceil(products.length / batchSize));
  const tailMatch = typeof query.batch === "string" ? /^last-([1-9]\d{0,5})$/.exec(query.batch) : null;
  const tailBatch = endingSoon && lastBatch > 1 && (query.batch === "last" || tailMatch)
    ? Math.min(lastBatch, tailMatch ? Number(tailMatch[1]) : 1) : 0;
  const tailEnd = products.length - (tailBatch - 1) * batchSize;
  const tailStart = Math.max(0, tailEnd - batchSize);
  const tailBatchValue = (index: number) => index === 1 ? "last" : `last-${index}`;
  const batch = Number.isSafeInteger(requestedBatch) && requestedBatch > 1
    ? Math.min(requestedBatch, lastBatch) : 1;
  const visibleProducts = tailBatch ? products.slice(tailStart, tailEnd) : products.slice(0, batch * batchSize);
  const resultNoun = endingSoon ? products.length === 1 ? "prize" : "prizes" : products.length === 1 ? "product" : "products";
  const showBatchSearch = endingSoon || products.length > 0 || Boolean(searchTerm);
  const batchSearchHeading = endingSoon ? "ending-soon-search-again" : "browse-search-again";
  const activeFilters = Boolean(subcategory) || filters.type !== "all" || Boolean(filters.retailer) || filters.availableOnly
    || filters.minValue !== null || filters.maxValue !== null
    || (filters.sort !== "featured" && !(selectedCategory === "ending-soon" && filters.sort === "fewest-left"));
  const allSearchHref = `/browse?${new URLSearchParams({ q: searchTerm })}`;
  const clearHrefParams = new URLSearchParams();
  if (selectedCategory) clearHrefParams.set("category", selectedCategory);
  if (selectedRetailerGroup && !(selectedCategory && filters.retailer)) clearHrefParams.set("partnerCategory", selectedRetailerGroup.id);
  if (searchTerm) clearHrefParams.set("q", searchTerm);
  const clearHref = `/browse${clearHrefParams.size ? `?${clearHrefParams}` : ""}`;
  const searchParamsForView = new URLSearchParams();
  for (const key of ["category", "sort", "subcategory", "type", "retailer", "partnerCategory", "available", "minValue", "maxValue"] as const) {
    const value = query[key];
    if (value) searchParamsForView.set(key, value);
  }
  if (searchTerm) searchParamsForView.set("q", searchTerm);
  const searchHref = `/browse${searchParamsForView.size ? `?${searchParamsForView}` : ""}`;
  let broaderSearch: { href: string; label: string } | null = null;
  if (!products.length && !unavailable && searchTerm && !searchTooLong && (selectedCategory || subcategory)) {
    const params = new URLSearchParams(searchParamsForView);
    for (const key of ["category", "subcategory", "partnerCategory"]) params.delete(key);
    if (params.get("sort") === "ending-soon") params.delete("sort");
    const globalRetailers = discoveryGroups.flatMap(group => group.options);
    const broaderFilters = parseBrowseFilterState(Object.fromEntries(params), [
      ...browseRetailers(searchableProducts), ...globalRetailers.map(option => option.value),
    ]);
    const broaderMatches = searchCatalogMatches(searchableProducts, searchTerm, denomination, { includeLowerGiftCards: true });
    const broaderProducts = filterBrowseProducts(broaderMatches.map(({ product }) => product), broaderFilters, searchTerm);
    const scopedSlugs = new Set(categoryProducts.map(product => product.slug));
    if (broaderProducts.some(product => !scopedSlugs.has(product.slug))) {
      const keyword = normalizeSearch(searchTerm);
      const retailer = globalRetailers.find(option => normalizeSearch(option.label) === keyword);
      broaderSearch = {
        href: `/browse?${params}#search-results`,
        label: retailer ? `View ${retailer.label} across all categories` : `View results for “${searchTerm}” across all categories`,
      };
    }
  }
  const returnParams = new URLSearchParams(searchParamsForView);
  if (tailBatch || batch > 1) returnParams.set("batch", tailBatch ? tailBatchValue(tailBatch) : String(batch));
  const browseReturnHref = `/browse${returnParams.size ? `?${returnParams}` : ""}`;
  const nextIndex = tailBatch ? tailEnd : visibleProducts.length;
  const nextProduct = products[nextIndex];
  const nextCount = Math.min(batchSize, products.length - nextIndex);
  const nextBatchParams = new URLSearchParams(returnParams);
  nextBatchParams.set("batch", tailBatch > 1 ? tailBatchValue(tailBatch - 1) : String(batch + 1));
  const firstBatchHref = `${searchHref}#search-results`;
  const previousBatch = batch - 1;
  const previousParams = new URLSearchParams(searchParamsForView);
  previousParams.set("batch", tailBatch ? tailBatchValue(tailBatch + 1) : String(previousBatch));
  const previousProduct = tailBatch ? tailStart > 0 ? products[Math.max(0, tailStart - batchSize)] : undefined
    : previousBatch > 1 ? products[(previousBatch - 1) * batchSize] : undefined;
  const previousBatchHref = previousProduct ? `/browse?${previousParams}#prize-${previousProduct.slug}` : firstBatchHref;
  const lastBatchParams = new URLSearchParams(searchParamsForView);
  lastBatchParams.set("batch", "last");
  const showEndingSoonShortcuts = endingSoon && (batch > 1 || tailBatch > 0);
  const offerLastShortcut = batch >= 4 && !tailBatch;
  const requestHref = `/contact/product-request?${new URLSearchParams({ product: searchTerm, from: browseReturnHref })}#product-request-heading`;
  const retryScope = [...new Set([filters.retailer || selectedRetailerGroup?.category, subcategory || selectedLabel].filter(Boolean))].join(" in ");
  const withoutBudget = new URLSearchParams(searchParamsForView);
  withoutBudget.delete("minValue");
  withoutBudget.delete("maxValue");
  const removePriceLimit = budgetLabel && !products.length && !unavailable ? (
    <Link href={`/browse${withoutBudget.size ? `?${withoutBudget}` : ""}#search-results`} prefetch={false}
      className="mt-3 inline-flex min-h-11 max-w-full items-center justify-center rounded-lg bg-cyan-200 px-4 py-2 text-sm font-bold text-[#102e50] hover:bg-cyan-100">
      Remove price limit
    </Link>
  ) : null;
  const showGroceryInspiration = selectedCategory === "groceries" && !searchTerm && !activeFilters;
  const groceryOffers = products.filter(product => groceryInspirationOfferSlugs.has(product.slug)).flatMap(product => {
    const { remaining } = availabilityStatus(product.capacity, product.sold);
    return remaining > 0 ? [{ slug: product.slug, title: product.title, entryPrice: product.entryPrice, remaining }] : [];
  });

  const page = (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Zero Loss Marketplace</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{endingSoon ? "Ending Soon" : searchTerm ? "Search results" : subcategory || selectedLabel || selectedRetailerGroup?.category || "Browse every product"}</h1>
            <p className="mt-2 text-white/65">
              {searchTooLong ? "Shorten your search to see matching prizes." : searchTerm
                ? <>{products.length} {products.length === 1 ? "product" : "products"}{!broaderSearch && directoryMatches.length ? ` · ${directoryMatches.length} matching retailer ${directoryMatches.length === 1 ? "category" : "categories"}` : ""} for <strong className="text-white">“{searchTerm}”</strong></>
                : "Choose a product to see its entry details and current availability."}
            </p>
          </div>
          <Link href="/" className="font-bold text-cyan-300 hover:text-white">← Marketplace home</Link>
        </div>

        <div id="search-results" className="mt-5 min-w-0" style={{ scrollMarginTop: "calc(var(--site-header-height, 149px) + 12px)" }}>
          <BrowseDiscoveryBar key={searchHref} browseHref={searchHref} filters={filters} retailerGroups={discoveryGroups} selectedRetailerGroup={selectedRetailerGroup} selectedCategory={selectedCategory} searchTerm={searchTerm} subcategory={query.subcategory ?? ""} clearHref={clearHref}
            searchField={endingSoon ? <BrowseResultsSearch position="top" retailerScope={filters.retailer || selectedRetailerGroup?.category} /> : undefined}>
          <SearchResultsAutoScroll searchKey={searchTerm || selectedCategory === "ending-soon" ? browseReturnHref : ""} mobileBrowseKey={browseReturnHref} groceryKey={showGroceryInspiration ? browseReturnHref : ""} />
          {showGroceryInspiration ? <GroceryInspiration key={typeof query.groceryIdea === "string" ? query.groceryIdea : ""} offers={groceryOffers} browseHref={browseReturnHref} initialIdea={query.groceryIdea} /> : null}
          {selectedCategory && isRetailerCollection(selectedCategory) && retailers.length > 0 && !searchTerm && !selectedRetailerGroup ? (
            <nav aria-label={`Shop ${selectedLabel} by retailer`} className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-bold text-white">Shop by retailer</span>
              {retailers.map(retailer => {
                const params = new URLSearchParams(searchParamsForView);
                const selected = filters.retailer === retailer;
                if (selected) params.delete("retailer");
                else params.set("retailer", retailer);
                return <Link key={retailer} href={`/browse?${params}#search-results`} aria-current={selected ? "true" : undefined}
                  className={`rounded-full border border-cyan-300/40 px-3 py-1.5 text-xs font-bold ${selected ? "bg-cyan-200 text-[#00132e]" : "text-cyan-100 hover:bg-white/10"}`}>{retailer}</Link>;
              })}
            </nav>
          ) : null}

        {broaderSearch ? (
          <section aria-label="Matches in other categories" className="mt-5 rounded-2xl border border-cyan-300/35 bg-[#061e3d] p-4 sm:p-5">
            <Link href={broaderSearch.href} prefetch={false} className="inline-flex min-h-11 max-w-full items-center rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-[#00132e] hover:bg-cyan-200 [overflow-wrap:anywhere]">
              {broaderSearch.label} →
            </Link>
          </section>
        ) : directoryMatches.length ? (
          <section aria-label="Matching retailer categories" className="mt-5 rounded-2xl border border-cyan-300/35 bg-[#061e3d] p-4 sm:p-5">
            <h2 className="text-sm font-black uppercase tracking-[.1em] text-cyan-200">Matching retailer categories</h2>
            <p className="mt-1 text-sm text-white/65">Explore the retailer directory. Current offers are marked separately.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {directoryMatches.map(group => {
                const params = new URLSearchParams(searchParamsForView);
                params.set("partnerCategory", group.id);
                return <Link key={group.id} href={`/browse?${params}#search-results`} className="inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-[#00132e] hover:bg-cyan-200">{group.category} →</Link>;
              })}
            </div>
          </section>
        ) : null}

        {query.subcategory ? <p className="mt-4 text-sm text-white/55">Showing the closest available matches for <strong className="text-white">{query.subcategory}</strong>.</p> : null}

        {showGroceryInspiration ? <div id="more-groceries" className="mt-4" style={{ scrollMarginTop: "calc(var(--site-header-height, 149px) + 12px)" }}><h2 className="text-2xl font-black leading-tight tracking-tight">More groceries &amp;<span className="block sm:inline"> rewards</span></h2></div> : null}
        {searchTooLong ? <p role="alert" className="mt-4 rounded-xl border border-orange-300/40 bg-orange-400/10 p-4 text-sm font-bold text-orange-100">Search is too long. Try a brand or product name.</p> : <div className={`${showGroceryInspiration ? "mt-2" : "mt-4"} flex flex-wrap items-center gap-x-3 gap-y-2`}>
          <p aria-live="polite" className="text-sm font-bold text-white/75">{endingSoon || products.length > batchSize
            ? tailBatch === 1 ? `Showing the last ${visibleProducts.length} of ${products.length} ${resultNoun}`
              : tailBatch ? `Showing ${tailStart + 1}–${tailEnd} of ${products.length} ${resultNoun}` : `Showing ${visibleProducts.length} of ${products.length} ${resultNoun}`
            : `${products.length} ${resultNoun} shown`}{denomination.budget ? <span className="ml-2">· Prize value {denomination.budget.inclusive ? "up to" : "under"} ${denomination.budget.maximum.toLocaleString("en-US")}</span> : denomination.values.size > 0 &&
              <span className="ml-2">· {includesLowerGiftCards ? <>Requested value {requestedValues} · Includes lower-value gift cards</> : <>Exact prize value: {requestedValues}</>}</span>}</p>
          {appliedFilters.length ? <ul aria-label="Applied filters" className="flex min-w-0 flex-wrap gap-1.5">
            {[...new Set(appliedFilters)].map(label => <li key={label} className="max-w-full rounded-full bg-[#d5f1ff] px-2.5 py-1 text-xs font-bold break-words text-[#123e68]">{label}</li>)}
          </ul> : null}
        </div>}
        {products.length ? (
          <section aria-label="Products" className={`mt-4 grid gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 ${searchTerm && products.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {visibleProducts.map((product) => {
              const open = !hidden.has(product.slug);
              const status = availabilityStatus(product.capacity, product.sold);
              const anchor = `prize-${product.slug}`;
              const cardClass = "group flex h-full flex-col p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-500 sm:p-4";
              const card = <>
                    <div className="relative aspect-[1.28/1] overflow-hidden rounded-xl bg-[#f1f4f7]">
                      <Image src={product.gallery[0].src} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2 transition-transform group-hover:scale-105" />
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#087feb] sm:text-xs">{product.retailer}</p>
                    <h2 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 sm:text-base">{product.title}</h2>
                    {relatedRetailers.has(product.slug) ? <p className="my-2 text-xs leading-4 text-slate-600">Related retailer gift card · Check retailer product availability.</p> : null}
                    {open ? <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
                      <span><strong className="block text-sm">${product.entryPrice.toFixed(2)}</strong>per entry</span>
                      <span className="text-right text-slate-500"><strong className="block" style={{ color: status.color }}>{status.remaining.toLocaleString()} left</strong>${product.value.toLocaleString()} value</span>
                    </div> : <p className="mt-auto border-t border-slate-200 pt-3 text-xs font-bold text-slate-600">No open entries</p>}
              </>;
              return (
                <article key={product.slug} id={anchor} tabIndex={-1} style={{ scrollMarginTop: "calc(var(--site-header-height, 149px) + 12px)" }}
                  className="relative overflow-hidden rounded-2xl bg-white text-[#00132e] shadow-[0_18px_42px_rgba(0,0,0,.18)]">
                  {open ? <>
                    <BrowsePrizeLink href={productHrefWithBrowseReturn(product.slug, `${browseReturnHref}#${anchor}`)} anchor={anchor} className={cardClass}>{card}</BrowsePrizeLink>
                    <FavoriteButton itemName={product.title} itemHref={`/items/${product.slug}`} size="large" className="absolute right-5 top-5 z-10" />
                  </> : <div className={cardClass}>{card}</div>}
                </article>
              );
            })}
          </section>
        ) : null}
        {searchTooLong ? null : !hasOpenResults && savedMatches.length ? (
          <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(5,51,91,.96),rgba(0,24,55,.98))] p-7 shadow-[0_20px_65px_rgba(0,0,0,.3)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Already in your activity</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">No open offers match “{searchTerm}” here.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">You have saved results for this search. Open your reward or purchase option below.</p>
            {savedOutsideFilters ? <h3 className="mt-4 text-sm font-bold text-cyan-200">
              {savedWithinFilters.size === 0 ? "Saved in your account · outside your filters" : "Saved in your account · includes results outside your filters"}
            </h3> : null}
            {removePriceLimit}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {savedMatches.map(({ product }) => {
                const result = resolvedProductDestination(account?.activity, product.slug);
                return result ? <Link key={product.slug} href={result.href} className="inline-flex min-h-12 flex-col items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e] hover:bg-[#62ff3b]">{result.label}: {product.title} →{savedWithinFilters.size > 0 && !savedWithinFilters.has(product.slug) ? <small>Outside your filters</small> : null}</Link> : null;
              })}
              <Link href="/browse" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/45 px-5 py-3 font-bold text-cyan-200 hover:border-cyan-200 hover:text-white">Browse available rewards</Link>
            </div>
          </section>
        ) : products.length ? null : unavailable ? (
          <p role="status" className="mt-6 text-white/75">Prize availability could not be loaded. Refresh to check again.</p>
        ) : searchTerm && !selectedCategory && !selectedRetailerGroup && directoryMatches.length && matchedProducts.length === 0 ? (
          <section className="mt-4 rounded-3xl border border-white/15 bg-white/6 p-8 text-center">
            <h2 className="text-2xl font-bold">No current product listings match “{searchTerm}” yet.</h2>
            <p className="mt-2 text-white/65">Explore the matching retailer category above to see its directory and any available offers.</p>
            {removePriceLimit}
          </section>
        ) : (activeFilters || selectedRetailerGroup) && (!searchTerm || matchedProducts.length) ? (
          <section className="mt-4 rounded-3xl border border-white/15 bg-white/6 p-8 text-center">
            <h2 className="text-2xl font-bold">{filters.retailer ? `No current ${filters.retailer} offer matches here.` : selectedRetailerGroup ? `No current ${selectedRetailerGroup.category} offers match here.` : "No products match these filters."}</h2>
            <p className="mt-2 text-white/65">{budgetLabel ? `Your prize-value filter is ${budgetLabel}. This is the prize value, not the cost to enter. Clear filters or search all prizes to see more.` : activeFilters ? "Try another retailer or clear your filters to see more prizes." : "Choose another category to see more prizes."}</p>
            {removePriceLimit}
            {searchTerm && !broaderSearch ? <Link href={searchResultsHref(searchTerm)} className="mr-3 mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e]">Search all prizes</Link> : null}
            {activeFilters ? <Link href={clearHref} className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#00132e]">Clear filters</Link> : null}
          </section>
        ) : searchTerm ? (
          <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(5,51,91,.96),rgba(0,24,55,.98))] p-7 shadow-[0_20px_65px_rgba(0,0,0,.3)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Nothing matched yet</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              {retryScope ? <>No “{searchTerm}” matches in {retryScope}.</> : <>We don&apos;t have “{searchTerm}” in the catalog yet.</>}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              {retryScope
                ? broaderSearch ? "You can also tell us what you’d like to see in this category." : "Try all search results, or tell us what you’d like to see in this category."
                : "We’re adding new rewards regularly, and what our customers ask for helps decide what comes next. Tell us what you’d love a chance to win."}
            </p>
            <p className="mt-7 text-xl font-black sm:text-2xl">Shopping should never feel like a <span className="text-[#31e800]">loss.</span></p>
            {removePriceLimit}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {retryScope && !broaderSearch ? <Link href={`${allSearchHref}#search-results`} className="zl-see-all">See all search results</Link> : null}
              <Link href={requestHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e] hover:bg-[#62ff3b]">Request a product →</Link>
              <Link href="/browse" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-cyan-300/45 px-5 py-3 font-bold text-cyan-200 hover:border-cyan-200 hover:text-white">Browse available rewards</Link>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-white/15 bg-white/6 p-8 text-center">
            <h2 className="text-2xl font-bold">This category is ready for inventory.</h2>
            <p className="mt-2 text-white/65">No preview products are assigned here yet. Browse all current products instead.</p>
            <Link href="/browse" className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#00132e]">View all products</Link>
          </section>
        )}
        {showBatchSearch && <section className={browseStyles.batchSearch} aria-labelledby={batchSearchHeading}>
          <h2 id={batchSearchHeading}>Didn’t find what you were looking for?</h2>
          <div className={browseStyles.footerDiscovery}>
            <BrowseResultsSearch position="bottom" retailerScope={filters.retailer || selectedRetailerGroup?.category} />
            <BrowseDiscoveryFooterControls />
          </div>
          <p className="text-sm text-white/75">Try a retailer and prize value, like “Walmart $100”.</p>
          {endingSoon ? (
            <div className={browseStyles.batchActions} role="group" aria-label="Ending Soon prize batches">
              {showEndingSoonShortcuts && (
                <Link replace scroll={false} prefetch={false} className={browseStyles.batchShortcut}
                  href={offerLastShortcut ? `/browse?${lastBatchParams}#prize-${products[products.length - batchSize].slug}` : firstBatchHref}>
                  {offerLastShortcut ? "Last 24" : "First 24"}
                </Link>
              )}
              {nextProduct && <Link replace scroll={false} prefetch={false} className={browseStyles.morePrizes}
                href={`/browse?${nextBatchParams}#prize-${nextProduct.slug}`}>Next {nextCount} {nextCount === 1 ? "Prize" : "Prizes"}</Link>}
              {showEndingSoonShortcuts && (!tailBatch || tailStart > 0) && <Link replace scroll={false} prefetch={false} className={browseStyles.batchShortcut}
                href={previousBatchHref}>Previous 24</Link>}
            </div>
          ) : nextProduct && <Link replace scroll={false} prefetch={false} className={browseStyles.morePrizes}
            href={`/browse?${nextBatchParams}#prize-${nextProduct.slug}`}>Show {nextCount} more {nextCount === 1 ? "prize" : "prizes"}</Link>}
        </section>}
        </BrowseDiscoveryBar>
        </div>
      </div>
    </main>
  );
  return showBatchSearch ? <BrowseResultsSearchSession key={JSON.stringify([selectedCategory, subcategory, selectedRetailerGroup?.id, filters.retailer, searchTerm, endingSoon])} browseHref={searchHref} searchTerm={searchTerm} endingSoon={endingSoon}>{page}</BrowseResultsSearchSession> : page;
}
