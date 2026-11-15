import { notificationFilter, notificationHref, validNotice } from "@/lib/account/notification-return";
import { exactOrderHref, fulfillmentFilter, fulfillmentFilterLabel, fulfillmentHref } from "@/lib/account/fulfillment";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAccountContext } from "@/lib/account/context";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { ActivityDetailDialog } from "@/components/account/ActivityDetailDialog";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletRewardDetail, WalletRewards } from "@/components/wallet/WalletRewards";
import { activityHref, completedActivityHref, findActivityItem, isPurchasedReward, isWalletReward, openEntriesAnchorId, walletRewards } from "@/lib/account/activity";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { depositRequestKeyPattern } from "@/lib/payments/provider";
import { entryFundingAmounts, entryReviewContext, entryReviewFundingHref, entryReviewHref, fundingHref, purchaseOptionHref, type FundingContinuation } from "@/lib/wallet/funding-navigation";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { selectedTransaction } from "@/lib/wallet/selected-transaction";
import { walletSupportReturnHref } from "@/lib/wallet/ledger-return";
import { getCompleteLedgerHistory } from "@/lib/wallet/history";
import { parseEntryQuantity, productEntryHref } from "@/lib/entries/return-intent";
import { parseDemoWalletHistoryVisibility, type DemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";
import { checkDemoPurchaseReceipt } from "@/lib/account/bulk-purchase-actions";
import { checkoutCards, checkoutReceiptId } from "@/lib/account/checkout-cards";
import { CheckoutGiftCardList } from "@/components/account/CheckoutGiftCardList";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import checkout from "@/components/account/purchase-checkout.module.css";
import cardStyles from "@/components/account/checkout-gift-cards.module.css";

export async function generateMetadata({ searchParams }: PageProps<"/account/wallet">): Promise<Metadata> {
  const query = await searchParams;
  const history = query.reward === undefined && query.rewardId === undefined && (query.view === "history" || query.view === "card");
  return { title: history ? "Wallet & Transactions" : "Gift Cards & Rewards" };
}

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ reward?: string | string[]; rewardId?: string | string[]; via?: string | string[]; view?: string | string[]; panel?: string | string[]; rewards?: string | string[]; expiredEntry?: string | string[]; expiredFocus?: string | string[]; tile?: string | string[]; card?: string | string[]; rewardHistory?: string | string[]; orderFilter?: string | string[]; from?: string | string[]; browse?: string | string[]; share?: string | string[]; entry?: string | string[]; quantity?: string | string[]; review?: string | string[]; filter?: string | string[]; transaction?: string | string[]; entryTransaction?: string | string[]; entryWalletView?: string | string[]; walletView?: string | string[]; choice?: string | string[]; deposit?: string | string[]; depositRow?: string | string[]; depositList?: string | string[]; alerts?: string | string[]; notice?: string | string[]; receipt?: string | string[]; checkout?: string | string[] }> }) {
  const query = await searchParams;
  const requestedReward = query.reward !== undefined || query.rewardId !== undefined;
  const history = !requestedReward && query.view === "history";
  const recoveryKey = history && typeof query.deposit === "string" && depositRequestKeyPattern.test(query.deposit) ? query.deposit : undefined;
  const depositRow = history && !recoveryKey && query.panel === "deposits" && typeof query.depositRow === "string" && depositRequestKeyPattern.test(query.depositRow) ? query.depositRow : undefined;
  const fromRewardHistory = query.rewardHistory === "1";
  const cardView = !requestedReward && query.view === "card";
  // A return link may name an existing catalog prize, not arbitrary content.
  const fromProduct = history && typeof query.from === "string" ? getDemoProduct(query.from) : undefined;
  const requestedQuantity = parseEntryQuantity(query.quantity) ?? 1;
  const entryOrigin = { transaction: query.entryTransaction, walletView: query.entryWalletView, alerts: query.alerts, notice: query.notice };
  const account = await getAccountContext();
  if (!account) {
    const purchaseArrival = requestedReward && query.via === "purchase" && typeof query.rewardId === "string";
    const paymentPanel = history && (query.panel === "methods" || query.panel === "card");
    const rewardSection = !requestedReward && !history && (fromRewardHistory || ["ready", "used", "expired", "history"].includes(String(query.rewards)))
      ? query.rewards === "ready" && !fromRewardHistory ? "#ready-rewards" : "#reward-history" : "";
    const next = recoveryKey ? accountPageReturnPath("/account/wallet", query, "#purchase-deposit")
      : paymentPanel ? accountPageReturnPath("/account/wallet", query, query.panel === "card" ? "#wallet-add-card" : "#payment-methods")
      : history && !query.transaction && (query.panel === "transactions" || query.panel === "deposits")
      ? accountPageReturnPath("/account/wallet", query, query.panel === "transactions" ? "#transactions" : "#payment-deposits")
      : history && !query.transaction && (fromProduct || query.panel === "funding") ? query.review === "entry" && fromProduct
      ? entryReviewFundingHref(fromProduct.slug, typeof query.entry === "string" ? query.entry : undefined, requestedQuantity, query.filter, entryOrigin)
      : fundingHref(fromProduct?.slug, typeof query.entry === "string" ? query.entry : undefined, requestedQuantity, query.browse, query.choice, query.share)
      : accountPageReturnPath("/account/wallet", query, history && typeof query.transaction === "string" ? `#transaction-${query.transaction}` : purchaseArrival ? "#reward-pass" : typeof query.checkout === "string" ? "#checkout-gift-cards" : rewardSection);
    redirect(`${authNavigationHref("/login", next)}&focus=email#login-form`);
  }
  if (cardView) redirect("/account/wallet?view=history&panel=card");
  const fromEntry = fromProduct && typeof query.entry === "string" && account.activity.source !== "unavailable"
    ? findActivityItem(account.activity.activity, fromProduct.slug, query.entry) : undefined;
  const forEntry = fromProduct && (query.entry === undefined || fromEntry?.status === "active");
  const availability = forEntry && account.wallet ? await getOfferingAvailability() : null;
  const currentAvailability = forEntry ? availability?.[fromProduct.slug] : undefined;
  const selectionUnavailable = currentAvailability !== undefined && currentAvailability.remaining < requestedQuantity;
  const amounts = forEntry ? entryFundingAmounts(availability?.[fromProduct.slug]?.entryPriceCents ?? null, requestedQuantity, account.wallet?.balanceCents ?? null) : undefined;
  const fundingReturn: FundingContinuation | undefined = query.entry !== undefined
    ? fromEntry ? fromEntry.status === "active"
      ? { title: fromEntry.title, href: entryReviewHref(fromEntry.entryId!, requestedQuantity, query.filter, entryOrigin), label: "Back to entry review", entryQuantity: requestedQuantity,
          entryDepositReturn: entryReviewFundingHref(fromEntry.slug, fromEntry.entryId!, requestedQuantity, query.filter, entryOrigin), ...amounts }
      : isWalletReward(fromEntry) && fromEntry.rewardId
        ? { title: fromEntry.title, href: `/account/wallet?${new URLSearchParams({ reward: fromEntry.slug, rewardId: fromEntry.rewardId, ...entryReviewContext(entryOrigin) })}#reward-pass`, label: "Open gift card" }
        : { title: fromEntry.title, href: fromEntry.status === "completion" ? purchaseOptionHref(fromEntry.slug, fromEntry.entryId!, query.choice) ?? activityHref(fromEntry) : activityHref(fromEntry), label: fromEntry.status === "completion" ? "Back to purchase option" : undefined }
    : undefined
    : fromProduct ? { title: fromProduct.title, href: productEntryHref(fromProduct.slug, requestedQuantity, query.browse, query.share) } : undefined;
  if (fundingReturn && forEntry) {
    if (selectionUnavailable) {
      fundingReturn.entryQuantity = undefined;
      fundingReturn.shortfallCents = undefined;
      fundingReturn.depositCents = undefined;
      fundingReturn.selectionUnavailable = true;
    } else Object.assign(fundingReturn, { entryQuantity: requestedQuantity, ...amounts });
  }
  // A URL only selects from this authenticated account's authorized data.
  const matchingRewards = walletRewards(account.activity).filter(item => typeof query.reward !== "string" || item.slug === query.reward);
  const reward = typeof query.rewardId === "string"
    ? matchingRewards.find(item => item.rewardId === query.rewardId)
    : typeof query.reward === "string" && matchingRewards.length === 1 ? matchingRewards[0] : undefined;
  const checkoutSlug = requestedReward
    ? query.via === "purchase" && reward && isPurchasedReward(reward) ? reward.slug : undefined
    : !history && typeof query.checkout === "string" ? query.checkout : undefined;
  const receiptId = typeof query.receipt === "string" && checkoutReceiptId.test(query.receipt) ? query.receipt : undefined;
  const receipt = checkoutSlug && receiptId ? await checkDemoPurchaseReceipt(receiptId, checkoutSlug) : null;
  const purchasedCards = receipt?.status === "succeeded" && checkoutSlug ? checkoutCards(account.activity, checkoutSlug, receipt.rewardIds) : [];
  if (!requestedReward && checkoutSlug && receiptId) {
    const focused = purchasedCards.find(card => card.id === query.card);
    const target = focused ? `checkout-card-${focused.id}` : "checkout-gift-cards";
    return <main className={checkout.page}><div className={checkout.shell}>
      <AccountSettingsLandingScroll target={target} visitKey={`${receiptId}:${target}`} settleAfterNavigation allScreens />
      <h1 id="checkout-gift-cards" className={cardStyles.title}>Gift Cards &amp; Rewards</h1>
      <section className={`${checkout.ticket} ${checkout.content}`} aria-labelledby="checkout-cards-heading">
        <h2 id="checkout-cards-heading" className={cardStyles.heading}>Cards from this checkout</h2>
        {receipt?.status === "succeeded" ? <CheckoutGiftCardList cards={purchasedCards} count={receipt.purchasedCount} slug={checkoutSlug} receipt={receiptId} focused={focused?.id} />
          : <>
            <p role="status">We couldn’t load this checkout.</p>
            <a href={accountPageReturnPath("/account/wallet", query, "#checkout-gift-cards")} className={`${cardStyles.secondary} ${cardStyles.returnButton}`}>Check this checkout again</a>
          </>}
        <Link href={completedActivityHref(focused?.item.entryId ?? purchasedCards[0]?.item.entryId, receipt?.status === "succeeded" ? { slug: checkoutSlug, receipt: receiptId } : undefined)} className={`${cardStyles.secondary} ${cardStyles.returnButton}`}>← Back to My Activity</Link>
        <Link href="/account/wallet#ready-rewards" className={`${cardStyles.secondary} ${cardStyles.returnButton}`}>See all gift cards &amp; rewards</Link>
      </section>
    </div></main>;
  }
  const rewardView = query.rewards === "ready" || query.rewards === "used" || query.rewards === "expired" || query.rewards === "history"
    ? query.rewards : "all";
  const rewardListHref = rewardView === "all" ? "/account/wallet"
    : `/account/wallet?rewards=${rewardView}#${rewardView === "ready" ? "ready-rewards" : "reward-history"}`;
  const demoDb = history && account.wallet?.scope === "demo" ? await createClient() : null;
  const provider = demoDb ? new DemoPaymentProvider(demoDb) : null;
  const [requests, savedCards, transaction, ledgerEntries, visibilityResult, catalog] = await Promise.all([
    history && provider ? provider.getRequests().catch(() => null) : null,
    provider && account.fundingEnabled ? provider.getPaymentMethods().catch(() => undefined) : [],
    history ? selectedTransaction(query.transaction, account.userId, account.wallet).catch(() => ({ requested: true, entry: null })) : undefined,
    history ? getCompleteLedgerHistory(account.userId, account.wallet).catch(() => null) : null,
    demoDb ? Promise.resolve(demoDb.rpc("get_demo_wallet_history_visibility")).catch(() => null) : undefined,
    history ? getShoppingCatalog().catch(() => null) : null,
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
    const checkedNotice = validNotice(query.notice) ? query.notice : undefined;
    const orderNotification = query.via === "order-notification" || Boolean(checkedNotice && query.alerts !== undefined);
    const orderContext = orderNotification ? { filter: notificationFilter(query.alerts ?? "orders"), notice: checkedNotice } : undefined;
    const matchingOrder = typeof query.rewardId === "string" ? account.orders?.orders.find(order => order.rewardId === query.rewardId) : undefined;
    const orderReturn = matchingOrder ? exactOrderHref(matchingOrder.orderNumber, fulfillmentFilter(query.orderFilter), false, orderNotification, orderContext?.filter, checkedNotice) : undefined;
    const ordersVisit = ["orders", "order-notification", "order-selection"].includes(String(query.via));
    const ordersBackHref = orderReturn ?? (ordersVisit ? fulfillmentHref(undefined, fulfillmentFilter(query.orderFilter), false, undefined, orderContext) : undefined);
    if (account.activity.source === "unavailable") {
      const retryHref = accountPageReturnPath("/account/wallet", query, query.via === "purchase" ? "#reward-pass" : "");
      return <PageContainer><main className="mx-auto w-full max-w-6xl pb-10"><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 className="text-lg font-bold text-white">We couldn’t load your reward</h1><p className="mt-2 text-sm text-[#b5cce4]">Your reward information is temporarily unavailable. Try again to check this saved reward.</p><a href={retryHref} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-4 text-sm font-bold text-[#06223d]">Try again</a><Link href={ordersBackHref ?? rewardListHref} className="ml-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">{orderReturn ? "Back to this order" : ordersBackHref ? "Back to orders & rewards" : "Back to your wallet ›"}</Link></div></main></PageContainer>;
    }
    let claimedCode: string | null = null;
    let crewMembers: { id: string; name: string }[] | null = [];
    if (reward?.status === "prize" && reward.rewardId) {
      const db = await createClient();
      try {
        const { data, error } = await db.rpc("get_crew_member_profiles");
        crewMembers = !error && Array.isArray(data) ? data.filter((member: { member_id?: unknown; name?: unknown }) => typeof member.member_id === "string" && typeof member.name === "string")
          .map((member: { member_id: string; name: string }) => ({ id: member.member_id, name: member.name })) : null;
      } catch { crewMembers = null; }
    }
    if (reward?.rewardId && reward.rewardClaimedAt && reward.rewardStatus === "ready") {
      const db = await createClient();
      const { data, error } = await db.rpc("get_claimed_reward", { p_reward_id: reward.rewardId });
      claimedCode = !error && data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : null;
    }
    if (reward) {
      const fromPurchase = query.via === "purchase" && typeof query.rewardId === "string" && isPurchasedReward(reward);
      const currentCard = purchasedCards.find(card => card.id === reward.rewardId);
      const checkoutContext = currentCard && receipt?.status === "succeeded" && receiptId
        ? { receipt: receiptId, cards: purchasedCards, current: currentCard, count: receipt.purchasedCount } : undefined;
      const transactionId = typeof query.transaction === "string" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(query.transaction) ? query.transaction : undefined;
      const orderFilter = fulfillmentFilter(query.orderFilter);
      const fromOrders = query.via === "orders" || query.via === "order-notification" || query.via === "order-selection";
      const sourceOrder = (query.via === "order-notification" || query.via === "order-selection") && reward.rewardId && typeof query.rewardId === "string"
        ? account.orders?.orders.find(order => order.rewardId === reward.rewardId) : undefined;
      const winFilter = query.via === "won" ? "prize" : query.via === "completed-win" ? "completed" : query.via === "activity-win" ? "all" : null;
      const notice = validNotice(query.notice) ? query.notice : undefined;
      const alerts = query.alerts === undefined ? sourceOrder?.status === "exception" ? "action" : "orders" : notificationFilter(query.alerts);
      const returnLink = transactionId && typeof query.rewardId === "string" && query.via === undefined
        ? { href: walletSupportReturnHref(transactionId, query.walletView === "1"), label: "Back to this transaction" }
        : query.via === "completed" && typeof query.rewardId === "string" && isPurchasedReward(reward) && reward.entryId
          ? { href: `/account/entries?filter=completed&viewed=${encodeURIComponent(reward.entryId)}#${openEntriesAnchorId}`, label: "Back to this purchase" }
          : typeof query.rewardId === "string" && fromOrders && reward.rewardId
            ? query.via === "order-notification"
              ? { href: notificationHref(alerts, notice), label: "Back to order updates" }
              : query.via === "order-selection"
                ? { href: sourceOrder ? exactOrderHref(sourceOrder.orderNumber, orderFilter) : fulfillmentHref(reward.rewardId, orderFilter), label: sourceOrder ? "Back to this order" : "Back to this reward" }
              : { href: fulfillmentHref(undefined, orderFilter, false, reward.rewardId), label: `Return to ${orderFilter === "all" ? "All orders & rewards" : fulfillmentFilterLabel[orderFilter]}` }
            : typeof query.rewardId === "string" && winFilter && !isPurchasedReward(reward) && reward.status === "prize" && reward.entryId
              ? { href: `/account/entries?filter=${winFilter}&viewed=${encodeURIComponent(reward.entryId)}#${openEntriesAnchorId}`, label: "Back to this win in My Activity" }
              : notice && query.alerts !== undefined && query.via === undefined
                ? { href: notificationHref(alerts, notice), label: "Back to notifications" }
                : undefined;
      const fulfillmentReturn = sourceOrder
        ? exactOrderHref(sourceOrder.orderNumber, orderFilter, false, orderNotification, orderContext?.filter, notice)
        : orderContext ? fulfillmentHref(reward.rewardId ?? undefined, orderFilter, false, undefined, orderContext) : undefined;
      return <WalletRewardDetail claimCheckHref={accountPageReturnPath("/account/wallet", query, "#reward-pass")} orderFilter={orderFilter} fulfillmentReturn={fulfillmentReturn} fromPurchase={fromPurchase} returnTile={query.tile === "1"} returnHistory={fromRewardHistory} returnView={query.rewards === rewardView ? rewardView : undefined} timeZone={account.timezone} item={reward}
        isPreview={account.activity.isPreview} claimedCode={claimedCode} crewMembers={crewMembers} returnLink={returnLink} checkoutContext={checkoutContext}
        overview={{ activity: account.activity, balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled }} />;
    }
    return <PageContainer><main className="mx-auto w-full max-w-6xl pb-10"><Link href="/account/entries" className="text-sm text-[#b5cce4] hover:text-cyan-300">‹ My Activity</Link><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 className="text-lg font-bold text-white">Reward unavailable</h1><p className="mt-2 text-sm text-[#b5cce4]">That reward is not available in your account.</p><Link href={rewardListHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">Back to your wallet ›</Link></div></main></PageContainer>;
  }
  if (history) {
    const hiddenProducts = catalog && !catalog.unavailable ? catalog.hidden : new Set(resolvedCatalogSlugs(account.activity));
    return <WalletOverview hiddenProducts={hiddenProducts} restoreLedgerView={query.walletView === "1"} timeZone={account.timezone} initialSection={query.panel === "methods" || query.panel === "card" ? query.panel : undefined} displayName={account.displayName} wallet={account.wallet} ledgerEntries={ledgerEntries} demoHistoryVisibility={demoHistoryVisibility} activity={account.activity} selectedTransaction={transaction} fundingEnabled={account.fundingEnabled} requestKey={randomUUID()} recoveryKey={recoveryKey} depositRow={depositRow} fromDeposits={query.panel === "deposits"} depositList={query.depositList === "1"} requests={requests} savedCards={savedCards ?? []} cardUnavailable={savedCards === undefined} returnToProduct={fundingReturn} returnUnavailable={query.entry !== undefined && !fromEntry} />;
  }
  const focusCard = typeof query.card === "string" ? query.card : undefined;
  const expired = rewardView === "expired" && typeof query.expiredEntry === "string" && account.activity.source !== "unavailable"
    ? account.activity.activity.find(item => item.entryId === query.expiredEntry && item.completionOptionStatus === "expired") : undefined;
  const focusExpired = rewardView === "expired" && typeof query.expiredFocus === "string" ? query.expiredFocus : expired?.entryId;
  const rewards = <WalletRewards timeZone={account.timezone} state={account.activity} balanceLabel={account.balanceLabel} fundingEnabled={account.fundingEnabled} view={rewardView} focusCard={fromRewardHistory ? undefined : focusCard} focusHistoryCard={focusExpired ?? (fromRewardHistory ? focusCard : undefined)} />;
  return expired ? <>{rewards}<ActivityDetailDialog item={expired} destination="/account/entries" expiredWalletReturn={`/account/wallet?rewards=expired&expiredFocus=${encodeURIComponent(expired.entryId!)}#wallet-reward-${encodeURIComponent(expired.entryId!)}`} /></> : rewards;
}
