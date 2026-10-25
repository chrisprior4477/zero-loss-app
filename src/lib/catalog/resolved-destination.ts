import { activityHref, isWalletReward, walletRewardHref, type AccountActivity } from "@/lib/account/activity";

/** Resolve only records already authorized for the current account. */
export function resolvedProductDestination(state: AccountActivity | null | undefined, slug: string) {
  if (!state || state.source === "unavailable") return null;
  const outcomes = state.activity.filter(item => item.slug === slug && item.status !== "active");
  if (!outcomes.length) return null;
  const rewards = outcomes.filter(isWalletReward);
  const unclaimed = rewards.filter(item => item.rewardId && item.rewardStatus === "ready" && !item.rewardClaimedAt);
  if (unclaimed.length === 1) return {
    href: walletRewardHref(unclaimed[0]), label: "Claim your reward", status: "Ready to claim",
    description: "Your reward is ready to claim. Open it to continue where you left off.",
  };
  if (unclaimed.length > 1) return {
    href: "/account/wallet", label: "View your rewards", status: "Rewards to claim",
    description: "Your rewards are saved in Gift Cards & Rewards. Open them to continue claiming.",
  };
  const options = outcomes.filter(item => item.status === "completion" && (!item.completionOptionStatus || item.completionOptionStatus === "available"));
  if (options.length) return {
    href: `/account/purchase-options/${encodeURIComponent(slug)}`,
    label: options.length === 1 ? "View your purchase option" : "View your purchase options",
    status: options.length === 1 ? "Purchase option" : "Purchase options",
    description: "Your purchase options for this item are saved. Review them whenever you’re ready.",
  };
  if (rewards.length) return {
    href: rewards.length === 1 ? walletRewardHref(rewards[0]) : "/account/wallet",
    label: rewards.length === 1 ? "View your reward" : "View your rewards", status: "View your reward",
    description: "Your reward is saved in Gift Cards & Rewards. Open it to see its details and current status.",
  };
  const declined = outcomes.every(item => item.completionOptionStatus === "declined");
  return {
    href: declined ? "/account/declined-offers" : outcomes.length === 1 ? activityHref(outcomes[0]) : "/account/entries?filter=completed",
    label: declined ? "Review your declined offers" : "View your saved result", status: "View your result",
    description: "Your result is saved. Open it to review the details.",
  };
}
