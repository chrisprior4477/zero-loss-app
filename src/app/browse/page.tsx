import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { demoProducts } from "@/lib/catalog/demo-products";
import {
  marketplaceCategories,
  marketplaceCategoryHref,
  marketplaceCategoryId,
  productMatchesMarketplaceCategory,
} from "@/lib/catalog/navigation";

export const metadata: Metadata = {
  title: "Browse",
};

type BrowsePageProps = {
  searchParams: Promise<{ category?: string; sort?: string; subcategory?: string }>;
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const query = await searchParams;
  const selectedCategory = marketplaceCategoryId(query.category ?? (query.sort === "ending-soon" ? "ending-soon" : ""));
  const selectedLabel = marketplaceCategories.find((category) => category.id === selectedCategory)?.label;
  const products = demoProducts
    .filter((product) => !selectedCategory || productMatchesMarketplaceCategory(product, selectedCategory))
    .sort((left, right) => query.sort === "ending-soon" || selectedCategory === "ending-soon"
      ? (left.capacity - left.sold) - (right.capacity - right.sold)
      : left.title.localeCompare(right.title));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Zero Loss Marketplace</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">{selectedLabel ?? "Browse every product"}</h1>
            <p className="mt-2 text-white/65">Choose a product to see its entry details and current availability.</p>
          </div>
          <Link href="/" className="font-bold text-cyan-300 hover:text-white">← Marketplace home</Link>
        </div>

        <nav aria-label="Browse categories" className="zl-noscroll mt-7 flex gap-2 overflow-x-auto pb-2">
          <Link href="/browse" className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${!selectedCategory ? "border-cyan-300 bg-cyan-300 text-[#00132e]" : "border-white/20 text-white hover:border-cyan-300"}`}>All</Link>
          {marketplaceCategories.map((category) => (
            <Link key={category.id} href={marketplaceCategoryHref(category.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${selectedCategory === category.id ? "border-cyan-300 bg-cyan-300 text-[#00132e]" : "border-white/20 text-white hover:border-cyan-300"}`}>{category.label}</Link>
          ))}
        </nav>

        {query.subcategory ? <p className="mt-4 text-sm text-white/55">Showing the closest available matches for <strong className="text-white">{query.subcategory}</strong>.</p> : null}

        {products.length ? (
          <section aria-label="Products" className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => {
              const remaining = Math.max(0, product.capacity - product.sold);
              return (
                <article key={product.slug} className="overflow-hidden rounded-2xl bg-white text-[#00132e] shadow-[0_18px_42px_rgba(0,0,0,.18)]">
                  <Link href={`/items/${product.slug}`} className="group flex h-full flex-col p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-500 sm:p-4">
                    <div className="relative aspect-[1.28/1] overflow-hidden rounded-xl bg-[#f1f4f7]">
                      <Image src={product.gallery[0].src} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2 transition-transform group-hover:scale-105" />
                    </div>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#087feb] sm:text-xs">{product.retailer}</p>
                    <h2 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 sm:text-base">{product.title}</h2>
                    <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
                      <span><strong className="block text-sm">${product.entryPrice.toFixed(2)}</strong>per entry</span>
                      <span className="text-right text-slate-500"><strong className="block text-[#e34c16]">{remaining.toLocaleString()} left</strong>${product.value.toLocaleString()} value</span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-white/15 bg-white/6 p-8 text-center">
            <h2 className="text-2xl font-bold">This category is ready for inventory.</h2>
            <p className="mt-2 text-white/65">No preview products are assigned here yet. Browse all current products instead.</p>
            <Link href="/browse" className="mt-5 inline-flex rounded-xl bg-cyan-300 px-5 py-3 font-black text-[#00132e]">View all products</Link>
          </section>
        )}
      </div>
    </main>
  );
}
