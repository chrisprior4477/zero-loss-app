import { formatUsdFromCents } from "@/lib/wallet/money";
import type { FulfillmentFilter } from "@/lib/account/fulfillment";

export type SupportDeposit = { key: string; id: string; amount: number };

export function depositSupportHref(key: string): string {
  return `/support?deposit=${encodeURIComponent(key)}#report-problem`;
}

export function rewardSupportHref(rewardId?: string | null, orderFilter: FulfillmentFilter = "all"): string {
  if (!rewardId) return "/support";
  const params = new URLSearchParams({ rewardId });
  if (orderFilter !== "all") params.set("orderFilter", orderFilter);
  return `/support?${params}#report-problem`;
}

/** Store the verified reference in the opening case message. */
export function supportReferencePrefix(rewardId = "", deposit?: SupportDeposit, transactionOrigin = "") {
  if (deposit) return `Deposit reference: ${deposit.id}\nDeposit amount: ${formatUsdFromCents(deposit.amount)} USD\n\n`;
  if (rewardId) return `Reward reference: ${rewardId}\n\n`;
  return /^(?:wallet|order:(?:all|processing|fulfilled|exceptions|payment))$/.test(transactionOrigin)
    ? `Transaction opened from: ${transactionOrigin}\n\n` : "";
}
