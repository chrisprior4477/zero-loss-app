"use client";

import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { useFavorites } from "./FavoritesProvider";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import type { AvailabilitySnapshot } from "@/lib/catalog/availability";

export function FavoritesView({ availability }: { availability: AvailabilitySnapshot | null }) {
  const { slugs, available } = useFavorites();

  return <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Saved for later</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Favorites</h1><p className="mt-2 text-white/70">The products you picked out, together in one place.</p></div><Link href="/browse" className="text-sm font-bold text-cyan-300 hover:text-white">Browse all products →</Link></div>

      {!available ? <section role="alert" className="mt-8 rounded-2xl border border-amber-300/40 bg-[#30251b] p-5 text-sm leading-6">Favorites couldn’t be loaded right now. Refresh to try again; nothing has been removed.</section>
        : slugs.length === 0 ? <section className="mt-8 rounded-2xl border border-cyan-300/30 bg-[#082848] p-7 sm:p-10"><span aria-hidden="true" className="text-4xl text-[#31e800]">♡</span><h2 className="mt-3 text-2xl font-black">Nothing saved yet</h2><p className="mt-2 max-w-lg text-sm leading-6 text-white/70">Tap the heart on any product to keep it here. Favorites save items to revisit; they don’t place an entry or reserve a prize.</p><Link href="/browse" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 text-sm font-extrabold text-[#002719]">Find a product →</Link></section>
        : <section aria-label="Favorite products" className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {slugs.map(slug => {
            const product = getDemoProduct(slug);
            const current = availability?.[slug];
            return <article key={slug} className="relative overflow-hidden rounded-2xl bg-white text-[#00132e] shadow-[0_18px_42px_rgba(0,0,0,.18)]">
              {product ? <Link href={`/items/${slug}`} className="group flex h-full flex-col p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-500 sm:p-4">
                <div className="relative aspect-[1.28/1] overflow-hidden rounded-xl bg-[#f1f4f7]"><Image src={product.gallery[0].src} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2 transition-transform group-hover:scale-105" /></div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[.1em] text-[#087feb] sm:text-xs">{product.retailer}</p><h2 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 sm:text-base">{product.title}</h2>
                <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200 pt-3 text-xs"><span><strong className="block text-sm">${((current?.entryPriceCents ?? product.entryPrice * 100) / 100).toFixed(2)}</strong>per entry</span><span className="text-right font-bold text-[#e34c16]">{(current?.remaining ?? Math.max(0, product.capacity - product.sold)).toLocaleString()} left</span></div>
              </Link> : <div className="flex min-h-48 flex-col justify-center p-5"><h2 className="pr-8 font-bold">Product unavailable</h2><p className="mt-2 text-xs text-slate-600">This saved item is no longer in the current catalog. You can remove it from Favorites.</p></div>}
              <FavoriteButton itemName={product?.title ?? "this product"} itemHref={`/items/${slug}`} size="large" className="absolute right-5 top-5 z-10" />
            </article>;
          })}
        </section>}
    </div>
  </main>;
}
