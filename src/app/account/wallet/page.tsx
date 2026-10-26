import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAccountContext } from "@/lib/account/context";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletRewardDetail, WalletRewards } from "@/components/wallet/WalletRewards";
import { activityHref, findActivityItem, walletRewards } from "@/lib/account/activity";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { extraEntryReturnHref, fundingHref } from "@/lib/wallet/funding-navigation";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { selectedTransaction } from "@/lib/wallet/selected-transaction";
import { getCompleteLedgerHistory } from "@/lib/wallet/history";
import { parseEntryQuantity, productEntryHref } from "@/lib/entries/return-intent";
import { parseDemoWalletHistoryVisibility, type DemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";

export const metadata: Metadata = { title: "Gift Cards & Rewards" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ reward?: string | string[]; rewardId?: string | string[]; view?: string | string[]; rewards?: string | string[]; from?: string | string[]; entry?: string | string[]; quantity?: string | string[]; resume?: string | string[]; transaction?: string | string[] }> }) {
  const query = await searchParams;
  const requestedReward = query.reward !== undefined || query.rewardId !== undefined;
  const history = !requestedReward && query.view === "history";
  const cardView = !requestedReward && query.view === "card";
  // A return link may name an existing catalog prize, not arbitrary content.
  const fromProduct = history && typeof query.from === "string" ? getDemoProduct(query.from) : undefined;
  const requestedQuantity = parseEntryQuantity(query.quantity) ?? 1;
  const account = await getAccountContext();
  if (!account) {
    const next = history && !query.transaction ? fundingHref(fromProduct?.slug, typeof query.entry === "string" ? query.entry : undefined, requestedQuantity, query.resume === "extra-entries") : accountPageReturnPath("/account/wallet", query, history && typeof query.transaction === "string" ? `#transaction-${query.transaction}` : "");
    redirect(`${authNavigationHref("/login", next)}&focus=email#login-form`);
  }
  if (cardView) redirect("/account/payment-methods");
  const fromEntry = fromProduct && typeof query.entry === "string" && account.activity.source !== "unavailable"
    ? findActivityItem(account.activity.activity, fromProduct.slug, query.entry) : undefined;
  const fundingReturn = query.entry !== undefined
    ? fromEntry ? query.resume === "extra-entries" && fromEntry.status === "active"
      ? { title: fromEntry.title, href: extraEntryReturnHref(fromEntry.entryId!, requestedQuantity), label: "Back to your entries" as const }
      : { title: fromEntry.title, href: fromEntry.status === "completion" ? `${activityHref(fromEntry)}&resume=purchase` : activityHref(fromEntry), label: "Back to purchase option" as const } : undefined
    : fromProduct ? { title: fromProduct.title, href: productEntryHref(fromProduct.slug, requestedQuantity) } : undefined;
  // A URL only selects from this authenticated account's authorized data.
  const matchingRewards = walletRewards(account.activity).filter(item => typeof query.reward !== "string" || item.slug === query.reward);
  const reward = typeof query.rewardId === "string"
    ? matchingRewards.find(item => item.rewardId === query.rewardId)
    : typeof query.reward === "string" && matchingRewards.length === 1 ? matchingRewards[0] : undefined;
  const rewardView = ["ready", "used", "expired", "history"].includes(String(query.rewards))
    ? query.rewards as "ready" | "used" | "expired" | "history" : "all";
  const demoDb = history && account.wallet?.scope === "demo" ? await createClient() : null;
  const provider = demoDb ? new DemoPaymentProvider(demoDb) : null;
  const [requests, savedCards, transaction, ledgerEntries, visibilityResult] = await Promise.all([
    history && provider ? provider.getRequests().catch(() => null) : null,
    provider && account.fundingEnabled ? provider.getPaymentMethods().catch(() => undefined) : [],
    history ? selectedTransaction(query.transaction, account.userId, account.wallet).catch(() => ({ requested: true, entry: null })) : undefined,
    history ? getCompleteLedgerHistory(account.userId, account.wallet).catch(() => null) : null,
    demoDb ? Promise.resolve(demoDb.rpc("get_demo_wallet_history_visibility")).catch(() => null) : undefined,
  ]);
  let demoHistoryVisibility: DemoWalletHistoryVisibility | null | undefined = undefined;
  if (demoDb) {
    demoHistoryVisibility = null;
    if (visibilityResult && !visibilityResult.error) {
      try { demoHistoryVisibility = parseDemoWalletHistoryVisibility(visibilityResult.data); }
      catch { /* Never hide records or offer resets on an unverified response. */ }
    }
  }
  if (requestedReward) {
    let claimedCode: string | null = null;
    let crewMembers: { id: string; name: string }[] = [];
    if (reward?.status === "prize" && reward.rewardId) {
      const db = await createClient();
      const { data, error } = await db.rpc("get_crew_member_profiles");
      crewMembers = !error && Array.isArray(data) ? data.filter((member: { member_id?: unknown; name?: unknown }) => typeof member.member_id === "string" && typeof member.name === "string")
        .map((member: { member_id: string; name: string }) => ({ id: member.member_id, name: member.name })) : [];
    }
    if (reward?.rewardId && reward.rewardClaimedAt && reward.rewardStatus === "ready") {
      const db = await createClient();
      const { data, error } = await db.rpc("get_claimed_reward", { p_reward_id: reward.rewardId });
      claimedCode = !error && data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    }
    return reward
      ? <WalletRewardDetail item={reward} isPreview={account.activity.isPreview} claimedCode={claimedCode} crewMembers={crewMembers} overview={{ activity: account.activity, balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled }} />
      : <PageContainer><main className="mx-auto w-full max-w-6xl pb-10"><Link href="/account/entries" className="text-sm text-[#b5cce4] hover:text-cyan-300">‹ My Activity</Link><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 className="text-lg font-bold text-white">Reward unavailable</h1><p className="mt-2 text-sm text-[#b5cce4]">That reward is not available in your account.</p><Link href="/account/wallet" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">Back to your wallet ›</Link></div></main></PageContainer>;
  }
  if (history) return <WalletOverview wallet={account.wallet} ledgerEntries={ledgerEntries} demoHistoryVisibility={demoHistoryVisibility} activity={account.activity} selectedTransaction={transaction} fundingEnabled={account.fundingEnabled} requestKey={randomUUID()} requests={requests} savedCards={savedCards ?? []} cardUnavailable={savedCards === undefined} returnToProduct={fundingReturn} returnUnavailable={query.entry !== undefined && !fromEntry} />;
  return <WalletRewards state={account.activity} balanceLabel={account.balanceLabel} fundingEnabled={account.fundingEnabled} view={rewardView} />;
}
