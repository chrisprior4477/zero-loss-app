export type ActivityStatus = "active" | "prize" | "completion" | "completed";
export type CompletionOptionStatus = "available" | "declined" | "purchased" | "expired" | "cancelled";
export type RewardStatus = "ready" | "redeemed" | "expired" | "cancelled" | "issuance_pending" | "issuance_failed";
export type ActivityItem = {
  entryId?: string | null;
  slug: string;
  title: string;
  retailer: string;
  image: string;
  status: ActivityStatus;
  rewardKind: "physical" | "digital";
  priceCents: number;
  paidCents: number;
  remainingCents: number;
  availability: string;
  completionOptionId?: string | null;
  completionOptionStatus?: CompletionOptionStatus | null;
  completionExpiresAt?: string | null;
  rewardStatus?: RewardStatus | null;
  rewardId?: string | null;
  rewardClaimExpiresAt?: string | null;
  rewardClaimedAt?: string | null;
};
export type AccountActivity = {
  isPreview: boolean;
  activity: ActivityItem[];
  activeCount: number | null;
  source: "stored" | "customer-empty" | "unavailable";
};

export const activityFilters = [
  ["all", "All"], ["active", "Still Open"], ["prize", "You Won"],
  ["completion", "Purchase Options"], ["completed", "Completed"],
] as const;
export type ActivityFilter = typeof activityFilters[number][0];
export function activityFilter(value: unknown): ActivityFilter {
  return activityFilters.find(([key]) => key === value)?.[0] ?? "all";
}
export function filterActivity(items: ActivityItem[], filter: ActivityFilter): ActivityItem[] {
  return filter === "all" ? items : items.filter(item => item.status === filter);
}
export type ActivityDestination = "/account" | "/account/entries";
export const walletHistoryHref = "/account/wallet?view=history";
export function isWalletReward(item: ActivityItem): boolean {
  return item.rewardKind === "digital" && (item.status === "prize" || Boolean(item.rewardStatus));
}
export function walletRewardHref(item: Pick<ActivityItem, "slug" | "rewardId">): string {
  const params = new URLSearchParams({ reward: item.slug });
  if (item.rewardId) params.set("rewardId", item.rewardId);
  return `/account/wallet?${params}`;
}
/** This filters only the caller's server-authorized data; it never loads fixtures. */
export function walletRewards(state: AccountActivity): ActivityItem[] {
  return state.source === "unavailable" ? [] : state.activity.filter(isWalletReward);
}
export function readyWalletRewards(state: AccountActivity): ActivityItem[] {
  return walletRewards(state).filter(item => !["redeemed", "expired", "cancelled", "issuance_pending", "issuance_failed"].includes(item.rewardStatus ?? "ready"));
}
export function activityHref(item: ActivityItem, destination: ActivityDestination = "/account/entries", filter: ActivityFilter = "all"): string {
  if (isWalletReward(item)) return walletRewardHref(item);
  const params = new URLSearchParams({ item: item.slug });
  if (item.entryId) params.set("entry", item.entryId);
  if (destination === "/account/entries" && filter !== "all") params.set("filter", filter);
  return `${destination}?${params.toString()}`;
}
/** A legacy product-only URL is usable only when it identifies one authorized record. */
export function findActivityItem(items: ActivityItem[], selectedSlug?: string, selectedEntryId?: string, filter: ActivityFilter = "all"): ActivityItem | undefined {
  if (selectedEntryId) return items.find(item => item.entryId === selectedEntryId && (!selectedSlug || item.slug === selectedSlug));
  if (!selectedSlug) return undefined;
  const matches = items.filter(item => item.slug === selectedSlug && (filter === "all" || item.status === filter));
  return matches.length === 1 ? matches[0] : undefined;
}
export const openEntriesHref = "/account/entries?filter=active";
export function activityPresentation(item: ActivityItem) {
  switch (item.status) {
    case "active": return { label: "Still Open", action: "View Entry", color: "text-cyan-300", background: "bg-[#154b74]" };
    case "prize": return { label: "Prize Ready", action: item.rewardKind === "digital" ? "View Gift Card" : "Claim Prize", color: "text-[#31ff83]", background: "bg-[#16703f]" };
    case "completion": return { label: "Purchase Option", action: "Review Option", color: "text-[#ff8a45]", background: "bg-[#8c3d15]" };
    case "completed": return { label: "Completed", action: "View Details", color: "text-[#b5cce4]", background: "bg-[#154b74]" };
  }
}
