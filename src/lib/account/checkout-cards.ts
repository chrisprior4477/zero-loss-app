import { isPurchasedReward, walletRewards, type AccountActivity } from "./activity";

export const checkoutReceiptId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function checkoutCards(activity: AccountActivity, slug: string, rewardIds: readonly string[]) {
  const owned = new Map(walletRewards(activity).filter(item => item.rewardId && item.slug === slug && isPurchasedReward(item))
    .map(item => [item.rewardId, item]));
  return rewardIds.flatMap((id, index) => {
    const item = owned.get(id);
    return item ? [{ item, id, number: index + 1 }] : [];
  });
}

export type CheckoutCard = ReturnType<typeof checkoutCards>[number];
