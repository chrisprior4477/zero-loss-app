import { readyWalletRewards, walletRewards, type AccountActivity } from "./activity";

/** Read only repeated, claimed cards through the existing owner-scoped RPC.
 * Return suffixes only; never pass full gift-card credentials into the list. */
export async function rewardCardEndings(
  state: AccountActivity,
  readClaimedReward: (id: string) => Promise<unknown>,
): Promise<Record<string, string>> {
  const group = (item: AccountActivity["activity"][number]) => JSON.stringify([item.slug, item.priceCents]);
  const counts = new Map<string, number>();
  for (const item of walletRewards(state)) {
    if (item.rewardId) counts.set(group(item), (counts.get(group(item)) ?? 0) + 1);
  }
  const ids = [...new Set(readyWalletRewards(state)
    .filter(item => item.rewardId && item.rewardClaimedAt && (counts.get(group(item)) ?? 0) > 1)
    .map(item => item.rewardId!))];
  const endings: Record<string, string> = {};
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const data = await readClaimedReward(id);
        if (data && typeof data === "object" && "code" in data && typeof data.code === "string") {
          const code = data.code.trim().replace(/[\s-]/g, "");
          if (code.length >= 4 && /^[a-z0-9]+$/i.test(code)) endings[id] = code.slice(-4);
        }
      } catch {
        // The original reference and claim date remain useful if this read fails.
      }
    }
  }));
  return endings;
}
