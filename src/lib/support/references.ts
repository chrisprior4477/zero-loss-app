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

const rewardIdPattern = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const rewardReturnFields: Record<string, RegExp> = {
  rewardId: rewardIdPattern,
  receipt: rewardIdPattern,
  reward: /^[a-z0-9-]{1,150}$/,
  via: /^(?:purchase|completed|orders|order-notification|order-selection|activity-win|completed-win|won)$/,
  orderFilter: /^(?:processing|fulfilled|exceptions|payment)$/,
  rewards: /^(?:ready|used|expired|history)$/,
  fromOrders: /^1$/, rewardHistory: /^1$/, tile: /^1$/,
};

export function supportRewardReturn(value: unknown, rewardId?: string): string | null {
  if (typeof value !== "string" || value.length > 500 || !value.startsWith("/account/wallet?") || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const url = new URL(value, "https://navigation.invalid");
  if (url.pathname !== "/account/wallet" || url.hash !== "#reward-pass") return null;
  const id = url.searchParams.get("rewardId");
  if (!id || rewardId && rewardId !== id) return null;
  const query = new URLSearchParams();
  for (const [key, field] of url.searchParams) {
    if (!Object.hasOwn(rewardReturnFields, key) || !rewardReturnFields[key].test(field) || query.has(key)) return null;
    query.set(key, field);
  }
  if (query.has("receipt") && (query.get("via") !== "purchase" || !query.has("reward"))) return null;
  return `/account/wallet?${query}#reward-pass`;
}

export function supportRewardContext(value: string | undefined, rewardId: string): string | null {
  if (!value?.startsWith("/account/wallet?")) return null;
  const original = new URL(value, "https://navigation.invalid");
  const query = new URLSearchParams({ rewardId });
  for (const [key, field] of original.searchParams) {
    if (key !== "rewardId" && Object.hasOwn(rewardReturnFields, key)) query.append(key, field);
  }
  return supportRewardReturn(`/account/wallet?${query}#reward-pass`, rewardId);
}

export function rewardSupportHref(rewardId?: string | null, orderFilter: FulfillmentFilter = "all", source?: string): string {
  if (!rewardId) return "/support";
  const params = new URLSearchParams({ rewardId });
  const returnTo = supportRewardContext(source, rewardId);
  if (returnTo) params.set("rewardReturn", returnTo);
  if (orderFilter !== "all") params.set("orderFilter", orderFilter);
  return `/support?${params}#report-problem`;
}

/** Store the verified reference in the opening case message. */
export function supportReferencePrefix(rewardId = "", deposit?: SupportDeposit, transactionOrigin = "") {
  if (deposit) return `Deposit reference: ${deposit.id}\nDeposit amount: ${formatUsdFromCents(deposit.amount)} USD\n\n`;
  if (rewardId) {
    const orderOrigin = /^order:(all|processing|fulfilled|exceptions|payment)$/.exec(transactionOrigin);
    const rewardReturn = transactionOrigin.startsWith("reward:") ? supportRewardReturn(transactionOrigin.slice(7), rewardId) : null;
    return `Reward reference: ${rewardId}${orderOrigin ? `\nReward opened from: ${orderOrigin[1]}` : ""}${rewardReturn ? `\nReward return: ${rewardReturn}` : ""}\n\n`;
  }
  return /^(?:wallet(?::orders:(?:all|processing|fulfilled|exceptions|payment))?|order:(?:all|processing|fulfilled|exceptions|payment)(?::details)?)$/.test(transactionOrigin)
    ? `Transaction opened from: ${transactionOrigin}\n\n` : "";
}

export function supportMessageAnchor(value: unknown) {
  if (typeof value !== "string" || value.length > 75) return null;
  const [createdAt, id, extra] = value.split("|");
  if (extra !== undefined || !id || !rewardIdPattern.test(id) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt) ||
    !Number.isFinite(Date.parse(createdAt))) return null;
  return { createdAt, id };
}
