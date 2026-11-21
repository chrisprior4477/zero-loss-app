import Image from "next/image";
import type { ReactNode } from "react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { availabilityStatus, lightSurfaceAvailabilityColor } from "@/lib/catalog/availability";
import type { DemoProduct } from "@/lib/catalog/demo-products";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { BrowsePrizeLink } from "./BrowsePrizeLink";
import { DemoOutcomeLetter } from "@/components/catalog/DemoOutcomeLetter";

export type ProductCardMarkers = {
  corner?: ReactNode;
  artwork?: ReactNode;
  title?: ReactNode;
};

export function BrowseProductCard({ product, open, related = false, returnHref, markers }: {
  product: DemoProduct;
  open: boolean;
  related?: boolean;
  returnHref: string;
  markers?: ProductCardMarkers;
}) {
  const status = availabilityStatus(product.capacity, product.sold);
  const anchor = "prize-" + product.slug;
  const cardClass = "group flex h-full flex-col p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-500 sm:p-4";
  const card = <>
    <div className="relative aspect-[1.28/1] overflow-hidden rounded-xl bg-[#f1f4f7]">
      <Image src={product.gallery[0].src} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-2 transition-transform group-hover:scale-105" />
      {markers?.artwork}
      {open && <DemoOutcomeLetter product={product.slug} />}
    </div>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#005fae] sm:text-xs">{product.retailer}</p>
    {markers?.title ? <div className="mt-1 flex items-start justify-between gap-1.5"><h2 className="line-clamp-2 min-w-0 text-sm font-extrabold leading-5 sm:text-base">{product.title}</h2>{markers.title}</div>
      : <h2 className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 sm:text-base">{product.title}</h2>}
    {related ? <p className="my-2 text-xs leading-4 text-slate-600">Related retailer gift card · Check retailer product availability.</p> : null}
    {open ? <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-200 pt-3 text-xs">
      <span><strong className="block text-sm">${product.entryPrice.toFixed(2)}</strong>per entry</span>
      <span className="text-right text-slate-500"><strong className="block" style={{ color: lightSurfaceAvailabilityColor(status.percentFilled) }}>{status.remaining.toLocaleString()} left</strong>${product.value.toLocaleString()} value</span>
    </div> : <p className="mt-auto border-t border-slate-200 pt-3 text-xs font-bold text-slate-600">No open entries</p>}
  </>;
  return <article id={anchor} tabIndex={-1} style={{ scrollMarginTop: "calc(var(--site-header-height, 149px) + 12px)" }}
    className="relative overflow-hidden rounded-2xl bg-white text-[#00132e] shadow-[0_18px_42px_rgba(0,0,0,.18)]">
    {open ? <>
      <BrowsePrizeLink href={productHrefWithBrowseReturn(product.slug, returnHref + "#" + anchor)} anchor={anchor} className={cardClass}>{card}</BrowsePrizeLink>
      <FavoriteButton itemName={product.title} itemHref={"/items/" + product.slug} size="large" className="absolute right-5 top-5 z-10" />
    </> : <div className={cardClass}>{card}</div>}
    {markers?.corner}
  </article>;
}
