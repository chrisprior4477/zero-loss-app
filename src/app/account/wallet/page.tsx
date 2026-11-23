import { AccountSessionRetry } from "@/components/account/AccountSessionRetry";
import { AccountReadRetryLink } from "@/components/account/AccountReadRetryLink";
import { getOwnWinShareRecipients } from "@/lib/crew/actions";
import { notificationFilter, notificationHref, validNotice } from "@/lib/account/notification-return";
import { exactOrderHref, fulfillmentFilter, fulfillmentFilterLabel, fulfillmentHref } from "@/lib/account/fulfillment";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAccountContext } from "@/lib/account/context";
import { rewardCardEndings } from "@/lib/account/reward-card-endings";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { ActivityDetailDialog } from "@/components/account/ActivityDetailDialog";
import { LegacyWalletFragment } from "@/components/wallet/WalletLandingScroll";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletRewardDetail, WalletRewards } from "@/components/wallet/WalletRewards";
import { walletRewardHref, activityHref, completedActivityHref, findActivityItem, isPurchasedReward, isWalletReward, openEntriesAnchorId, openPrizeOptions, walletRewards } from "@/lib/account/activity";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { productBrowseReturnLabel, productBrowseReturnPath } from "@/lib/catalog/product-return";
import { depositRequestKeyPattern } from "@/lib/payments/provider";
import { entryFundingAmounts, entryReviewContext, entryReviewFundingHref, entryReviewHref, fundingHref, purchaseOptionHref, type FundingContinuation } from "@/lib/wallet/funding-navigation";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { selectedTransaction } from "@/lib/wallet/selected-transaction";
import { transactionOriginHref, transactionOriginParams } from "@/lib/wallet/ledger-return";
import { getCompleteLedgerHistory } from "@/lib/wallet/history";
import { parseEntryQuantity, productEntryHref } from "@/lib/entries/return-intent";
import { parseDemoWalletHistoryVisibility, type DemoWalletHistoryVisibility } from "@/lib/wallet/demo-history";
import { checkDemoPurchaseReceipt } from "@/lib/account/bulk-purchase-actions";
import { checkoutCards, checkoutReceiptId } from "@/lib/account/checkout-cards";
import { CheckoutGiftCardList } from "@/components/account/CheckoutGiftCardList";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { matchingQueryValue } from "@/lib/navigation/query-value";
import checkout from "@/components/account/purchase-checkout.module.css";
import cardStyles from "@/components/account/checkout-gift-cards.module.css";

export async function generateMetadata({ searchParams }: PageProps<"/account/wallet">): Promise<Metadata> {
  const query = await searchParams;
  const history = query.reward === undefined && query.rewardId === undefined && ["history", "card", "saved-cards"].includes(matchingQueryValue(query.view) ?? "");
  return { title: history ? "Wallet & Transactions" : "Gift Cards & Rewards" };
}

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ prize?: string | string[]; reward?: string | string[]; rewardId?: string | string[]; order?: string | string[]; via?: string | string[]; rewardBrowse?: string | string[]; view?: string | string[]; panel?: string | string[]; panelUnavailable?: string | string[]; rewards?: string | string[]; expiredEntry?: string | string[]; expiredFocus?: string | string[]; tile?: string | string[]; card?: string | string[]; rewardHistory?: string | string[]; orderFilter?: string | string[]; fromOrders?: string | string[]; from?: string | string[]; browse?: string | string[]; share?: string | string[]; entry?: string | string[]; quantity?: string | string[]; review?: string | string[]; filter?: string | string[]; transaction?: string | string[]; entryTransaction?: string | string[]; entryWalletView?: string | string[]; entryFromOrders?: string | string[]; entryOrderFilter?: string | string[]; landing?: string | string[]; walletView?: string | string[]; choice?: string | string[]; deposit?: string | string[]; depositRow?: string | string[]; weeklyDeposit?: string | string[]; depositList?: string | string[]; alerts?: string | string[]; notice?: string | string[]; receipt?: string | string[]; checkout?: string | string[]; transactionSearch?: string | string[] }> }) {
  const rawQuery = await searchParams;
  const rewardId = matchingQueryValue(rawQuery.rewardId);
  const query = {
    ...rawQuery,
    reward: matchingQueryValue(rawQuery.reward) ?? rawQuery.reward,
    rewardId: rewardId && checkoutReceiptId.test(rewardId) ? rewardId.toLowerCase() : rewardId ?? rawQuery.rewardId,
    view: matchingQueryValue(rawQuery.view) ?? rawQuery.view,
    panel: matchingQueryValue(rawQuery.panel) ?? rawQuery.panel,
    transactionSearch: typeof rawQuery.transactionSearch === "string" && rawQuery.transactionSearch.length <= 240 ? rawQuery.transactionSearch.trim() || undefined : undefined,
    rewards: matchingQueryValue(rawQuery.rewards) ?? rawQuery.rewards,
  };
  const requestedReward = query.reward !== undefined || query.rewardId !== undefined;
  const history = !requestedReward && query.view === "history";
  const panelHash = new Map([
    ["transactions", "#transactions"], ["deposits", "#payment-deposits"], ["funding", "#add-funds"],
    ["methods", "#payment-methods"], ["card", "#wallet-add-card"],
  ]);
  const knownPanel = typeof query.panel === "string" ? panelHash.get(query.panel) : undefined;
  if (!requestedReward && query.view === "saved-cards") {
    redirect(accountPageReturnPath("/account/wallet", { ...query, view: "history", panel: "methods" }, "#payment-methods"));
  }
  if (!requestedReward && !history && (knownPanel || query.view === "card")) {
    const panel = query.view === "card" ? "card" : query.panel;
    redirect(accountPageReturnPath("/account/wallet", { ...query, view: "history", panel },
      query.view === "card" ? "#wallet-add-card" : knownPanel));
  }
  const invalidPanel = history && query.panel !== undefined && !knownPanel;
  if (invalidPanel) {
    const hasExactDestination = Boolean(query.transaction || query.deposit || query.from || query.weeklyDeposit);
    redirect(accountPageReturnPath("/account/wallet", { ...query, panel: undefined, panelUnavailable: hasExactDestination ? undefined : "1", landing: hasExactDestination ? undefined : "balance" }, hasExactDestination ? "" : "#balance"));
  }
  const recoveryKey = history && typeof query.deposit === "string" && depositRequestKeyPattern.test(query.deposit) ? query.deposit : undefined;
  const weeklyDeposit = history && typeof query.weeklyDeposit === "string" && depositRequestKeyPattern.test(query.weeklyDeposit) ? query.weeklyDeposit : undefined;
  const depositRow = history && !recoveryKey && query.panel === "deposits" && typeof query.depositRow === "string" && depositRequestKeyPattern.test(query.depositRow) ? query.depositRow : undefined;
  const fromRewardHistory = query.rewardHistory === "1";
  // A return link may name an existing catalog prize, not arbitrary content.
  const fromProduct = history && typeof query.from === "string" ? getDemoProduct(query.from) : undefined;
  const parsedQuantity = parseEntryQuantity(matchingQueryValue(query.quantity));
  const invalidQuantity = Boolean(fromProduct && query.quantity !== undefined && parsedQuantity === null);
  const requestedQuantity = parsedQuantity ?? 1;
  const entryOrigin = { transaction: query.entryTransaction, walletView: query.entryWalletView, fromOrders: query.entryFromOrders, orderFilter: query.entryOrderFilter, alerts: query.alerts, notice: query.notice };
  const account = await getAccountContext("report");
  if (account === "unavailable") return <AccountSessionRetry />;
  if (!account) {
    const purchaseArrival = requestedReward && query.via === "purchase" && typeof query.rewardId === "string";
    const paymentPanel = history && (query.panel === "methods" || query.panel === "card");
    const rewardSection = !requestedReward && !history && (query.prize || fromRewardHistory || ["all", "ready", "used", "expired", "history", "other"].includes(String(query.rewards)))
      ? (query.rewards === "ready" || query.prize && !query.rewards) && !fromRewardHistory ? "#ready-rewards" : "#reward-history" : "";
    const next = recoveryKey ? accountPageReturnPath("/account/wallet", query, "#purchase-deposit")
      : paymentPanel ? accountPageReturnPath("/account/wallet", query, query.panel === "card" ? "#wallet-add-card" : "#payment-methods")
      : history && !query.transaction && (query.panel === "transactions" || query.panel === "deposits")
      ? accountPageReturnPath("/account/wallet", query, query.panel === "transactions" ? "#transactions" : "#payment-deposits")
      : history && query.landing === "balance" ? accountPageReturnPath("/account/wallet", query, "#balance")
      : invalidQuantity && fromProduct && query.entry === undefined ? productEntryHref(fromProduct.slug, 1, query.browse, query.share).replace(/#enter-entry$/, "#entry-action")
      : invalidQuantity && typeof query.entry === "string" && /^ent_[a-f0-9]{32}$/i.test(query.entry)
        ? accountPageReturnPath(`/account/entries/${query.entry}`, { filter: query.filter, ...entryReviewContext(entryOrigin) }, "#add-entries-title")
      : history && !query.transaction && (fromProduct || query.panel === "funding") ? query.review === "entry" && fromProduct
      ? entryReviewFundingHref(fromProduct.slug, typeof query.entry === "string" ? query.entry : undefined, requestedQuantity, query.filter, entryOrigin)
      : fundingHref(fromProduct?.slug, typeof query.entry === "string" ? query.entry : undefined, requestedQuantity, query.browse, query.choice, query.share)
      : accountPageReturnPath("/account/wallet", query, history && typeof query.transaction === "string" ? `#transaction-${query.transaction}` : weeklyDeposit ? "#weekly-deposit-heading" : purchaseArrival ? "#reward-pass" : typeof query.checkout === "string" ? "#checkout-gift-cards" : rewardSection);
    // A legacy bookmark may still carry only an in-page fragment. Let the browser
    // inherit it here so the sign-in form can recover the allowlisted panel.
    const loginAnchor = next === "/account/wallet?view=history" || next === "/account/wallet" ? "" : "#login-form";
    redirect(`${authNavigationHref("/login", next)}&focus=email${loginAnchor}`);
  }
  const fromEntry = fromProduct && typeof query.entry === "string" && account.activity.source !== "unavailable"
    ? findActivityItem(account.activity.activity, fromProduct.slug, query.entry) : undefined;
  const forEntry = fromProduct && (query.entry === undefined || fromEntry?.status === "active");
  const availability = forEntry && !invalidQuantity && account.wallet ? await getOfferingAvailability() : null;
  const currentAvailability = forEntry ? availability?.[fromProduct.slug] : undefined;
  const selectionUnavailable = currentAvailability !== undefined && currentAvailability.remaining < requestedQuantity;
  const amounts = forEntry ? entryFundingAmounts(availability?.[fromProduct.slug]?.entryPriceCents ?? null, requestedQuantity, account.wallet?.balanceCents ?? null) : undefined;
  const fundingReturn: FundingContinuation | undefined = query.entry !== undefined
    ? fromEntry ? fromEntry.status === "active"
      ? { title: fromEntry.title, href: entryReviewHref(fromEntry.entryId!, requestedQuantity, query.filter, entryOrigin), label: "Back to entry review", entryQuantity: requestedQuantity,
          entryDepositReturn: entryReviewFundingHref(fromEntry.slug, fromEntry.entryId!, requestedQuantity, query.filter, entryOrigin), ...amounts }
      : isWalletReward(fromEntry) && fromEntry.rewardId
        ? { title: fromEntry.title, rewardSource: isPurchasedReward(fromEntry) ? "purchase" : fromEntry.rewardSource ?? "winner", href: `/account/wallet?${new URLSearchParams({ reward: fromEntry.slug, rewardId: fromEntry.rewardId, ...entryReviewContext(entryOrigin) })}#reward-pass`, label: "Open gift card" }
        : { title: fromEntry.title, href: fromEntry.status === "completion" ? purchaseOptionHref(fromEntry.slug, fromEntry.entryId!, query.choice) ? `${purchaseOptionHref(fromEntry.slug, fromEntry.entryId!, query.choice)}${Object.keys(entryReviewContext(entryOrigin)).length ? `&${new URLSearchParams(entryReviewContext(entryOrigin))}` : ""}` : activityHref(fromEntry) : activityHref(fromEntry), label: fromEntry.status === "completion" ? "Back to purchase option" : undefined }
    : undefined
    : fromProduct ? { title: fromProduct.title, href: productEntryHref(fromProduct.slug, requestedQuantity, query.browse, query.share).replace(/#enter-entry$/, "#entry-action") } : undefined;
  if (fundingReturn && forEntry) {
    if (invalidQuantity) {
      fundingReturn.invalidQuantity = true;
      fundingReturn.entryQuantity = undefined;
      fundingReturn.entryDepositReturn = undefined;
      if (fromEntry?.status === "active" && fromEntry.entryId) {
        const entryPath = `/account/entries/${fromEntry.entryId}`;
        fundingReturn.href = accountPageReturnPath(entryPath, { filter: query.filter, ...entryReviewContext(entryOrigin) });
      } else {
        fundingReturn.href = fundingReturn.href.replace(/#enter-entry$/, "#entry-action");
      }
    } else if (selectionUnavailable) {
      fundingReturn.entryQuantity = undefined;
      fundingReturn.shortfallCents = undefined;
      fundingReturn.depositCents = undefined;
      fundingReturn.selectionUnavailable = true;
    } else Object.assign(fundingReturn, { entryQuantity: requestedQuantity, ...amounts });
  }
  const stalePurchaseReturn = recoveryKey && fromEntry && fromEntry.status !== "active"
    && !openPrizeOptions([fromEntry], fromEntry.slug).length;
  // A URL only selects from this authenticated account's authorized data.
  const rewardConflict = Array.isArray(query.reward) || Array.isArray(query.rewardId);
  const matchingRewards = rewardConflict ? [] : walletRewards(account.activity).filter(item => typeof query.reward !== "string" || item.slug === query.reward);
  const reward = typeof query.rewardId === "string"
    ? matchingRewards.find(item => item.rewardId === query.rewardId)
    : typeof query.reward === "string" && !account.activity.incomplete && matchingRewards.length === 1 ? matchingRewards[0] : undefined;
  const checkoutSlug = requestedReward
    ? query.via === "purchase" && reward && isPurchasedReward(reward) ? reward.slug : undefined
    : !history && typeof query.checkout === "string" ? query.checkout : undefined;
  const receiptId = typeof query.receipt === "string" && checkoutReceiptId.test(query.receipt) ? query.receipt : undefined;
  const receipt = checkoutSlug && receiptId ? await checkDemoPurchaseReceipt(receiptId, checkoutSlug) : null;
  const purchasedCards = receipt?.status === "succeeded" && checkoutSlug ? checkoutCards(account.activity, checkoutSlug, receipt.rewardIds) : [];
  if (!requestedReward && checkoutSlug && receiptId) {
    const focused = purchasedCards.find(card => card.id === query.card);
    const target = focused ? `checkout-card-${focused.id}` : "checkout-gift-cards";
    return <div className={checkout.page}><div className={checkout.shell}>
      <AccountSettingsLandingScroll target={target} visitKey={`${receiptId}:${target}`} settleAfterNavigation allScreens />
      <h1 id="checkout-gift-cards" className={cardStyles.title}>Gift Cards &amp; Rewards</h1>
      <section className={`${checkout.ticket} ${checkout.content}`} aria-labelledby="checkout-cards-heading">
        <h2 id="checkout-cards-heading" className={cardStyles.heading}>Cards from this checkout</h2>
        {receipt?.status === "succeeded" ? <CheckoutGiftCardList cards={purchasedCards} count={receipt.purchasedCount} slug={checkoutSlug} receipt={receiptId} focused={focused?.id} />
          : <>
            <p role="status">We couldn’t load this checkout.</p>
            <AccountReadRetryLink href={accountPageReturnPath("/account/wallet", query, "#checkout-gift-cards")} className={`${cardStyles.secondary} ${cardStyles.returnButton}`}>Check this checkout again</AccountReadRetryLink>
          </>}
        <Link href={completedActivityHref(focused?.item.entryId ?? purchasedCards[0]?.item.entryId, receipt?.status === "succeeded" ? { slug: checkoutSlug, receipt: receiptId } : undefined)} className={`${cardStyles.secondary} ${cardStyles.returnButton}`}>← Back to My Activity</Link>
        <Link href="/account/wallet#ready-rewards" className={`${cardStyles.secondary} ${cardStyles.returnButton}`}>See all gift cards &amp; rewards</Link>
      </section>
    </div></div>;
  }
  const rewardView = query.rewards === "ready" || query.rewards === "used" || query.rewards === "expired" || query.rewards === "history" || query.rewards === "other"
    ? query.rewards : "all";
  const rewardPrize = typeof query.prize === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.prize)
    && (getDemoProduct(query.prize) || account.activity.activity.some(item => item.slug === query.prize)) ? query.prize : undefined;
  const rewardScope = new URLSearchParams();
  if (rewardView !== "all") rewardScope.set("rewards", rewardView);
  if (rewardPrize) rewardScope.set("prize", rewardPrize);
  const rewardListHref = rewardScope.size ? `/account/wallet?${rewardScope}#${rewardView === "ready" || rewardView === "all" ? "ready-rewards" : "reward-history"}` : "/account/wallet";
  const demoDb = history && account.wallet?.scope === "demo" ? await createClient() : null;
  const provider = demoDb ? new DemoPaymentProvider(demoDb) : null;
  const [requests, savedCards, transaction, ledgerEntries, visibilityResult, catalog] = await Promise.all([
    history && provider ? provider.getRequests().catch(() => null) : null,
    provider ? provider.getPaymentMethods().catch(() => undefined) : [],
    history ? selectedTransaction(query.transaction, account.userId, account.wallet).catch(() => ({ requested: true, entry: null, failed: true })) : undefined,
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
    const matchingOrders = typeof query.rewardId === "string" ? account.orders?.orders.filter(order => order.rewardId === query.rewardId) ?? [] : [];
    const matchingOrder = query.order !== undefined
      ? matchingOrders.find(order => order.orderNumber === query.order)
      : matchingOrders.length === 1 ? matchingOrders[0] : undefined;
    const orderReturn = matchingOrder ? exactOrderHref(matchingOrder.orderNumber, fulfillmentFilter(query.orderFilter), false, orderNotification, orderContext?.filter, checkedNotice) : undefined;
    const ordersVisit = ["orders", "order-notification", "order-selection"].includes(String(query.via));
    const ordersBackHref = orderReturn ?? (ordersVisit ? fulfillmentHref(undefined, fulfillmentFilter(query.orderFilter), false, undefined, orderContext) : undefined);
    if (account.activity.source === "unavailable" || account.activity.incomplete && !reward) {
      const retryHref = accountPageReturnPath("/account/wallet", query, query.via === "purchase" ? "#reward-pass" : "");
      const sourceTransaction = transactionOriginHref(query);
      const sourceUpdate = checkedNotice ? notificationHref(notificationFilter(query.alerts), checkedNotice) : undefined;
      return <PageContainer><div className="mx-auto w-full max-w-6xl pb-10"><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 className="text-lg font-bold text-white">We couldn’t load your reward</h1><p className="mt-2 text-sm text-[#b5cce4]">Your reward information is temporarily unavailable. Try again to check this saved reward.</p><AccountReadRetryLink href={retryHref} className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-4 text-sm font-bold text-[#06223d]">Try again</AccountReadRetryLink><Link href={ordersBackHref ?? sourceTransaction ?? sourceUpdate ?? rewardListHref} className="ml-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">{orderReturn ? "Back to this order" : ordersBackHref ? "Back to orders & rewards" : sourceTransaction ? "Back to this transaction" : sourceUpdate ? "Back to this notification" : "Back to your wallet ›"}</Link></div></div></PageContainer>;
    }
    let claimedCode: string | null = null;
    let crewMembers: { id: string; name: string }[] | null = [];
    let sharedCrewRecipients: string[] | null = [];
    if (reward?.status === "prize" && reward.rewardId) {
      const db = await createClient();
      try {
        const [{ data, error }, shared] = await Promise.all([
          db.rpc("get_crew_member_profiles"),
          getOwnWinShareRecipients(reward.rewardId),
        ]);
        sharedCrewRecipients = shared;
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
        ? matchingOrder : undefined;
      const winFilter = query.via === "won" ? "prize" : query.via === "completed-win" ? "completed" : query.via === "activity-win" ? "all" : null;
      const notice = validNotice(query.notice) ? query.notice : undefined;
      const alerts = query.alerts === undefined ? sourceOrder?.status === "exception" ? "action" : "orders" : notificationFilter(query.alerts);
      const shoppingReturn = productBrowseReturnPath(query.rewardBrowse);
      const returnLink = transactionId && typeof query.rewardId === "string" && (query.via === undefined || query.via === "purchase")
        ? { href: transactionOriginHref(query)!, label: "Back to this transaction" }
        : query.via === "activity-purchase" && isPurchasedReward(reward) && reward.rewardId
          ? { href: `/account/entries?viewedReward=${encodeURIComponent(reward.rewardId)}#${openEntriesAnchorId}`, label: "Back to My Activity" }
        : query.via === "completed" && typeof query.rewardId === "string" && isPurchasedReward(reward) && reward.rewardId
          ? { href: reward.entryId ? completedActivityHref(reward.entryId) : "/account/entries?filter=completed&viewedReward=" + encodeURIComponent(reward.rewardId) + "#" + openEntriesAnchorId, label: "Back to this purchase" }
          : typeof query.rewardId === "string" && fromOrders && reward.rewardId
            ? query.via === "order-notification"
              ? { href: notificationHref(alerts, notice), label: "Back to order updates" }
              : query.via === "order-selection"
                ? { href: sourceOrder ? exactOrderHref(sourceOrder.orderNumber, orderFilter) : fulfillmentHref(reward.rewardId, orderFilter), label: sourceOrder ? "Back to this order" : "Back to this reward" }
              : { href: fulfillmentHref(undefined, orderFilter, false, reward.rewardId), label: `Return to ${orderFilter === "all" ? "All orders & rewards" : fulfillmentFilterLabel[orderFilter]}` }
            : typeof query.rewardId === "string" && winFilter && !isPurchasedReward(reward) && reward.status === "prize" && reward.entryId
              ? { href: `/account/entries?filter=${winFilter}&viewed=${encodeURIComponent(reward.entryId)}#${openEntriesAnchorId}`, label: "Back to this win in My Activity" }
              : notice && query.alerts !== undefined && (query.via === undefined || query.via === "purchase")
                ? { href: notificationHref(alerts, notice), label: "Back to notifications" }
                : shoppingReturn ? { href: shoppingReturn, label: `Back to ${productBrowseReturnLabel(shoppingReturn)}` } : undefined;
      const fulfillmentReturn = sourceOrder
        ? exactOrderHref(sourceOrder.orderNumber, orderFilter, false, orderNotification, orderContext?.filter, notice)
        : orderContext ? fulfillmentHref(reward.rewardId ?? undefined, orderFilter, false, undefined, orderContext) : undefined;
      return <WalletRewardDetail claimCheckHref={accountPageReturnPath("/account/wallet", query, "#reward-pass")} orderFilter={orderFilter} fulfillmentReturn={fulfillmentReturn} fromPurchase={fromPurchase} returnTile={query.tile === "1"} returnHistory={fromRewardHistory} returnPrize={rewardPrize === reward.slug ? rewardPrize : undefined} returnView={query.rewards === rewardView ? rewardView : undefined} timeZone={account.timezone} locale={account.preferredLocale} item={reward}
        isPreview={account.activity.isPreview} claimedCode={claimedCode} crewMembers={crewMembers} sharedCrewRecipients={sharedCrewRecipients} returnLink={returnLink} checkoutContext={checkoutContext}
        overview={{ activity: account.activity, balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled }} />;
    }
    if (account.activity.isPreview && typeof query.rewardId === "string" && checkoutReceiptId.test(query.rewardId)) {
      const db = await createClient();
      const restart = await db.from("demo_reward_restarts")
        .select("reward_id")
        .eq("customer_id", account.userId)
        .eq("reward_id", query.rewardId)
        .eq("idempotency_key", `restart_${query.rewardId.replaceAll("-", "")}`)
        .maybeSingle();
      if (!restart.error && restart.data) {
        const original = await db.from("customer_rewards").select("customer_entry_id").eq("id", query.rewardId).eq("customer_id", account.userId).maybeSingle();
        const entry = original.data?.customer_entry_id
          ? await db.from("customer_entries").select("offering_slug").eq("id", original.data.customer_entry_id).eq("customer_id", account.userId).maybeSingle()
          : null;
        const product = !entry?.error && typeof entry?.data?.offering_slug === "string" ? getDemoProduct(entry.data.offering_slug) : null;
        return <PageContainer><section id="reward-pass" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6" aria-labelledby="reward-restarted-title">
          <h1 id="reward-restarted-title" className="text-lg font-bold text-white">Demo reward restarted</h1>
          <p className="mt-2 text-sm text-[#b5cce4]">This reward was removed from your current demo view. Your original entry and wallet history are saved.</p>
          {product ? <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-4 text-sm font-bold text-[#06223d]" href={`/items/${product.slug}#enter-entry`}>Return to {product.title}</Link> : null}
          <Link href={rewardListHref} className="ml-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">Back to your wallet</Link>
        </section></PageContainer>;
      }
    }
    const returnToTransaction = transactionOriginHref(query);
    const origin = ordersBackHref ?? returnToTransaction ?? (checkedNotice ? notificationHref(notificationFilter(query.alerts), checkedNotice) : undefined);
    const ambiguous = query.rewardId === undefined && typeof query.reward === "string" && matchingRewards.length > 1;
    const cardScope = new URLSearchParams(rewardScope);
    if (ambiguous) {
      for (const [key, value] of Object.entries(transactionOriginParams(query) ?? {})) cardScope.set(key, value);
      if (checkedNotice) {
        cardScope.set("notice", checkedNotice);
        cardScope.set("alerts", notificationFilter(query.alerts));
      }
      if (fromRewardHistory) cardScope.set("rewardHistory", "1");
    }
    if (ambiguous) return <PageContainer>
      <AccountSettingsLandingScroll target="reward-unavailable-title" initialTarget="reward-unavailable-title" focusTarget="reward-unavailable-title" allScreens />
      <h1 id="reward-unavailable-title" tabIndex={-1} className="text-2xl font-bold">Choose your gift card</h1>
      <p className="mt-2">Your wallet contains more than one card for this prize. Choose its exact reference.</p>
      <ul className="mt-4 space-y-3">{matchingRewards.map(item => item.rewardId ? <li key={item.rewardId}>
        <Link className="font-bold text-cyan-300 underline" href={walletRewardHref(item) + (cardScope.size ? `&${cardScope}` : "") + "#reward-pass"}>{item.title} · Ref. {item.rewardId.slice(-8).toUpperCase()}</Link>
      </li> : null)}</ul>
      <Link href={rewardListHref} className="mt-4 inline-flex min-h-11 items-center font-bold text-cyan-300">Back to your wallet</Link>
    </PageContainer>;
    return <PageContainer><AccountSettingsLandingScroll target="reward-unavailable-title" initialTarget="reward-unavailable-title" focusTarget="reward-unavailable-title" allScreens /><div className="mx-auto w-full max-w-6xl pb-10"><Link href="/account/entries" className="text-sm text-[#b5cce4] hover:text-cyan-300">‹ My Activity</Link><div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h1 id="reward-unavailable-title" tabIndex={-1} className="text-lg font-bold text-white">Reward unavailable</h1><p className="mt-2 text-sm text-[#b5cce4]">That reward is not available in your account.</p><Link href={origin ?? rewardListHref} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">{ordersBackHref ? "Back to orders & rewards" : returnToTransaction ? "Back to this transaction" : origin ? "Back to this notification" : "Back to your wallet ›"}</Link></div></div></PageContainer>;
  }
  if (history) {
    const hiddenProducts = catalog && !catalog.unavailable ? catalog.hidden : new Set(resolvedCatalogSlugs(account.activity));
    const ordersFilter = query.fromOrders === "1" && query.panel === "transactions" ? fulfillmentFilter(query.orderFilter) : undefined;
    return <WalletOverview transactionSearch={query.panel === "transactions" ? query.transactionSearch : undefined} unavailablePanel={query.panelUnavailable === "1"} ordersFilter={ordersFilter} ordersReturnHref={ordersFilter ? fulfillmentHref(undefined, ordersFilter) : undefined} landOnBalance={query.landing === "balance" && !recoveryKey && !transaction?.requested} notificationReturnHref={validNotice(query.notice) ? notificationHref(notificationFilter(query.alerts), query.notice) : undefined} hiddenProducts={hiddenProducts} restoreLedgerView={query.walletView === "1"} transactionRetryHref={transactionOriginHref(query)} timeZone={account.timezone} initialSection={query.panel === "methods" || query.panel === "card" ? query.panel : undefined} displayName={account.displayName} wallet={account.wallet} ledgerEntries={ledgerEntries} demoHistoryVisibility={demoHistoryVisibility} activity={account.activity} selectedTransaction={transaction} fundingEnabled={account.fundingEnabled} requestKey={randomUUID()} recoveryKey={recoveryKey} depositRow={depositRow} weeklyDeposit={weeklyDeposit} fromDeposits={query.panel === "deposits"} depositList={query.depositList === "1"} requests={requests} savedCards={savedCards ?? []} cardUnavailable={savedCards === undefined} returnToProduct={stalePurchaseReturn ? undefined : fundingReturn} returnUnavailable={query.entry !== undefined && !fromEntry ? query.review === "entry" ? "entry" : "purchase" : false} />;
  }
  const focusCard = typeof query.card === "string" ? query.card : undefined;
  const expiredView = rewardView === "expired" || fromRewardHistory;
  const expired = expiredView && typeof query.expiredEntry === "string" && account.activity.source !== "unavailable"
    ? account.activity.activity.find(item => item.entryId === query.expiredEntry && item.completionOptionStatus === "expired" && (!rewardPrize || item.slug === rewardPrize)) : undefined;
  const focusExpired = expiredView && typeof query.expiredFocus === "string" ? query.expiredFocus : expired?.entryId;
  const cardEndings = rewardView === "used" || rewardView === "expired" ? {} : await rewardCardEndings(account.activity, async id => {
    const db = await createClient();
    const { data, error } = await db.rpc("get_claimed_reward", { p_reward_id: id });
    return error ? null : data;
  });
  const expiredSelection = expiredView && typeof query.expiredEntry === "string" && !expired
    ? account.activity.source === "unavailable" || account.activity.incomplete ? "unavailable" : "missing" : undefined;
  const rewards = <><LegacyWalletFragment /><WalletRewards prize={rewardPrize} invalidPrize={query.prize !== undefined && !rewardPrize} invalidWalletView={query.view !== undefined} invalidView={query.rewards !== undefined && query.rewards !== "all" && rewardView === "all"} transactionReturn={transactionOriginHref(query)} expiredSelection={expiredSelection} expiredRetryHref={expiredSelection === "unavailable" ? accountPageReturnPath("/account/wallet", query, "#reward-history") : undefined} cardEndings={cardEndings} timeZone={account.timezone} locale={account.preferredLocale} state={account.activity} balanceLabel={account.balanceLabel} fundingEnabled={account.fundingEnabled} view={rewardView} focusCard={fromRewardHistory ? undefined : focusCard} focusHistoryCard={focusExpired ?? (fromRewardHistory || rewardView === "used" || rewardView === "history" || rewardView === "other" || rewardView === "expired" ? focusCard : undefined)} /></>;
  if (!expired?.entryId) return rewards;
  const expiredReturn = new URLSearchParams({
    rewards: fromRewardHistory ? rewardView : "expired",
    expiredFocus: expired.entryId,
    ...(fromRewardHistory ? { rewardHistory: "1" } : {}),
    ...(rewardPrize ? { prize: rewardPrize } : {}),
    ...(transactionOriginParams(query) ?? {}),
  });
  const historyReturn = `/account/wallet?${expiredReturn}#wallet-reward-${encodeURIComponent(expired.entryId)}`;
  return <>{rewards}<ActivityDetailDialog item={expired} destination="/account/entries" expiredWalletReturn={(!fromRewardHistory && transactionOriginHref(query)) || historyReturn} /></>;
}
