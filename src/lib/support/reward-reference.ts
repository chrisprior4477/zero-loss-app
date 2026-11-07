/** Store the immutable reference in the opening case message, never a gift-card code. */
export function supportRewardPrefix(rewardId: string) {
  return rewardId ? `Reward reference: ${rewardId}\n\n` : "";
}

export function supportMessageLimit(rewardId = "") {
  return 4000 - supportRewardPrefix(rewardId).length;
}
