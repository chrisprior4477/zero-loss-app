import { fulfillmentFilter } from "@/lib/account/fulfillment";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAccountContext } from "@/lib/account/context";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletRewardDetail, WalletRewards } from "@/components/wallet/WalletRewards";
import { activityHref, findActivityItem, isPurchasedReward, walletRewards } from "@/lib/account/activity";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { depositRequestKeyPattern } from "@/lib/payments/provider";
import { entryFundingAmounts, entryReviewFundingHref, entryReviewHref, fundingHref, purchaseOptionHref, type FundingContinuation } from "@/lib/wallet/funding-navigation";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { selectedTransaction } from "@/lib/wallet/selected-transaction";
import { getCompleteLedgerHistory } from "@/lib/wallet/history";
import { parseEntryQuantity, productEntryHref } from "@/lib/entries/return-intent";
import { parseDemoWalletHistoryVisibility, type DemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";

export const metadata: Metadata = { title: "Gift Cards & Rewards" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ reward?: string | string[]; rewardId?: string | string[]; via?: string | string[]; view?: string | string[]; panel?: string | string[]; rewards?: string | string[]; tile?: string | string[]; card?: string | string[]; orderFilter?: string | string[]; from?: string | string[]; browse?: string | string[]; entry?: string | string[]; quantity?: string | string[]; review?: string | string[]; filter?: string | string[]; transaction?: string | string[]; choice?: string | string[]; deposit?: string | string[] }> }) {
  const query = await searchParams;
  const requestedReward = query.reward !== undefined || query.rewardId !== undefined;
  const history = !requestedReward && query.view === "history";
  const recoveryKey = history && typeof query.deposit === "string" && depositRequestKeyPattern.test(query.deposit) ? query.deposit : undefined;
  const cardView = !requestedReward && query.view === "card";
  // A return link may name an existing catalog prize, not arbitrary content.
  const fromProduct = history && typeof query.from === "string" ? getDemoProduct(query.from) : undefined;
  const requestedQuantity = parseEntryQuantity(query.quantity) ?? 1;
  const account = await getAccountContext();
  if (!account) {
    const purchaseArrival = requestedReward && query.via === "purchase" && typeof query.rewardId === "string";
    const paymentPanel = history && (query.panel === "methods" || query.panel === "card");
    const rewardSection = !requestedReward && !history && ["ready", "used", "expired", "history"].includes(String(query.rewards))
      ? query.rewards === "ready" ? "#ready-rewards" : "#reward-history" : "";
    const next = recoveryKey ? accountPageReturnPath("/account/wallet", query, "#purchase-deposit")
      : paymentPanel ? accountPageReturnPath("/account/wallet", query, query.panel === "card" ? "#wallet-add-card" : "#payment-methods")
      : history && !query.transaction && (query.panel === "transactions" || query.panel === "deposits")
      ? accountPageReturnPath("/account/wallet", query, query.panel === "transactions" ? "#transactions" : "#payment-deposits")
      : history && !query.transaction && (fromProduct || query.panel === "funding") ? query.review === "entry" && fromProduct
      ? entryReviewFundingHref(fromProduct.slug, typeof query.entry === "string" ? query.entry : undefined, requestedQuantity, query.filter)
      : fundingHref(fromProduct?.slug, typeof query.entry === "string" ? query.entry : undefined, requestedQuantity, query.browse, query.choice)
      : accountPageReturnPath("/account/wallet", query, history && typeof query.transaction === "string" ? `#transaction-${query.transaction}` : purchaseArrival ? "#reward-pass" : rewardSection);
    redirect(`${authNavigationHref("/login", next)}&focus=email#login-form`);
  }
  if (cardView) redirect("/account/wallet?view=history&panel=card");
  const fromEntry = fromProduct && typeof query.entry === "string" && account.activity.source !== "unavailable"
    ? findActivityItem(account.activity.activity, fromProduct.slug, query.entry) : undefined;
  const forEntry = fromProduct && (query.entry === undefined || fromEntry?.status === "active");
  const availability = forEntry && account.wallet ? await getOfferingAvailability() : null;
  const amounts = forEntry ? entryFundingAmounts(availability?.[fromProduct.slug]?.entryPriceCents ?? null, requestedQuantity, account.wallet?.balanceCents ?? null) : undefined;
  const fundingReturn: FundingContinuation | undefined = query.entry !== undefined
    ? fromEntry ? fromEntry.status === "active"
      ? { title: fromEntry.title, href: entryReviewHref(fromEntry.entryId!, requestedQuantity, query.filter), label: "Back to entry review", entryQuantity: requestedQuantity, ...amounts }
      : { title: fromEntry.title, href: fromEntry.status === "completion" || isPurchasedReward(fromEntry) ? purchaseOptionHref(fromEntry.slug, fromEntry.entryId!, query.choice) ?? activityHref(fromEntry) : activityHref(fromEntry), label: "Back to purchase option" } : undefined
    : fromProduct ? { title: fromProduct.title, href: productEntryHref(fromProduct.slug, requestedQuantity, query.browse) } : undefined;
  if (fundingReturn && forEntry) Object.assign(fundingReturn, { entryQuantity: requestedQuantity, ...amounts });
  // A URL only selects from this authenticated account's authorized data.
  const matchingRewards = walletRewards(account.activity).filter(item => typeof query.reward !== "string" || item.slug === query.reward);
  const reward = typeof query.rewardId === "string"
    ? matchingRewards.find(item => item.rewardId === query.rewardId)
    : typeof query.reward === "string" && matchingRewards.length === 1 ? matchingRewards[0] : undefined;
  const rewardView = query.rewards === "ready" || query.rewards === "used" || query.rewards === "expired" || query.rewards === "history"
    ? query.rewards : "all";
  const rewardListHref = rewardView === "all" ? "/account/wallet"
    : `/account/wallet?rewards=${rewardView}#${rewardView === "ready" ? "ready-rewards" : "reward-history"}`;
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
    if (account.activity.source === "unavailable") {
      const retryHref = accountPageReturnPath("/account/wallet", query, query.via === "purchase" ? "#reward-pass" : "");
      return <PageContainer><main className="mx-auto w-full max-w-6xl pb-10"><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 className="text-lg font-bold text-white">We couldn’t load your reward</h1><p className="mt-2 text-sm text-[#b5cce4]">Your reward information is temporarily unavailable. Try again to check this saved reward.</p><a href={retryHref} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-4 text-sm font-bold text-[#06223d]">Try again</a><Link href={rewardListHref} className="ml-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">Back to your wallet ›</Link></div></main></PageContainer>;
    }
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
    if (reward) {
      const fromPurchase = query.via === "purchase" && typeof query.rewardId === "string" && isPurchasedReward(reward);
      return <WalletRewardDetail orderFilter={fulfillmentFilter(query.orderFilter)} fromPurchase={fromPurchase} returnTile={query.tile === "1"} returnView={query.rewards === rewardView ? rewardView : undefined} timeZone={account.timezone} item={reward}
        isPreview={account.activity.isPreview} claimedCode={claimedCode} crewMembers={crewMembers}
        overview={{ activity: account.activity, balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled }} />;
    }
    return <PageContainer><main className="mx-auto w-full max-w-6xl pb-10"><Link href="/account/entries" className="text-sm text-[#b5cce4] hover:text-cyan-300">‹ My Activity</Link><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 className="text-lg font-bold text-white">Reward unavailable</h1><p className="mt-2 text-sm text-[#b5cce4]">That reward is not available in your account.</p><Link href={rewardListHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">Back to your wallet ›</Link></div></main></PageContainer>;
  }
  if (history) return <WalletOverview timeZone={account.timezone} initialSection={query.panel === "methods" || query.panel === "card" ? query.panel : undefined} displayName={account.displayName} wallet={account.wallet} ledgerEntries={ledgerEntries} demoHistoryVisibility={demoHistoryVisibility} activity={account.activity} selectedTransaction={transaction} fundingEnabled={account.fundingEnabled} requestKey={randomUUID()} recoveryKey={recoveryKey} requests={requests} savedCards={savedCards ?? []} cardUnavailable={savedCards === undefined} returnToProduct={fundingReturn} returnUnavailable={query.entry !== undefined && !fromEntry} />;
  return <WalletRewards timeZone={account.timezone} state={account.activity} balanceLabel={account.balanceLabel} fundingEnabled={account.fundingEnabled} view={rewardView} focusCard={typeof query.card === "string" ? query.card : undefined} />;
}
