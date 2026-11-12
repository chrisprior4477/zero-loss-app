import { formatUsdFromCents } from "@/lib/wallet/money";

export type SupportDeposit = { key: string; id: string; amount: number };

export function depositSupportHref(key: string): string {
  return `/support?deposit=${encodeURIComponent(key)}#report-problem`;
}

export function rewardSupportHref(rewardId?: string | null): string {
  return rewardId ? `/support?rewardId=${encodeURIComponent(rewardId)}#report-problem` : "/support";
}

/** Store the verified reference in the opening case message. */
export function supportReferencePrefix(rewardId = "", deposit?: SupportDeposit) {
  if (deposit) return `Deposit reference: ${deposit.id}\nDeposit amount: ${formatUsdFromCents(deposit.amount)} USD\n\n`;
  return rewardId ? `Reward reference: ${rewardId}\n\n` : "";
}
