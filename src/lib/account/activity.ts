export type ActivityStatus = "active" | "prize" | "completion" | "completed";
export type ActivityItem = {
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
};
export type AccountActivity = {
  isPreview: boolean;
  activity: ActivityItem[];
  activeCount: number | null;
  source: "stored" | "customer-empty" | "unavailable";
};

export const activityFilters = [
  ["all", "All"], ["active", "Still Open"], ["prize", "You Won"],
  ["completion", "Complete Purchase"], ["completed", "Completed"],
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
  return item.status === "prize" && item.rewardKind === "digital";
}
export function walletRewardHref(item: ActivityItem): string {
  return `/account/wallet?${new URLSearchParams({ reward: item.slug })}`;
}
/** This filters only the caller's server-authorized data; it never loads fixtures. */
export function walletRewards(state: AccountActivity): ActivityItem[] {
  return state.source === "unavailable" ? [] : state.activity.filter(isWalletReward);
}
export function activityHref(item: ActivityItem, destination: ActivityDestination = "/account/entries", filter: ActivityFilter = "all"): string {
  if (isWalletReward(item)) return walletRewardHref(item);
  const params = new URLSearchParams({ item: item.slug });
  if (destination === "/account/entries" && filter !== "all") params.set("filter", filter);
  return `${destination}?${params.toString()}`;
}
export const openEntriesHref = "/account/entries?filter=active";
export function activityPresentation(item: ActivityItem) {
  switch (item.status) {
    case "active": return { label: "Still Open", action: "View Entry", color: "text-cyan-300", background: "bg-[#154b74]" };
    case "prize": return { label: "Prize Ready", action: item.rewardKind === "digital" ? "View Gift Card" : "Claim Prize", color: "text-[#31ff83]", background: "bg-[#16703f]" };
    case "completion": return { label: "Complete Purchase", action: "Review Purchase", color: "text-[#ff8a45]", background: "bg-[#8c3d15]" };
    case "completed": return { label: "Completed", action: "View Details", color: "text-[#b5cce4]", background: "bg-[#154b74]" };
  }
}
