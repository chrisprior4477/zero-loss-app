import Image from "next/image";
import Link from "next/link";
import { activityHref, activityPresentation, type ActivityDestination, type ActivityFilter, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";

/** Shared mobile rows become a four-card gallery on desktop; the drawer is separate. */
export function ActivityRows({ items, destination = "/account/entries", filter = "all", compact = false }: {
  items: ActivityItem[];
  destination?: ActivityDestination;
  filter?: ActivityFilter;
  compact?: boolean;
}) {
  return <div data-activity-gallery className={`grid lg:grid-cols-4 lg:gap-3 ${compact ? "gap-2" : "gap-3"}`}>
    {items.map(item => {
      const style = activityPresentation(item);
      return <Link key={item.entryId ?? item.slug} href={activityHref(item, destination, filter)} scroll={item.status === "prize" && item.rewardKind === "digital"} data-activity-slug={item.slug} data-activity-entry-id={item.entryId ?? undefined}
        className={`group grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-2xl border border-white/10 bg-[#06223d] p-4 transition hover:border-cyan-300/50 hover:bg-[#0c304e] focus-visible:outline-2 focus-visible:outline-cyan-300 lg:flex lg:min-w-0 lg:flex-col lg:items-stretch lg:gap-3 lg:p-4 ${compact ? "sm:grid-cols-[64px_minmax(0,1fr)_210px] sm:px-5" : "sm:grid-cols-[88px_minmax(0,1fr)_210px] sm:gap-5 sm:p-5"}`}>
        <span className={`relative h-16 w-16 overflow-hidden rounded-xl lg:h-28 lg:w-full lg:shrink-0 ${compact ? "" : "sm:h-[88px] sm:w-[88px]"} ${style.background}`}>
          <Image src={item.image} alt="" fill sizes={compact ? "(min-width: 1024px) 240px, 64px" : "(min-width: 1024px) 260px, (min-width: 640px) 88px, 64px"} className="object-contain p-2 lg:p-3" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold text-[#b5cce4]">{item.retailer}</span>
          <strong className={`mt-1 block break-words text-base leading-6 text-white lg:text-base lg:leading-5 ${compact ? "sm:text-lg" : "sm:text-xl"}`}>{item.title}</strong>
          {item.status === "prize" && item.rewardKind === "digital" ? <span className="mt-1 block text-xs text-[#b5cce4] lg:text-[11px]">Digital gift-card reward · {formatUsdFromCents(item.priceCents)}</span> : null}
        </span>
        <span className="col-span-2 flex items-center justify-between gap-4 border-t border-white/10 pt-3 sm:col-span-1 sm:block sm:border-0 sm:pt-0 sm:text-right lg:mt-auto lg:grid lg:min-h-[57px] lg:grid-cols-[minmax(0,1fr)_auto] lg:content-start lg:items-start lg:gap-x-2 lg:gap-y-1 lg:border-t lg:pt-3 lg:text-left">
          <span className={`block text-xs font-black uppercase tracking-wide lg:contents ${style.color}`}><span className="block lg:text-[11px] lg:leading-5 lg:tracking-normal">{style.label}</span>
            {item.status === "completion" ? <span className="mt-1 block font-medium normal-case tracking-normal text-[#b5cce4] lg:col-span-2 lg:row-start-2 lg:mt-0 lg:leading-5">{formatUsdFromCents(item.remainingCents)} remaining · {formatUsdFromCents(item.paidCents)} applied</span> : null}
          </span>
          <strong className="block shrink-0 text-sm text-white sm:mt-2 lg:col-start-2 lg:row-start-1 lg:mt-0 lg:text-xs lg:leading-5">{item.status === "completion" ? <>Review<span className="lg:hidden"> Purchase</span></> : item.status === "active" ? <>View<span className="lg:hidden"> Entry</span></> : style.action} <span aria-hidden="true" className="ml-1 text-cyan-300">›</span></strong>
        </span>
      </Link>;
    })}
  </div>;
}
