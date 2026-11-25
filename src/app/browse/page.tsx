import type { Metadata } from "next";
import Link from "next/link";
import { demoProducts, type DemoProduct } from "@/lib/catalog/demo-products";
import {
  marketplaceCategories,
  marketplaceCategoryId,
  type MarketplaceCategoryId,
  isGiftCardListing,
  isRetailerCollection,
  productMatchesMarketplaceCategory,
} from "@/lib/catalog/navigation";
import { catalogAlternatives, searchCatalogMatches, filterCatalogSubcategory } from "@/lib/catalog/search";
import { catalogSearchTooLong } from "@/lib/catalog/search-text";
import { AccountReadRetryLink } from "@/components/account/AccountReadRetryLink";
import { searchDenominations } from "@/lib/catalog/search-denomination";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { availabilityStatus } from "@/lib/catalog/availability";
import { endingSoonTicketRanges, filterEndingSoonTickets, parseEndingSoonTicketRange } from "@/lib/catalog/ending-soon-ticket-ranges";
import { BrowseDiscoveryBar, BrowseDiscoveryFooterControls, type BrowsePreviewProduct } from "@/components/catalog/BrowseDiscoveryBar";
import { BrowseResultsSearch, BrowseResultsSearchSession } from "@/components/catalog/BrowseResultsSearch";
import { BrowseProductRequestLink, BrowseResultsLink, EndingSoonRangeLink } from "@/components/catalog/BrowsePrizeLink";
import browseStyles from "@/components/catalog/browse-discovery.module.css";
import { browseCategoryProductType, browseRetailers, filterBrowseProducts, isBrowseSort, isBrowseProductType, parseBrowseFilterState, retailerFilterGroups, browsePrizeValueLabel } from "@/lib/catalog/browse-filters";
import { getGiftCardPartnerGroups } from "@/lib/catalog/gift-card-partners-reader";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";
import { BrowseProductCard } from "@/components/catalog/BrowseProductCard";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";
import { resolvedProductDestination } from "@/lib/catalog/resolved-destination";
import { SearchResultsAutoScroll } from "@/components/catalog/SearchResultsAutoScroll";
import { GroceryInspiration } from "@/components/catalog/GroceryInspiration";
import { groceryThemes } from "@/lib/catalog/grocery-themes";
import { categorySubcategories } from "@/lib/home/placeholder-data";
import { groceryInspirationOfferSlugs } from "@/lib/catalog/grocery-themes";
import { groceryStoreFirst } from "@/lib/catalog/grocery-order";
import { matchingQueryValue } from "@/lib/navigation/query-value";

export async function generateMetadata({ searchParams }: BrowsePageProps): Promise<Metadata> {
  const params = await searchParams;
  const category = marketplaceCategoryId(matchingQueryValue(params.category) ?? "");
  if (params.sort === "ending-soon" || category === "ending-soon") return { title: "Ending Soon" };
  const label = marketplaceCategories.find(item => item.id === category)?.label;
  return { title: params.q ? "Search results" : label ?? "Browse" };
}

type BrowsePageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const batchSize = 24;
const filterLabels = {
  category: "category", subcategory: "subcategory", retailer: "retailer", partnerCategory: "retailer group",
  type: "product type", available: "availability", minValue: "minimum value", maxValue: "maximum value",
  sort: "sort order", ticketsLeft: "tickets left", groceryIdea: "grocery idea",
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const incoming = await searchParams;
  const conflictingFilters = Object.entries(filterLabels).flatMap(([key, label]) => {
    const value = incoming[key];
    return Array.isArray(value) && matchingQueryValue(value) === undefined ? [{ key, label, values: [...new Set(value)] }] : [];
  });
  const query = Object.fromEntries(Object.entries(incoming).map(([key, value]) =>
    [key, Object.hasOwn(filterLabels, key) ? matchingQueryValue(value) : Array.isArray(value) ? value[0] : value]));
  const searchChoices = Array.isArray(incoming.q) ? [...new Set(incoming.q.map(value => value.trim()))] : [];
  const conflictingSearch = searchChoices.length > 1;
  const [{ availability, account, hidden, unavailable, availabilityIncomplete, unverifiedSlugs }, partnerGroups] = await Promise.all([getShoppingCatalog(), getGiftCardPartnerGroups()]);
  const resolved = new Set(resolvedCatalogSlugs(account?.activity));
  const availableProducts = demoProducts.filter(product => !hidden.has(product.slug)).map(product => {
    const current = availability?.[product.slug];
    return current ? { ...product, capacity: current.capacity, sold: current.sold, entryPrice: current.entryPriceCents / 100 } : product;
  });
  const rareFinds = query.collection === "rare-finds";
  const rareFindSlugs = new Set(["lg-oled-c6-65-tv", "playstation-5-slim", "dyson-v8-cordless-vacuum", "kitchenaid-artisan-5qt-mixer", "sony-wh-1000xm5-headphones", "nintendo-switch"]);
  const inCollection = (product: DemoProduct) => !rareFinds || rareFindSlugs.has(product.slug);
  const searchTerm = conflictingSearch ? "" : query.q?.trim() ?? "";
  const searchTooLong = catalogSearchTooLong(searchTerm);
  const invalidSearch = Boolean(searchTerm) && !/[\p{L}\p{N}]/u.test(searchTerm);
  const selectedCategory = marketplaceCategoryId(query.category ?? "") ?? (query.sort === "ending-soon" ? "ending-soon" : null);
  const unknownCategory = Boolean(query.category && !marketplaceCategoryId(query.category));
  const endingSoon = selectedCategory === "ending-soon";
  const ticketsLeft = endingSoon ? parseEndingSoonTicketRange(query.ticketsLeft) : null;
  const selectedLabel = marketplaceCategories.find((category) => category.id === selectedCategory)?.label;
  const requestedTopic = query.subcategory?.trim().slice(0, 128) ?? "";
  const topics = Object.entries(categorySubcategories).find(([name]) => marketplaceCategoryId(name) === selectedCategory)?.[1];
  const knownTopic = topics?.find(topic => topic.toLowerCase() === requestedTopic.toLowerCase());
  const invalidSubcategory = Boolean(requestedTopic && !knownTopic && (endingSoon || !filterCatalogSubcategory(
    demoProducts.filter(product => !selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory)),
    requestedTopic,
  ).length));
  const subcategory = invalidSubcategory ? "" : knownTopic ?? requestedTopic;
  const invalidGroceryIdea = query.groceryIdea !== undefined
    && (selectedCategory !== "groceries" || !groceryThemes.some(theme => theme.id === query.groceryIdea));
  const showCatalogDenominations = !unavailable
    && Boolean(searchTerm || selectedCategory || query.retailer || query.partnerCategory || query.type === "gift-cards");
  const unavailableDenominations = showCatalogDenominations ? demoProducts.filter(product =>
    hidden.has(product.slug) && !unverifiedSlugs?.has(product.slug) && product.value === 100 && isGiftCardListing(product))
    .map(product => ({ ...product, sold: product.capacity })) : [];
  const searchableProducts = [...availableProducts, ...unavailableDenominations];
  const categoryProducts = filterCatalogSubcategory((endingSoon ? availableProducts : searchableProducts).filter(
    product => inCollection(product) && (!selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory))), subcategory);
  const retailers = browseRetailers(categoryProducts);
  const retailerGroups = retailerFilterGroups(partnerGroups, categoryProducts.filter(product => !hidden.has(product.slug)), categoryProducts);
  const selectedRetailerGroup = retailerGroups.find(group => group.id === query.partnerCategory) ?? null;
  const denomination = searchDenominations(searchTooLong ? "" : searchTerm, demoProducts);
  const alternatives = searchTooLong ? null : catalogAlternatives(searchTerm, demoProducts, denomination);
  const searchBudgets = alternatives ? alternatives.map(part => part.budget) : [denomination.budget];
  const requestedDenominations = alternatives?.some(part => !part.values.size) ? new Set<number>() : denomination.values;
  const formatBudget = (value: number) => `$${value.toLocaleString("en-US")}`;
  const formatSearchBudget = (searchBudget: typeof denomination.budget) => searchBudget?.minimum !== undefined
    ? searchBudget.maximum === null ? searchBudget.exclusiveMinimum ? `above ${formatBudget(searchBudget.minimum)}` : `${formatBudget(searchBudget.minimum)} and up` : !searchBudget.exclusiveMinimum && searchBudget.inclusive ? `${formatBudget(searchBudget.minimum)}–${formatBudget(searchBudget.maximum)}` : `${searchBudget.exclusiveMinimum ? "above" : "at least"} ${formatBudget(searchBudget.minimum)} and ${searchBudget.inclusive ? "up to" : "under"} ${formatBudget(searchBudget.maximum)}`
    : searchBudget?.maximum != null ? `${searchBudget.inclusive ? "up to" : "under"} ${formatBudget(searchBudget.maximum)}` : null;
  const searchBudgetLabel = searchBudgets.every(Boolean)
    ? [...new Set(searchBudgets.map(formatSearchBudget))].join(" or ") : null;
  const directoryMatches = searchTerm && !searchTooLong && !endingSoon && !denomination.values.size && !denomination.budget ? searchRetailerDirectory(retailerGroups, searchTerm) : [];
  const requestedFilters = parseBrowseFilterState(query, [...retailers, ...browseRetailers(demoProducts), ...retailerGroups.flatMap(group => group.options.map(option => option.value))]);
  const unknownSort = Boolean(query.sort && !isBrowseSort(query.sort));
  const invalidTicketRange = query.ticketsLeft !== undefined && !ticketsLeft;
  const invalidType = query.type !== undefined && !isBrowseProductType(query.type);
  const invalidAvailable = query.available !== undefined && !["1", "0", "true", "false"].includes(query.available);
  const invalidMinimum = query.minValue !== undefined && requestedFilters.minValue === null;
  const invalidMaximum = query.maxValue !== undefined && requestedFilters.maxValue === null;
  const reversedRange = requestedFilters.minValue !== null && requestedFilters.maxValue !== null
    && requestedFilters.minValue > requestedFilters.maxValue;
  const filters = reversedRange ? { ...requestedFilters, minValue: null, maxValue: null } : requestedFilters;
  const budgetLabel = browsePrizeValueLabel(filters);
  const appliedFilters = [
    rareFinds ? "Rare Finds" : null,
    selectedLabel,
    subcategory,
    selectedRetailerGroup?.category,
    filters.retailer,
    filters.type === "gift-cards" ? "Gift Cards" : filters.type === "pictured" ? "Products with photos" : null,
    filters.availableOnly ? "Available only" : null,
    budgetLabel,
    endingSoonTicketRanges.find(range => range.value === ticketsLeft)?.label,
  ].filter((label): label is string => Boolean(label));
  const discoveryGroups = retailerFilterGroups(partnerGroups, availableProducts, demoProducts);
  const searchMatches = searchTerm && !searchTooLong ? searchCatalogMatches(categoryProducts, searchTerm, denomination, { includeLowerGiftCards: !endingSoon }) : [];
  const savedMatches = searchTerm && !searchTooLong ? searchCatalogMatches(filterCatalogSubcategory(demoProducts.filter(product => resolved.has(product.slug) && (!selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory))), subcategory), searchTerm, denomination) : [];
  const relatedRetailers = new Set(searchMatches.filter(match => match.kind === "retailer").map(match => match.product.slug));
  const matchedProducts = filterEndingSoonTickets(searchTerm ? searchMatches.map(match => match.product) : categoryProducts, ticketsLeft);
  const allowedRetailers = selectedRetailerGroup
    ? new Set(selectedRetailerGroup.options.map(option => option.value))
    : undefined;
  const filteredProducts = filterBrowseProducts(matchedProducts, filters, searchTerm, selectedCategory === "ending-soon" && query.sort !== "fewest-left", allowedRetailers);
  const scopedOfferRetailers = browseRetailers(filterBrowseProducts(
    matchedProducts.filter(product => !hidden.has(product.slug)),
    { ...filters, retailer: "" }, searchTerm, endingSoon,
  ));
  const savedWithinFilters = new Set(filterBrowseProducts(savedMatches.map(({ product }) =>
    ({ ...product, sold: product.capacity })), filters, searchTerm, endingSoon, allowedRetailers).map(product => product.slug));
  const savedOutsideFilters = savedMatches.some(({ product }) => !savedWithinFilters.has(product.slug));
  const products = selectedCategory === "groceries" && !searchTerm && filters.sort === "featured"
    ? groceryStoreFirst(filteredProducts, retailerGroups.find(group => group.id === "groceries")?.options.map(option => option.value) ?? [])
    : filteredProducts;
  const previewProducts = availableProducts.filter(inCollection);
  const previewMatches = searchTerm
    ? searchTooLong ? [] : searchCatalogMatches(previewProducts, searchTerm, denomination, { includeLowerGiftCards: true }).map(match => match.product)
    : previewProducts;
  const exactEndingMatches = searchTerm && !searchTooLong && denomination.values.size
    ? searchCatalogMatches(previewProducts, searchTerm, denomination, { includeLowerGiftCards: false }).map(match => match.product)
    : previewMatches;
  const previewCategoryIds: (MarketplaceCategoryId | "")[] = ["", ...marketplaceCategories.map(category => category.id)];
  const categoryPreviews = Object.fromEntries(previewCategoryIds.map(id => {
    const isEnding = id === "ending-soon";
    const sort = isEnding && !endingSoon ? "featured" : filters.sort;
    const matches = (isEnding ? exactEndingMatches : previewMatches)
      .filter(product => !id || productMatchesMarketplaceCategory(product, id));
    const matching = filterBrowseProducts(filterEndingSoonTickets(matches, isEnding ? ticketsLeft : null),
      { ...filters, retailer: "", sort, type: browseCategoryProductType(id, filters.type) }, searchTerm, isEnding && query.sort !== "fewest-left");
    const sorted = id === "groceries" && !searchTerm && sort === "featured"
      ? groceryStoreFirst(matching, discoveryGroups.find(group => group.id === "groceries")?.options.map(option => option.value) ?? [])
      : matching;
    const preview: BrowsePreviewProduct[] = sorted.slice(0, 10).map(product => ({
      slug: product.slug, title: product.title, image: product.gallery[0].src,
      remaining: availabilityStatus(product.capacity, product.sold).remaining,
    }));
    return [id, preview] as const;
  }));
  const hasOpenResults = products.some(product => !hidden.has(product.slug));
  const matchingClosedPrize = searchTerm && !searchTooLong && !invalidSearch && !unavailable && !endingSoon
    && !filters.availableOnly && !products.length && !savedMatches.length
    ? filterBrowseProducts(searchCatalogMatches(filterCatalogSubcategory(demoProducts.filter(product =>
        hidden.has(product.slug) && !resolved.has(product.slug) && !unverifiedSlugs.has(product.slug)
        && (!selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory))), subcategory), searchTerm, denomination)
        .filter(match => match.kind === "product")
        .map(({ product }) => ({ ...product, sold: product.capacity })),
      filters, searchTerm, false, allowedRetailers)[0]
    : undefined;
  const includesLowerGiftCards = requestedDenominations.size > 0
    && products.some(product => isGiftCardListing(product) && !denomination.values.has(product.value));
  const requestedValues = Array.from(requestedDenominations, formatBudget).join(" or ");
  const matchingValues = new Set(products.map(product => product.value));
  const missingRequestedValues = !unavailable && requestedDenominations.size > 1 && products.length
    ? Array.from(requestedDenominations).filter(value => !matchingValues.has(value)).map(formatBudget)
    : [];
  const requestedBatch = typeof query.batch === "string" && /^[1-9]\d*$/.test(query.batch) ? Number(query.batch) : 1;
  const lastBatch = Math.max(1, Math.ceil(products.length / batchSize));
  const tailMatch = typeof query.batch === "string" ? /^last-([1-9]\d{0,5})$/.exec(query.batch) : null;
  const oversizedTail = !unavailable && endingSoon && Boolean(tailMatch && Number(tailMatch[1]) > lastBatch);
  const tailBatch = endingSoon && lastBatch > 1 && (query.batch === "last" || tailMatch)
    ? Math.min(lastBatch, tailMatch ? Number(tailMatch[1]) : 1) : 0;
  const tailEnd = products.length - (tailBatch - 1) * batchSize;
  const tailStart = Math.max(0, tailEnd - batchSize);
  const tailBatchValue = (index: number) => index === 1 ? "last" : `last-${index}`;
  const batch = Number.isSafeInteger(requestedBatch) && requestedBatch > 1 && requestedBatch <= lastBatch ? requestedBatch : 1;
  const visibleProducts = tailBatch ? products.slice(tailStart, tailEnd) : products.slice(0, batch * batchSize);
  const resultNoun = endingSoon ? products.length === 1 ? "prize" : "prizes" : products.length === 1 ? "product" : "products";
  const showBatchSearch = endingSoon || products.length > 0 || Boolean(searchTerm);
  const batchSearchHeading = endingSoon ? "ending-soon-search-again" : "browse-search-again";
  const activeFilters = Boolean(subcategory) || Boolean(ticketsLeft) || filters.type !== "all" || Boolean(filters.retailer) || filters.availableOnly
    || filters.minValue !== null || filters.maxValue !== null
    || filters.sort !== "featured" || filters.featuredExplicit === true;
  const clearHrefParams = new URLSearchParams();
  if (rareFinds) clearHrefParams.set("collection", "rare-finds");
  if (selectedCategory) clearHrefParams.set("category", selectedCategory);
  if (selectedRetailerGroup && !(selectedCategory && filters.retailer)) clearHrefParams.set("partnerCategory", selectedRetailerGroup.id);
  if (searchTerm) clearHrefParams.set("q", searchTerm);
  const clearHref = `/browse${clearHrefParams.size ? `?${clearHrefParams}` : ""}`;
  const searchParamsForView = new URLSearchParams();
  if (rareFinds) searchParamsForView.set("collection", "rare-finds");
  for (const key of ["category", "sort", "subcategory", "type", "retailer", "partnerCategory", "available", "minValue", "maxValue"] as const) {
    if (key === "sort" && unknownSort || key === "type" && invalidType) continue;
    if (key === "available") {
      if (filters.availableOnly) searchParamsForView.set("available", "1");
      continue;
    }
    if (key === "minValue" && (invalidMinimum || reversedRange) || key === "maxValue" && (invalidMaximum || reversedRange)) continue;
    const value = key === "subcategory" ? subcategory : key === "category" && query.category ? selectedCategory
      : key === "partnerCategory" ? selectedRetailerGroup?.id : key === "retailer" ? filters.retailer : query[key];
    if (value) searchParamsForView.set(key, value);
  }
  if (searchTerm) searchParamsForView.set("q", searchTerm);
  if (ticketsLeft) searchParamsForView.set("ticketsLeft", ticketsLeft);
  const searchHref = `/browse${searchParamsForView.size ? `?${searchParamsForView}` : ""}`;
  const retailerOutsideScope = Boolean(filters.retailer && retailers.indexOf(filters.retailer) === -1 && (selectedCategory || subcategory || selectedRetailerGroup));
  const allCategoriesForRetailer = new URLSearchParams(searchParamsForView);
  for (const key of ["category", "subcategory", "partnerCategory", "ticketsLeft"]) allCategoriesForRetailer.delete(key);
  if (allCategoriesForRetailer.get("sort") === "ending-soon") allCategoriesForRetailer.delete("sort");
  const canSuggestRecovery = !products.length && !unavailable && !searchTooLong;
  let broaderSearch: { href: string; count: number } | null = null;
  let broaderWithoutBudget: { href: string; count: number } | null = null;
  if (canSuggestRecovery && searchTerm && (selectedCategory || subcategory || selectedRetailerGroup)) {
    const params = new URLSearchParams(searchParamsForView);
    for (const key of ["category", "subcategory", "partnerCategory", "ticketsLeft"]) params.delete(key);
    if (params.get("sort") === "ending-soon") params.delete("sort");
    const globalRetailers = discoveryGroups.flatMap(group => group.options);
    const broaderFilters = parseBrowseFilterState(Object.fromEntries(params), [
      ...browseRetailers(searchableProducts), ...globalRetailers.map(option => option.value),
    ]);
    const broaderMatches = searchCatalogMatches(searchableProducts, searchTerm, denomination, { includeLowerGiftCards: true });
    const broaderProducts = filterBrowseProducts(broaderMatches.map(({ product }) => product), broaderFilters, searchTerm);
    if (broaderProducts.length) broaderSearch = { href: `/browse?${params}#search-results`, count: broaderProducts.length };
    else if (budgetLabel) {
      params.delete("minValue");
      params.delete("maxValue");
      const count = filterBrowseProducts(broaderMatches.map(({ product }) => product),
        { ...broaderFilters, minValue: null, maxValue: null }, searchTerm).length;
      if (count) broaderWithoutBudget = { href: `/browse?${params}#search-results`, count };
    }
  }
  const returnParams = new URLSearchParams(searchParamsForView);
  if (tailBatch || batch > 1) returnParams.set("batch", tailBatch ? tailBatchValue(tailBatch) : String(batch));
  const normalizedBatch = returnParams.get("batch");
  const obsoleteBatch = !unavailable && query.batch !== undefined && query.batch !== (normalizedBatch ?? undefined);
  const normalizeAvailability = query.available !== undefined && query.available !== (filters.availableOnly ? "1" : undefined);
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
  const requestHref = `/contact/product-request?${new URLSearchParams({ product: searchTerm, from: browseReturnHref })}#product-request`;
  const retryScope = [...new Set([filters.retailer || selectedRetailerGroup?.category, subcategory || selectedLabel].filter(Boolean))].join(" in ");
  const withoutBudget = new URLSearchParams(searchParamsForView);
  withoutBudget.delete("minValue");
  withoutBudget.delete("maxValue");
  const priceMatchCount = canSuggestRecovery && budgetLabel ? filterBrowseProducts(
    matchedProducts, { ...filters, minValue: null, maxValue: null }, searchTerm, endingSoon, allowedRetailers,
  ).length : 0;
  const categoryScope = subcategory || selectedLabel || selectedRetailerGroup?.category;
  const broaderScope = selectedRetailerGroup && (subcategory || selectedLabel) ? "your selected categories" : categoryScope;
  const outsideBudget = filters.maxValue !== null
    ? filters.minValue ? `outside the ${budgetLabel} prize-value filter` : `above $${filters.maxValue.toLocaleString("en-US")}`
    : filters.minValue !== null ? `below $${filters.minValue.toLocaleString("en-US")}` : "";
  const recoveryLinkClass = "inline-flex min-h-11 max-w-full items-center justify-center rounded-lg bg-cyan-200 px-4 py-2 text-sm font-bold text-[#102e50] hover:bg-cyan-100";
  const widerRecovery = priceMatchCount ? null : broaderWithoutBudget;
  const filterRecovery = priceMatchCount || broaderSearch || widerRecovery ? (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-left">
      {priceMatchCount ? <div className="min-w-0">
        <p className="mb-2 text-sm text-white/85">{priceMatchCount.toLocaleString("en-US")} {priceMatchCount === 1 ? "match is" : "matches are"} {outsideBudget}{categoryScope ? ` in ${categoryScope}` : ""}.</p>
        <BrowseResultsLink href={`/browse${withoutBudget.size ? `?${withoutBudget}` : ""}#search-results`} target="heading" className={recoveryLinkClass}>Remove price filter</BrowseResultsLink>
      </div> : null}
      {broaderSearch ? <div className="min-w-0">
        <p className="mb-2 text-sm text-white/85">{broaderSearch.count.toLocaleString("en-US")} {broaderSearch.count === 1 ? "match" : "matches"} outside {broaderScope}{budgetLabel ? ` · ${budgetLabel}` : ""}.</p>
        <BrowseResultsLink href={broaderSearch.href} target="heading" className={recoveryLinkClass}>Search all categories</BrowseResultsLink>
      </div> : null}
      {widerRecovery ? <div className="min-w-0">
        <p className="mb-2 text-sm text-white/85">{widerRecovery.count.toLocaleString("en-US")} {widerRecovery.count === 1 ? "match" : "matches"} across all categories without the prize-value filter.</p>
        <BrowseResultsLink href={widerRecovery.href} target="heading" className={recoveryLinkClass}>Search all categories at any value</BrowseResultsLink>
      </div> : null}
    </div>
  ) : null;
  const parentCategoryParams = new URLSearchParams(searchParamsForView);
  parentCategoryParams.delete("subcategory");
  const parentCategoryHref = `/browse${parentCategoryParams.size ? `?${parentCategoryParams}` : ""}#search-results`;
  const deviceTopic = /^(?:laptops|tablets)$/i.test(subcategory);
  const relatedDeviceRewardsOnly = deviceTopic && products.length > 0 && products.every(isGiftCardListing);
  const showGroceryInspiration = selectedCategory === "groceries" && !searchTerm && !activeFilters;
  const groceryOffers = products.filter(product => groceryInspirationOfferSlugs.has(product.slug)).flatMap(product => {
    const { remaining } = availabilityStatus(product.capacity, product.sold);
    return remaining > 0 ? [{ slug: product.slug, title: product.title, entryPrice: product.entryPrice, remaining }] : [];
  });

  const page = (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Zero Loss Marketplace</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{endingSoon ? "Ending Soon" : searchTerm ? "Search results" : subcategory || selectedLabel || selectedRetailerGroup?.category || (rareFinds ? "Rare Finds" : "Browse every product")}</h1>
            <p className="mt-2 text-white/65">
              {invalidSearch ? "Enter a product or retailer name to search." : searchTooLong ? "Shorten your search to see matching prizes." : searchTerm
                ? <>{products.length} {products.length === 1 ? "product" : "products"}{!broaderSearch && directoryMatches.length ? ` · ${directoryMatches.length} matching retailer ${directoryMatches.length === 1 ? "category" : "categories"}` : ""} for <strong className="break-words text-white">“{searchTerm}”</strong></>
                : "Choose a product to see its entry details and current availability."}
            </p>
          </div>
          <Link href="/" className="font-bold text-cyan-300 hover:text-white">← Marketplace home</Link>
        </div>

        <div id="search-results" className="mt-5 min-w-0" style={{ scrollMarginTop: "calc(var(--site-header-height, 149px) + 12px)" }}>
          <h2 id="browse-results-heading" tabIndex={-1} className="sr-only">{retryScope ? `${retryScope} prize results` : "Prize results"}</h2>
          {availabilityIncomplete && !unavailable ? <p role="status" className="mb-3 text-sm text-amber-200">Some prize counts could not be verified. Showing the available results. <AccountReadRetryLink className="underline" href={searchHref + "#search-results"}>Check availability again</AccountReadRetryLink></p> : null}
          {(invalidMinimum || invalidMaximum) && <p role="status" className="mb-3 text-sm text-amber-200">
            {invalidMinimum && invalidMaximum ? "The minimum and maximum prize values couldn’t be applied." : invalidMinimum ? "The minimum prize value couldn’t be applied." : "The maximum prize value couldn’t be applied."} <Link href={searchHref + "#search-results"} className="underline">Remove the invalid value from this link</Link>
          </p>}
          {denomination.conflictingBudget ? <p role="status" className="mb-3 text-sm text-amber-200">These price limits do not overlap. Adjust the minimum or maximum in your search.</p> : null}
          {denomination.unsupportedCurrency ? <p role="status" className="mb-3 text-sm text-amber-200">This catalog lists prizes in U.S. dollars. Search using a USD amount to see matching prizes.</p> : null}
          {invalidTicketRange || invalidType || invalidAvailable ? <p role="status" className="mb-3 text-sm text-amber-200">
            {invalidTicketRange ? "That tickets-left range is unavailable. " : ""}{invalidType ? "That product type is unavailable. " : ""}{invalidAvailable ? "That availability filter is unavailable. " : ""}Your other filters still apply. <Link href={browseReturnHref + "#search-results"} className="underline">Update this link</Link>
          </p> : null}
          {unknownSort ? <p role="status" className="mb-3 text-sm text-amber-200">That sort is unavailable. Showing featured results. <Link href={searchHref + "#search-results"} className="underline">Remove unavailable sort</Link></p> : null}
          {obsoleteBatch && query.batch !== "1" ? <p role="status" className="mb-3 text-sm text-amber-200">That batch is no longer available. Showing the available results for this search.</p> : null}
          {invalidSubcategory ? <p role="status" className="mb-3 text-sm text-amber-200">That subcategory is unavailable. Showing your other filters in {selectedLabel ?? "Browse"}.</p> : null}
          {invalidGroceryIdea ? <p id="unavailable-grocery-idea" tabIndex={-1} role="status" className="mb-3 scroll-mt-[calc(var(--site-header-height,149px)+12px)] text-sm text-amber-200">That grocery idea is unavailable. {selectedCategory === "groceries" ? <Link href={showGroceryInspiration ? "#grocery-inspiration" : "#search-results"} className="underline">Back to groceries</Link> : null}</p> : null}
          {conflictingSearch ? <div className="mb-3 text-sm text-amber-200">
            <p role="alert">This link contains different search terms. Choose one below or enter a new search. Your filters still apply.</p>
            <ul className="mt-1 flex flex-wrap gap-x-4">
              {searchChoices.filter(term => term && /\p{L}|\p{N}/u.test(term) && !catalogSearchTooLong(term)).map(term => {
                const params = new URLSearchParams(searchParamsForView);
                params.set("q", term);
                for (const conflict of conflictingFilters) conflict.values.forEach(choice => params.append(conflict.key, choice));
                if (!invalidGroceryIdea && query.groceryIdea) params.set("groceryIdea", query.groceryIdea);
                return <li key={term}><BrowseResultsLink target="heading" href={`/browse?${params}#search-results`} className="inline-flex min-h-11 items-center break-all underline">Search for “{term}”</BrowseResultsLink></li>;
              })}
            </ul>
          </div> : null}
          {conflictingFilters.map(({ key, label, values }) => {
            function chooseFilter(value?: string) {
              const params = new URLSearchParams(searchParamsForView);
              for (const conflict of conflictingFilters) {
                if (conflict.key !== key) conflict.values.forEach(choice => params.append(conflict.key, choice));
              }
              if (conflictingSearch) searchChoices.forEach(term => params.append("q", term));
              if (value !== undefined) params.set(key, value);
              return `/browse?${params}#search-results`;
            }
            return <div key={key} className="mb-3 text-sm text-amber-200">
              <p role="status">This link has more than one {label} filter. Your other filters still apply.</p>
              <ul className="mt-1 flex flex-wrap gap-x-4">
                {values.filter(value => value.trim() && value.length <= 128).map(value =>
                  <li key={value}><BrowseResultsLink target="heading" href={chooseFilter(value)} className="inline-flex min-h-11 items-center break-all underline">Use {value}</BrowseResultsLink></li>)}
                <li><BrowseResultsLink target="heading" href={chooseFilter()} className="inline-flex min-h-11 items-center underline">Skip {label} filter</BrowseResultsLink></li>
              </ul>
            </div>;
          })}
          {unknownCategory ? <p role="status" className="mb-3 text-sm text-amber-200">That category is unavailable. Your other filters still apply. <Link href={searchHref + "#search-results"} className="underline">Remove category filter</Link></p> : null}
          {query.retailer && !filters.retailer && !retailerOutsideScope && !unavailable ? <p role="status" className="mb-3 text-sm text-amber-200">
            That retailer is unavailable. Your other filters still apply. <Link href={searchHref + "#search-results"} className="underline">Remove retailer filter</Link>
          </p> : null}
          {retailerOutsideScope && !unavailable ? <p role="status" className="mb-3 text-sm text-amber-200">
            {filters.retailer} has no prizes in this category. <BrowseResultsLink target="heading" href={`/browse?${allCategoriesForRetailer}#search-results`} className="underline">Search for {filters.retailer} across all categories</BrowseResultsLink>
          </p> : null}
          {reversedRange && <p role="status" className="mb-3 text-sm text-amber-200">The minimum prize value exceeded the maximum. Showing results with the price range cleared. <Link href={searchHref + "#search-results"} className="underline">Remove the invalid range from this link</Link></p>}
          {query.partnerCategory && !selectedRetailerGroup ? <p role="status" className="mb-3 text-sm text-amber-200">That retailer group is unavailable. Your other filters still apply. <Link href={searchHref + "#search-results"} className="underline">Update this link</Link></p> : null}
          <BrowseDiscoveryBar key={searchHref} browseHref={searchHref} filters={filters} retailerGroups={discoveryGroups} scopedOfferRetailers={scopedOfferRetailers} selectedRetailerGroup={selectedRetailerGroup} selectedCategory={selectedCategory} ticketsLeft={ticketsLeft} searchTerm={searchTerm} subcategory={subcategory} clearHref={clearHref} previews={categoryPreviews}
            searchField={endingSoon ? <BrowseResultsSearch position="top" retailerScope={filters.retailer || selectedRetailerGroup?.category} /> : undefined}>
          <SearchResultsAutoScroll searchKey={searchTerm || selectedCategory === "ending-soon" ? browseReturnHref : ""} mobileBrowseKey={browseReturnHref} groceryKey={showGroceryInspiration ? browseReturnHref : ""} invalidSearch={invalidSearch} obsoleteBatch={obsoleteBatch} focusObsoleteBatch={obsoleteBatch && query.batch !== "1"} normalizedBatch={normalizedBatch} invalidTicketRange={invalidTicketRange} invalidType={invalidType} normalizeAvailability={normalizeAvailability} availableOnly={filters.availableOnly} invalidSubcategory={invalidSubcategory} invalidGroceryIdea={invalidGroceryIdea} duplicateSelectors={Object.values(incoming).some(Array.isArray)} conflictingSearch={conflictingSearch} conflictingFilters={conflictingFilters.map(({ key }) => key).join(",")} oldTailPrizes={oversizedTail ? products.map(product => product.slug) : undefined} batchSize={batchSize} />
          {showGroceryInspiration || (selectedCategory === "groceries" && typeof query.groceryIdea === "string") ? <GroceryInspiration key={typeof query.groceryIdea === "string" ? query.groceryIdea : ""} offers={groceryOffers} browseHref={browseReturnHref} initialIdea={query.groceryIdea} showShelf={showGroceryInspiration} /> : null}
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

        {!broaderSearch && directoryMatches.length ? (
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

        {subcategory ? <p className="mt-4 text-sm text-white/55">{products.length ? "Showing the closest available matches for " : "No available matches for "}<strong className="text-white">{subcategory}</strong>.</p> : null}
        {subcategory && !products.length && !unavailable ? <BrowseResultsLink href={parentCategoryHref} target="heading" className="mt-2 inline-flex min-h-11 items-center font-bold text-cyan-200 underline">
          Back to {selectedLabel ?? "all Browse results"}
        </BrowseResultsLink> : null}
        {relatedDeviceRewardsOnly ? <p role="status" className="mt-3 text-sm text-cyan-100">No pictured {subcategory.toLowerCase()} match. The options below are related retailer gift cards.</p> : null}

        {showGroceryInspiration ? <div id="more-groceries" className="mt-4" style={{ scrollMarginTop: "calc(var(--site-header-height, 149px) + 12px)" }}><h2 className="text-2xl font-black leading-tight tracking-tight">More groceries &amp;<span className="block sm:inline"> rewards</span></h2></div> : null}
        {invalidSearch ? <p role="alert" className="mt-4 text-sm font-bold text-orange-100">Try a search such as “Amazon gift card” or “headphones.”</p> : searchTooLong ? <p role="alert" className="mt-4 rounded-xl border border-orange-300/40 bg-orange-400/10 p-4 text-sm font-bold text-orange-100">Search is too long. Try a brand or product name.</p> : <div className={`${showGroceryInspiration ? "mt-2" : "mt-4"} flex flex-wrap items-center gap-x-3 gap-y-2`}>
          <p aria-live="polite" className="text-sm font-bold text-white/75">{endingSoon || products.length > batchSize
            ? tailBatch === 1 ? `Showing the last ${visibleProducts.length} of ${products.length} ${resultNoun}`
              : tailBatch ? `Showing ${tailStart + 1}–${tailEnd} of ${products.length} ${resultNoun}` : `Showing ${visibleProducts.length} of ${products.length} ${resultNoun}`
            : `${products.length} ${resultNoun} shown`}{searchBudgetLabel ? <span className="ml-2">· Prize value {searchBudgetLabel}</span> : requestedDenominations.size > 0 &&
              <span className="ml-2">· {includesLowerGiftCards ? <>Requested value {requestedValues} · Includes lower-value gift cards</> : <>Exact prize value: {requestedValues}</>}</span>}</p>
          {appliedFilters.length ? <ul aria-label="Applied filters" className="flex min-w-0 flex-wrap gap-1.5">
            {[...new Set(appliedFilters)].map(label => <li key={label} className="max-w-full rounded-full bg-[#d5f1ff] px-2.5 py-1 text-xs font-bold break-words text-[#123e68]">{label}</li>)}
          </ul> : null}
        </div>}
        {endingSoon ? <nav aria-label="Tickets remaining" className="mt-4 grid max-w-md grid-cols-4 gap-2">
          {[{ value: null, label: "All" }, ...endingSoonTicketRanges].map(range => {
            const params = new URLSearchParams(searchParamsForView);
            if (range.value) params.set("ticketsLeft", range.value);
            else params.delete("ticketsLeft");
            const selected = range.value === ticketsLeft;
            return <EndingSoonRangeLink key={range.value ?? "all"} href={`/browse?${params}#search-results`} selected={selected}
              className={`flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-1 text-xs font-extrabold sm:text-sm ${selected ? "bg-[#ff7800] text-[#061e3d]" : "bg-[#c8efff] text-[#123e68] hover:bg-cyan-100"}`}>
              {range.label}
            </EndingSoonRangeLink>;
          })}
        </nav> : null}
        {products.length ? (
          <section aria-label="Products" className={`mt-4 grid gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 ${searchTerm && products.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {visibleProducts.map(product => <BrowseProductCard key={product.slug} product={product}
              open={!hidden.has(product.slug)} returnHref={browseReturnHref}
              related={relatedRetailers.has(product.slug) || (deviceTopic && isGiftCardListing(product))} />)}
          </section>
        ) : null}
        {missingRequestedValues.length ? <p role="status" className="mt-3 text-sm text-amber-100">No matching prizes at {missingRequestedValues.join(" or ")} in these results.</p> : null}
        {searchTooLong || invalidSearch ? null : !hasOpenResults && savedMatches.length ? (
          <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(5,51,91,.96),rgba(0,24,55,.98))] p-7 shadow-[0_20px_65px_rgba(0,0,0,.3)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Already in your activity</p>
            <h2 className="mt-3 max-w-3xl break-words text-3xl font-black tracking-[-0.035em] sm:text-4xl">No open offers match “{searchTerm}” here.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">You have saved results for this search. Open your reward or purchase option below.</p>
            {savedOutsideFilters ? <h3 className="mt-4 text-sm font-bold text-cyan-200">
              {savedWithinFilters.size === 0 ? "Saved in your account · outside your filters" : "Saved in your account · includes results outside your filters"}
            </h3> : null}
            {filterRecovery}
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
        ) : matchingClosedPrize ? (
          <section className="mt-4 rounded-3xl border border-white/15 bg-white/6 p-4 sm:p-8" aria-label="Closed offering">
            <h2 className="text-2xl font-bold">{matchingClosedPrize.title} has closed</h2>
            <p className="mt-2 text-white/75">This prize matches your search. The pool has no open entries.</p>
            <Link className="mt-4 inline-flex min-h-11 items-center font-bold text-cyan-200 underline" href={productHrefWithBrowseReturn(matchingClosedPrize.slug, browseReturnHref + "#search-results")}>View the prize details</Link>
            <Link className="ml-4 inline-flex min-h-11 items-center font-bold text-cyan-200 underline" href="/browse#search-results">Browse available prizes</Link>
          </section>
        ) : searchTerm && !selectedCategory && !selectedRetailerGroup && directoryMatches.length && matchedProducts.length === 0 ? (
          <section className="mt-4 rounded-3xl border border-white/15 bg-white/6 p-4 text-center sm:p-8">
            <h2 className="break-words text-2xl font-bold">No current product listings match “{searchTerm}” yet.</h2>
            <p className="mt-2 text-white/65">Explore the matching retailer category above to see its directory and any available offers.</p>
            {filterRecovery}
          </section>
        ) : (activeFilters || selectedRetailerGroup) && (!searchTerm || matchedProducts.length) ? (
          <section className="mt-4 rounded-3xl border border-white/15 bg-white/6 p-4 text-center sm:p-8">
            <h2 className="text-2xl font-bold">{filters.retailer ? `No current ${filters.retailer} offer matches here.` : selectedRetailerGroup ? `No current ${selectedRetailerGroup.category} offers match here.` : "No products match these filters."}</h2>
            {filterRecovery ?? <p className="mt-2 text-white/65">{activeFilters ? "Try adjusting your filters to see more prizes." : "Choose another category to see more prizes."}</p>}
            {activeFilters && !filterRecovery ? <Link href={clearHref} className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#00132e]">Clear filters</Link> : null}
          </section>
        ) : searchTerm ? (
          <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(5,51,91,.96),rgba(0,24,55,.98))] p-7 shadow-[0_20px_65px_rgba(0,0,0,.3)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Nothing matched yet</p>
            <h2 className="mt-3 max-w-3xl break-words text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              {retryScope ? <>No “{searchTerm}” matches in {retryScope}.</> : <>We don&apos;t have “{searchTerm}” in the catalog yet.</>}
            </h2>
            {filterRecovery ?? <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              {retryScope
                ? "Try adjusting your search or filters, or tell us what you’d like to see in this category."
                : "We’re adding new rewards regularly, and what our customers ask for helps decide what comes next. Tell us what you’d love a chance to win."}
            </p>}
            <p className="mt-7 text-xl font-black sm:text-2xl">Shopping should never feel like a <span className="text-[#31e800]">loss.</span></p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <BrowseProductRequestLink href={requestHref} className="scroll-mt-[calc(var(--site-header-height,163px)+12px)] inline-flex min-h-12 items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e] hover:bg-[#62ff3b]" />
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
                <BrowseResultsLink returnAnchor="ending-first-last" target={offerLastShortcut ? undefined : "first-prize"} className={browseStyles.batchShortcut}
                  href={offerLastShortcut ? `/browse?${lastBatchParams}#prize-${products[products.length - batchSize].slug}` : firstBatchHref}>
                  {offerLastShortcut ? "Last 24" : "First 24"}
                </BrowseResultsLink>
              )}
              {nextProduct && <BrowseResultsLink returnAnchor="ending-next-prizes" className={browseStyles.morePrizes}
                href={`/browse?${nextBatchParams}#prize-${nextProduct.slug}`}>Next {nextCount} {nextCount === 1 ? "Prize" : "Prizes"}</BrowseResultsLink>}
              {showEndingSoonShortcuts && previousBatchHref !== firstBatchHref && <BrowseResultsLink returnAnchor="ending-previous-prizes" className={browseStyles.batchShortcut}
                href={previousBatchHref}>Previous {tailBatch ? Math.min(batchSize, tailStart) : batchSize}</BrowseResultsLink>}
            </div>
          ) : nextProduct && <BrowseResultsLink returnAnchor="browse-more-prizes" className={browseStyles.morePrizes}
            href={`/browse?${nextBatchParams}#prize-${nextProduct.slug}`}>Show {nextCount} more {nextCount === 1 ? "prize" : "prizes"}</BrowseResultsLink>}
        </section>}
        </BrowseDiscoveryBar>
        </div>
      </div>
    </div>
  );
  return <BrowseResultsSearchSession browseHref={searchHref} searchTerm={searchTerm} endingSoon={endingSoon}>{page}</BrowseResultsSearchSession>;
}
