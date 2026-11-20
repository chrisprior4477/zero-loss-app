import Link from "next/link";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import { redirect } from "next/navigation";
import { activityHref, declinedOfferHref, filterActivity, findActivityItem, isWalletReward, openPrizeOptions, walletRewardHref, type AccountActivity, type ActivityDestination, type ActivityFilter } from "@/lib/account/activity";
import { ActivityDetailDialog } from "./ActivityDetailDialog";
import type { ActivityOfferMetrics } from "@/lib/account/activity-progress";

/** Resolve the requested item only against data already authorized by the server. */
export function ActivitySelection({ state, selectedSlug, selectedEntryId, destination, filter = "all", metricsBySlug, outcomeEmailPreference, returnToOptions = false, resumePurchase = false }: {
  state: AccountActivity;
  selectedSlug?: string;
  selectedEntryId?: string;
  destination: ActivityDestination;
  filter?: ActivityFilter;
  metricsBySlug?: Record<string, ActivityOfferMetrics>;
  outcomeEmailPreference?: boolean | null;
  returnToOptions?: boolean;
  resumePurchase?: boolean;
}) {
  if (!selectedSlug && !selectedEntryId) return null;
  const item = findActivityItem(state.activity, selectedSlug, selectedEntryId, filter);
  if (!item && selectedSlug && !selectedEntryId && state.source !== "unavailable") {
    const matches = filterActivity(state.activity, filter).filter(record => record.slug === selectedSlug);
    if (matches.length > 1) return <section className="mt-4 rounded-xl border border-white/10 p-4">
      <AccountSettingsLandingScroll target="matching-activity" initialTarget="matching-activity" focusTarget="matching-activity" allScreens settleAfterNavigation />
      <h2 id="matching-activity" tabIndex={-1} className="font-black">Choose a ticket for {matches[0].title}</h2>
      <ul className="mt-2 space-y-1">{matches.map((record, index) => <li key={record.entryId ?? record.rewardId ?? index}>
        <Link className="inline-flex min-h-11 items-center font-bold text-cyan-300 underline" href={activityHref(record, destination, filter)}>Open ticket {index + 1}</Link>
      </li>)}</ul>
    </section>;
  }
  // Keep previously shared detail URLs working, without the old second panel.
  if (item && isWalletReward(item) && state.source !== "unavailable") redirect(walletRewardHref(item));
  if (item?.completionOptionStatus === "declined") redirect(declinedOfferHref(item.completionOptionId));
  if (item?.entryId && openPrizeOptions([item], item.slug).length && state.isPreview && state.source !== "unavailable") {
    redirect(`/account/purchase-options/${encodeURIComponent(item.slug)}?option=${encodeURIComponent(item.entryId)}`);
  }
  if (item?.status === "active" && item.entryId) redirect(activityHref(item, destination, filter));
  return item ? <ActivityDetailDialog key={item.entryId ?? item.slug} item={item} destination={destination} filter={filter} offerMetrics={metricsBySlug?.[item.slug]} outcomeEmailPreference={outcomeEmailPreference} returnToOptions={returnToOptions && item.status === "completion"} resumePurchase={resumePurchase && item.status === "completion"} /> : <p role="status" className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-sm text-[#b5cce4]">That activity is not available in your account.</p>;
}
