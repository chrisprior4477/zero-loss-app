const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export type SupportOrderContext = { rewardId: string; orderNumber: string | null; title: string; retailer: string };
export function orderSupportHref(rewardId: string): string {
  return uuid.test(rewardId) ? `/support?rewardId=${rewardId}#report-problem` : "/support";
}
/** Append only server-verified, stable references, never card codes or caller-provided context. */
export function orderSupportBody(body: string, order: SupportOrderContext): string {
  return `${body}\n\nAttached ${order.orderNumber ? `order: ${order.orderNumber}\n` : ""}Reward reference: ${order.rewardId}`;
}
