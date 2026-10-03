"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { useFavorites } from "./FavoritesProvider";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { availabilityStatus, type AvailabilitySnapshot } from "@/lib/catalog/availability";
import { setFavoriteCapacityAlert } from "@/lib/favorites/alert-actions";

export function FavoritesView({ availability, initialAlerts, emailEnabled }: { availability: AvailabilitySnapshot | null; initialAlerts: Record<string, boolean> | null; emailEnabled: boolean | null }) {
  const { slugs, available } = useFavorites();
  const [alerts, setAlerts] = useState(initialAlerts ?? {});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function toggleAlert(slug: string) {
    if (busySlug || !initialAlerts || emailEnabled === null) return;
    const enabled = !alerts[slug];
    setBusySlug(slug);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await setFavoriteCapacityAlert(slug, enabled);
        if (result.ok) setAlerts(current => ({ ...current, [slug]: enabled }));
        setMessage(result.message);
      } catch {
        setMessage("We couldn't confirm this change. Refresh and try again.");
      } finally {
        setBusySlug(null);
      }
    });
  }

  return <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Saved for later</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Favorites</h1><p className="mt-2 text-white/70">The products you picked out, together in one place.</p></div><Link href="/browse" className="text-sm font-bold text-cyan-300 hover:text-white">Browse all products →</Link></div>
      <p className="mt-3 text-sm text-white/75">Want a heads-up? Turn on an email for a saved item when its entry pool reaches 90% full. One email per item, not a reservation.</p>
      {emailEnabled === false ? <p className="mt-2 text-sm text-amber-200">Favorite emails are paused in <Link href="/account/notifications#favorite-alert-preference" className="underline">Notifications</Link>.</p> : null}
      {initialAlerts === null || emailEnabled === null ? <p role="status" className="mt-2 text-sm text-amber-200">Alert choices are unavailable right now. Your saved items are unchanged.</p> : null}
      {message ? <p role="status" className="mt-3 text-sm font-bold text-cyan-200">{message}</p> : null}

      {!available ? <section role="alert" className="mt-8 rounded-2xl border border-amber-300/40 bg-[#30251b] p-5 text-sm leading-6">Favorites couldn’t be loaded right now. Refresh to try again; nothing has been removed.</section>
        : slugs.length === 0 ? <section className="mt-8 rounded-2xl border border-cyan-300/30 bg-[#082848] p-7 sm:p-10"><span aria-hidden="true" className="text-4xl text-[#31e800]">♡</span><h2 className="mt-3 text-2xl font-black">Nothing saved yet</h2><p className="mt-2 max-w-lg text-sm leading-6 text-white/70">Tap the heart on any product to keep it here. Favorites save items to revisit; they don’t place an entry or reserve a prize.</p><Link href="/browse" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-5 text-sm font-extrabold text-[#002719]">Find a product →</Link></section>
        : <section aria-label="Favorite products" className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {slugs.map(slug => {
            const product = getDemoProduct(slug);
            const current = availability?.[slug];
            const status = product ? availabilityStatus(current?.capacity ?? product.capacity, current?.sold ?? product.sold) : null;
            return <article key={slug} className="relative flex flex-col overflow-hidden rounded-2xl bg-white text-[#00132e] shadow-[0_18px_42px_rgba(0,0,0,.18)]">
              {product ? <Link href={`/items/${slug}`} className="group flex flex-1 flex-col p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-500 sm:p-4">
                <div className="relative aspect-[1.28/1] overflow-hidden rounded-xl bg-[#f1f4f7]"><Image src={product.gallery[0].src} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2 transition-transform group-hover:scale-105" /></div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[.1em] text-[#087feb] sm:text-xs">{product.retailer}</p><h2 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 sm:text-base">{product.title}</h2>
                <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200 pt-3 text-xs"><span><strong className="block text-sm">${((current?.entryPriceCents ?? product.entryPrice * 100) / 100).toFixed(2)}</strong>per entry</span><span className="text-right font-bold" style={{ color: status?.color }}>{status?.remaining === 0 ? "Pool full" : `${status?.remaining.toLocaleString()} left`}</span></div>
              </Link> : <div className="flex min-h-48 flex-col justify-center p-5"><h2 className="pr-8 font-bold">Product unavailable</h2><p className="mt-2 text-xs text-slate-600">This saved item is no longer in the current catalog. You can remove it from Favorites.</p></div>}
              {product && status?.remaining !== 0 ? <div className="border-t border-slate-200 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
                <label className="flex cursor-pointer items-start gap-2 text-xs font-bold leading-4 sm:text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#007fba]" checked={Boolean(alerts[slug])} disabled={!initialAlerts || emailEnabled === null || pending || busySlug !== null} onChange={() => toggleAlert(slug)} aria-label={`Email me when ${product.title} is almost full`} />
                  <span>Email me at 90% full</span>
                </label>
              </div> : product ? <p className="border-t border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 sm:px-4">This pool is full; watchlist email unavailable.</p> : null}
              <FavoriteButton itemName={product?.title ?? "this product"} itemHref={`/items/${slug}`} size="large" className="absolute right-5 top-5 z-10" />
            </article>;
          })}
        </section>}
    </div>
  </main>;
}
