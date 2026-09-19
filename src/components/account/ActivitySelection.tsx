import { redirect } from "next/navigation";
import { findActivityItem, isWalletReward, walletRewardHref, type AccountActivity, type ActivityDestination, type ActivityFilter } from "@/lib/account/activity";
import { ActivityDetailDialog } from "./ActivityDetailDialog";

/** Resolve the requested item only against data already authorized by the server. */
export function ActivitySelection({ state, selectedSlug, selectedEntryId, destination, filter = "all" }: {
  state: AccountActivity;
  selectedSlug?: string;
  selectedEntryId?: string;
  destination: ActivityDestination;
  filter?: ActivityFilter;
}) {
  if (!selectedSlug && !selectedEntryId) return null;
  const item = findActivityItem(state.activity, selectedSlug, selectedEntryId, filter);
  // Keep previously shared detail URLs working, without the old second panel.
  if (item && isWalletReward(item) && state.source !== "unavailable") redirect(walletRewardHref(item));
  return item ? <ActivityDetailDialog key={item.entryId ?? item.slug} item={item} destination={destination} filter={filter} /> : <p role="status" className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-sm text-[#b5cce4]">That activity is not available in your account.</p>;
}
