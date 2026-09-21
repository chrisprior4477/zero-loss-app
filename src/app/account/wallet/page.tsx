import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAccountContext } from "@/lib/account/context";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletRewardDetail, WalletRewards } from "@/components/wallet/WalletRewards";
import { walletRewards } from "@/lib/account/activity";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { DemoCardManager } from "@/components/wallet/DemoCardManager";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { fundingHref } from "@/lib/wallet/funding-navigation";

export const metadata: Metadata = { title: "Gift Cards & Rewards" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ reward?: string | string[]; rewardId?: string | string[]; view?: string | string[]; rewards?: string | string[]; from?: string | string[] }> }) {
  const query = await searchParams;
  const requestedReward = query.reward !== undefined || query.rewardId !== undefined;
  const history = !requestedReward && query.view === "history";
  // A return link may name an existing catalog prize, not arbitrary content.
  const fromProduct = history && typeof query.from === "string" ? getDemoProduct(query.from) : undefined;
  const account = await getAccountContext();
  if (!account) redirect(history ? `/login?next=${encodeURIComponent(fundingHref(fromProduct?.slug))}&focus=email#login-form` : "/login");
  // A URL only selects from this authenticated account's authorized data.
  const matchingRewards = walletRewards(account.activity).filter(item => typeof query.reward !== "string" || item.slug === query.reward);
  const reward = typeof query.rewardId === "string"
    ? matchingRewards.find(item => item.rewardId === query.rewardId)
    : typeof query.reward === "string" && matchingRewards.length === 1 ? matchingRewards[0] : undefined;
  const cardView = !requestedReward && query.view === "card";
  const rewardView = query.rewards === "history" ? "history" : "ready";
  const provider = (history || cardView) && account.wallet?.scope === "demo" ? new DemoPaymentProvider(await createClient()) : null;
  const [requests, savedCard] = await Promise.all([
    history && provider ? provider.getRequests().catch(() => null) : null,
    provider && account.fundingEnabled ? provider.getPaymentMethod().catch(() => undefined) : null,
  ]);
  if (requestedReward) {
    let claimedCode: string | null = null;
    if (reward?.rewardId && reward.rewardClaimedAt && reward.rewardStatus === "ready") {
      const db = await createClient();
      const { data, error } = await db.rpc("get_claimed_reward", { p_reward_id: reward.rewardId });
      claimedCode = !error && data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    }
    return reward
      ? <WalletRewardDetail item={reward} isPreview={account.activity.isPreview} claimedCode={claimedCode} />
      : <PageContainer><main className="mx-auto w-full max-w-6xl pb-10"><Link href="/account/entries" className="text-sm text-[#b5cce4] hover:text-cyan-300">‹ My Activity</Link><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 className="text-lg font-bold text-white">Reward unavailable</h1><p className="mt-2 text-sm text-[#b5cce4]">That reward is not available in your account.</p><Link href="/account/wallet" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">Back to your wallet ›</Link></div></main></PageContainer>;
  }
  if (cardView) return <DemoCardManager displayName={account.displayName} savedCard={savedCard ?? null} cardUnavailable={savedCard === undefined} enabled={Boolean(provider && account.fundingEnabled)} />;
  if (history) return <WalletOverview wallet={account.wallet} fundingEnabled={account.fundingEnabled} requestKey={randomUUID()} requests={requests} savedCard={savedCard ?? null} cardUnavailable={savedCard === undefined} returnToProduct={fromProduct ? { title: fromProduct.title, href: `/items/${fromProduct.slug}#enter-entry` } : undefined} />;
  return <WalletRewards state={account.activity} view={rewardView} />;
}
