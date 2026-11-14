import type { AccountOrder } from "./orders";

export type PurchaseStamp = Pick<AccountOrder, "orderNumber" | "createdAt">;

export function repeatPurchaseStamps(orders: readonly AccountOrder[]): Record<string, PurchaseStamp> {
  const groups = new Map<string, AccountOrder[]>();
  for (const order of orders) {
    const key = JSON.stringify([order.rewardSlug, order.faceValueCents, order.amountPaidCents]);
    const group = groups.get(key);
    if (group) group.push(order);
    else groups.set(key, [order]);
  }

  return Object.fromEntries([...groups.values()].filter(group => group.length > 1).flatMap(group =>
    group.map(({ rewardId, orderNumber, createdAt }) => [rewardId, { orderNumber, createdAt }]),
  ));
}
