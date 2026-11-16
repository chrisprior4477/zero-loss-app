import { formatUsdFromCents } from "@/lib/wallet/money";
import { entryFundingReturnPath, purchaseOptionReturnPath } from "@/lib/wallet/funding-navigation";
import type { FulfillmentFilter } from "@/lib/account/fulfillment";

export type SupportDeposit = { key: string; id: string; amount: number };

export function depositSupportHref(key: string, checkoutReturn?: string, fromDeposits = false, entryReturn?: string): string {
  const params = new URLSearchParams({ deposit: key });
  const checkout = purchaseOptionReturnPath(checkoutReturn);
  if (checkout) params.set("checkoutReturn", checkout);
  const entry = entryFundingReturnPath(entryReturn);
  if (entry) params.set("entryReturn", entry);
  if (fromDeposits) params.set("depositList", "1");
  return `/support?${params}#report-problem`;
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
  if (rewardId) {
    const orderOrigin = /^order:(all|processing|fulfilled|exceptions|payment)$/.exec(transactionOrigin);
    return `Reward reference: ${rewardId}${orderOrigin ? `\nReward opened from: ${orderOrigin[1]}` : ""}\n\n`;
  }
  return /^(?:wallet|order:(?:all|processing|fulfilled|exceptions|payment)(?::details)?)$/.test(transactionOrigin)
    ? `Transaction opened from: ${transactionOrigin}\n\n` : "";
}
