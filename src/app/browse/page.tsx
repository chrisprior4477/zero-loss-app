import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { demoProducts } from "@/lib/catalog/demo-products";
import {
  marketplaceCategories,
  marketplaceCategoryId,
  productMatchesMarketplaceCategory,
} from "@/lib/catalog/navigation";
import { searchCatalogMatches } from "@/lib/catalog/search";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { availabilityStatus } from "@/lib/catalog/availability";
import { RetailerCategoryNav } from "@/components/catalog/RetailerCategoryNav";
import { BrowseFilters } from "@/components/catalog/BrowseFilters";
import { browseRetailers, filterBrowseProducts, parseBrowseFilterState, retailerFilterGroups } from "@/lib/catalog/browse-filters";
import { getGiftCardPartnerGroups } from "@/lib/catalog/gift-card-partners-reader";
import { searchRetailerDirectory } from "@/lib/catalog/retailer-directory-search";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { getAccountContext } from "@/lib/account/context";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";

export const metadata: Metadata = {
  title: "Browse",
};

type BrowsePageProps = {
  searchParams: Promise<{ category?: string; sort?: string; subcategory?: string; q?: string | string[]; type?: string; retailer?: string; partnerCategory?: string; available?: string; minValue?: string; maxValue?: string }>;
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const query = await searchParams;
  const [availability, partnerGroups, account] = await Promise.all([getOfferingAvailability(), getGiftCardPartnerGroups(), getAccountContext()]);
  const resolved = new Set(resolvedCatalogSlugs(account?.activity));
  const availableProducts = demoProducts.filter(product => !resolved.has(product.slug)).map(product => {
    const current = availability?.[product.slug];
    return current ? { ...product, capacity: current.capacity, sold: current.sold, entryPrice: current.entryPriceCents / 100 } : product;
  });
  const searchTerm = (Array.isArray(query.q) ? query.q[0] : query.q)?.trim() ?? "";
  const selectedCategory = marketplaceCategoryId(query.category ?? (query.sort === "ending-soon" ? "ending-soon" : ""));
  const selectedLabel = marketplaceCategories.find((category) => category.id === selectedCategory)?.label;
  const categoryProducts = availableProducts.filter((product) => !selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory));
  const retailers = browseRetailers(categoryProducts);
  const retailerGroups = retailerFilterGroups(partnerGroups, categoryProducts);
  const selectedRetailerGroup = retailerGroups.find(group => group.id === query.partnerCategory) ?? null;
  const directoryMatches = searchTerm ? searchRetailerDirectory(retailerGroups, searchTerm) : [];
  const filters = parseBrowseFilterState(query, [...retailers, ...retailerGroups.flatMap(group => group.options.map(option => option.value))]);
  const showAllLayout = !selectedCategory && !selectedRetailerGroup && !searchTerm && !filters.retailer;
  const searchMatches = searchTerm ? searchCatalogMatches(categoryProducts, searchTerm) : [];
  const relatedRetailers = new Set(searchMatches.filter(match => match.kind === "retailer").map(match => match.product.slug));
  const matchedProducts = searchTerm ? searchMatches.map(match => match.product) : categoryProducts;
  const allowedRetailers = selectedRetailerGroup
    ? new Set(selectedRetailerGroup.options.filter(option => option.hasOffer).map(option => option.value))
    : undefined;
  const products = filterBrowseProducts(matchedProducts, filters, searchTerm, selectedCategory === "ending-soon", allowedRetailers);
  const activeFilters = filters.type !== "all" || Boolean(filters.retailer) || filters.availableOnly
    || Boolean(selectedRetailerGroup)
    || filters.minValue !== null || filters.maxValue !== null
    || (filters.sort !== "featured" && !(selectedCategory === "ending-soon" && filters.sort === "fewest-left"));
  const requestHref = `/contact/product-request?${new URLSearchParams({ product: searchTerm })}`;
  const allSearchHref = `/browse?${new URLSearchParams({ q: searchTerm })}`;
  const clearHrefParams = new URLSearchParams();
  if (selectedCategory) clearHrefParams.set("category", selectedCategory);
  if (searchTerm) clearHrefParams.set("q", searchTerm);
  if (query.subcategory) clearHrefParams.set("subcategory", query.subcategory);
  const clearHref = `/browse${clearHrefParams.size ? `?${clearHrefParams}` : ""}`;
  const returnParams = new URLSearchParams();
  for (const key of ["category", "sort", "subcategory", "type", "retailer", "partnerCategory", "available", "minValue", "maxValue"] as const) {
    const value = query[key];
    if (value) returnParams.set(key, value);
  }
  if (searchTerm) returnParams.set("q", searchTerm);
  const browseReturnHref = `/browse${returnParams.size ? `?${returnParams}` : ""}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Zero Loss Marketplace</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{searchTerm ? "Search results" : selectedLabel ?? selectedRetailerGroup?.category ?? "Browse every product"}</h1>
            <p className="mt-2 text-white/65">
              {searchTerm
                ? <>{products.length} {products.length === 1 ? "product" : "products"}{directoryMatches.length ? ` · ${directoryMatches.length} matching retailer ${directoryMatches.length === 1 ? "category" : "categories"}` : ""} for <strong className="text-white">“{searchTerm}”</strong></>
                : "Choose a product to see its entry details and current availability."}
            </p>
          </div>
          <Link href="/" className="font-bold text-cyan-300 hover:text-white">← Marketplace home</Link>
        </div>

        <RetailerCategoryNav key={`${selectedCategory}-${selectedRetailerGroup?.id}-${searchTerm}-${filters.retailer}-${filters.type}-${filters.availableOnly}-${filters.sort}-${filters.minValue}-${filters.maxValue}`} groups={retailerGroups} selectedGroupId={selectedRetailerGroup?.id ?? ""} selectedCategory={selectedCategory} filters={filters} searchTerm={searchTerm} subcategory={query.subcategory ?? ""} collapseByDefault={!showAllLayout} />

        {directoryMatches.length ? (
          <section aria-label="Matching retailer categories" className="mt-5 rounded-2xl border border-cyan-300/35 bg-[#061e3d] p-4 sm:p-5">
            <h2 className="text-sm font-black uppercase tracking-[.1em] text-cyan-200">Matching retailer categories</h2>
            <p className="mt-1 text-sm text-white/65">Explore the retailer directory. Current offers are marked separately.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {directoryMatches.map(group => (
                <Link key={group.id} href={`/browse?${new URLSearchParams({ partnerCategory: group.id })}`} className="inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-[#00132e] hover:bg-cyan-200">{group.category} →</Link>
              ))}
            </div>
          </section>
        ) : null}

        {query.subcategory ? <p className="mt-4 text-sm text-white/55">Showing the closest available matches for <strong className="text-white">{query.subcategory}</strong>.</p> : null}

        <div className={showAllLayout ? "mt-5 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-6" : "mt-3"}>
          <BrowseFilters filters={filters} retailerGroups={retailerGroups} selectedRetailerGroup={selectedRetailerGroup} selectedCategory={selectedCategory} searchTerm={searchTerm} subcategory={query.subcategory ?? ""} clearHref={clearHref} collapseOnDesktop={!showAllLayout} />
          <div className="min-w-0">
            <p aria-live="polite" className={`mt-4 text-sm font-bold text-white/75 ${showAllLayout ? "lg:mt-0" : ""}`}>{products.length} {products.length === 1 ? "product" : "products"} shown</p>
        {products.length ? (
          <section aria-label="Products" className={`mt-4 grid gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 ${searchTerm && products.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {products.map((product) => {
              const status = availabilityStatus(product.capacity, product.sold);
              return (
                <article key={product.slug} className="relative overflow-hidden rounded-2xl bg-white text-[#00132e] shadow-[0_18px_42px_rgba(0,0,0,.18)]">
                  <Link href={productHrefWithBrowseReturn(product.slug, browseReturnHref)} className="group flex h-full flex-col p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-500 sm:p-4">
                    <div className="relative aspect-[1.28/1] overflow-hidden rounded-xl bg-[#f1f4f7]">
                      <Image src={product.gallery[0].src} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2 transition-transform group-hover:scale-105" />
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#087feb] sm:text-xs">{product.retailer}</p>
                    <h2 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 sm:text-base">{product.title}</h2>
                    {relatedRetailers.has(product.slug) ? <p className="my-2 text-xs leading-4 text-slate-600">Related retailer gift card · Check retailer product availability.</p> : null}
                    <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
                      <span><strong className="block text-sm">${product.entryPrice.toFixed(2)}</strong>per entry</span>
                      <span className="text-right text-slate-500"><strong className="block" style={{ color: status.color }}>{status.remaining === 0 ? "Pool full" : `${status.remaining.toLocaleString()} left`}</strong>${product.value.toLocaleString()} value</span>
                    </div>
                  </Link>
                  <FavoriteButton itemName={product.title} itemHref={`/items/${product.slug}`} size="large" className="absolute right-5 top-5 z-10" />
                </article>
              );
            })}
          </section>
        ) : searchTerm && directoryMatches.length && matchedProducts.length === 0 ? (
          <section className="mt-4 rounded-3xl border border-white/15 bg-white/6 p-8 text-center">
            <h2 className="text-2xl font-bold">No current product listings match “{searchTerm}” yet.</h2>
            <p className="mt-2 text-white/65">Explore the matching retailer category above to see its directory and any available offers.</p>
          </section>
        ) : activeFilters && (!searchTerm || matchedProducts.length) ? (
          <section className="mt-4 rounded-3xl border border-white/15 bg-white/6 p-8 text-center">
            <h2 className="text-2xl font-bold">{filters.retailer ? `No current ${filters.retailer} offer matches here.` : selectedRetailerGroup ? `No current ${selectedRetailerGroup.category} offers match here.` : "No products match these filters."}</h2>
            <p className="mt-2 text-white/65">The partner directory is subject to availability. Try another retailer or clear your filters.</p>
            <Link href={clearHref} className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#00132e]">Clear filters</Link>
          </section>
        ) : searchTerm ? (
          <section className="mt-8 overflow-hidden rounded-3xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(5,51,91,.96),rgba(0,24,55,.98))] p-7 shadow-[0_20px_65px_rgba(0,0,0,.3)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Nothing matched yet</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.035em] sm:text-4xl">
              {selectedCategory ? <>No “{searchTerm}” matches in {selectedLabel}.</> : <>We don&apos;t have “{searchTerm}” in the catalog yet.</>}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              {selectedCategory
                ? "Try all search results, or tell us what you’d like to see in this category."
                : "We’re adding new rewards regularly, and what our customers ask for helps decide what comes next. Tell us what you’d love a chance to win."}
            </p>
            <p className="mt-7 text-xl font-black sm:text-2xl">Shopping should never feel like a <span className="text-[#31e800]">loss.</span></p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {selectedCategory ? <Link href={allSearchHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#00132e] hover:bg-cyan-200">See all search results</Link> : null}
              <Link href={requestHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 font-black text-[#00132e] hover:bg-[#62ff3b]">Tell us what you&apos;d like to see →</Link>
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
          </div>
        </div>
      </div>
    </main>
  );
}
