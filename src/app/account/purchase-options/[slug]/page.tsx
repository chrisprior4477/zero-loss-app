import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PurchaseOptionRail } from "@/components/account/PurchaseOptionRail";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { activityHref, completedActivityHref, findActivityItem, isPurchasedReward, openPrizeOptions, purchasedRewardHref } from "@/lib/account/activity";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { getAccountContext } from "@/lib/account/context";
import { offerTicketLabels } from "@/lib/account/offer-ticket-labels";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountReturnPath } from "@/lib/auth/account-return";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { notificationHref, notificationFilter, validNotice } from "@/lib/account/notification-return";
import { transactionOriginHref } from "@/lib/wallet/ledger-return";
import styles from "@/components/account/purchase-options.module.css";
import { DeclinePurchaseOffersDialog } from "@/components/account/DeclinePurchaseOffersDialog";
import { PurchaseCheckout } from "@/components/account/PurchaseCheckout";
import { CompletedPurchaseReceipt } from "@/components/account/CompletedPurchaseReceipt";
import { checkDemoPurchaseReceipt } from "@/lib/account/bulk-purchase-actions";
import { checkoutCards } from "@/lib/account/checkout-cards";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your Purchase Options" };

type OfferQuery = Partial<Record<"option" | "resume" | "choice" | "decline" | "receipt" | "transaction" | "walletView" | "fromOrders" | "orderFilter" | "alerts" | "notice", string | string[]>>;

export default async function PurchaseOptionsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<OfferQuery> }) {
  const { slug: requestedSlug } = await params;
  const slug = requestedSlug.toLowerCase();
  const query = await searchParams;
  const { option: selectedEntryId, decline, receipt } = query;
  const invalidOption = typeof selectedEntryId === "string" && !/^ent_[a-f0-9]{32}$/i.test(selectedEntryId);
  const optionId = typeof selectedEntryId === "string" && !invalidOption ? selectedEntryId.toLowerCase() : undefined;
  const prizePath = `/account/purchase-options/${encodeURIComponent(slug)}`;
  const notificationReturn = validNotice(query.notice) ? notificationHref(notificationFilter(query.alerts), query.notice) : undefined;
  const selectors = new URLSearchParams();
  for (const key of ["option", "resume", "choice", "decline", "receipt", "transaction", "walletView", "fromOrders", "orderFilter", "alerts", "notice"] as const) {
    const value = query[key];
    if (Array.isArray(value)) notFound();
    if (key === "option") {
      if (optionId) selectors.set(key, optionId);
    } else if (value !== undefined) selectors.set(key, value);
  }
  const returnPath = accountReturnPath(selectors.size ? `${prizePath}?${selectors}` : prizePath);
  if (!returnPath || Array.isArray(selectedEntryId)) notFound();
  if (!invalidOption && (requestedSlug !== slug || optionId && optionId !== selectedEntryId)) redirect(returnPath);
  const walletHref = transactionOriginHref(query);
  const legacyDeclineSelectors = new URLSearchParams(selectors);
  legacyDeclineSelectors.delete("decline");
  const legacyDeclineReturnHref = legacyDeclineSelectors.size ? `${prizePath}?${legacyDeclineSelectors}` : prizePath;
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", returnPath));
  if (typeof receipt === "string") {
    const result = await checkDemoPurchaseReceipt(receipt, slug);
    if (result.status === "succeeded") {
      const title = account.activity.activity.find(item => item.slug === slug)?.title ?? "Your purchase";
      return <CompletedPurchaseReceipt key={receipt} title={title} totalCents={result.totalCents} count={result.purchasedCount}
        cards={checkoutCards(account.activity, slug, result.rewardIds ?? [])} slug={slug} receipt={receipt} fallbackHref={result.href} />;
    }
    return <div className={styles.page}><section className={styles.shell} aria-labelledby="purchase-receipt-check">
      <h1 id="purchase-receipt-check">Check this purchase</h1>
      <p>{result.status === "not_found" ? "No saved receipt was found for this purchase." : "We couldn’t verify this purchase yet."}</p>
      <div className={styles.topActions}>
        <a href={returnPath} className={styles.shopping}>Check again</a>
        {result.status === "not_found" ? <Link href={prizePath} className={styles.return}>Review current offers</Link> : null}
        {notificationReturn ? <Link href={notificationReturn} className={styles.return}>Back to this notification</Link> : null}
        {walletHref ? <Link href={walletHref} className={styles.return}>Back to this transaction</Link> : null}
        <Link href="/account/entries?filter=completed" className={styles.return}>Completed purchases</Link>
      </div>
    </section></div>;
  }
  if (account.activity.source === "unavailable") {
    return <section className={styles.page} aria-labelledby="offers-unavailable-title">
      <div className={styles.shell}><div className={styles.topline}>
        <div><h1 id="offers-unavailable-title">We couldn’t load your purchase options</h1>
          <p>Try again to check the current status of your offers.</p></div>
        <div className={styles.topActions}>
          <a href={returnPath} className={styles.shopping}>Try again</a>
          <Link href="/account/entries?filter=completion" className={styles.return}>Go to My Activity</Link>
        </div>
      </div></div>
    </section>;
  }

  // The authenticated account read model is owner-scoped. Never fetch options
  // by a user ID or trust a count supplied through the URL.
  const activity = account.activity.activity;
  const options = openPrizeOptions(activity, slug)
    .sort((left, right) => (left.enteredAt ?? "").localeCompare(right.enteredAt ?? "") || (left.entryId ?? "").localeCompare(right.entryId ?? ""));
  if (decline === "undo" && account.wallet?.scope === "demo" && isPreviewDataEnvironment()) {
    const item = options[0] ?? activity.find(ticket => ticket.slug === slug && ticket.completionOptionStatus === "declined");
    if (item) return <div className={styles.page}><section className={styles.shell}>
      <h1>Check your declined offers</h1>
      <Link href={prizePath}>View purchase options</Link>
      <DeclinePurchaseOffersDialog item={item} recovering ownerId={account.userId}
        offeredOptionIds={options.flatMap(offer => offer.completionOptionId ? [offer.completionOptionId] : [])}
        ticketLabels={offerTicketLabels(activity.filter(ticket => ticket.slug === slug), activity)} />
    </section></div>;
  }
  if (invalidOption || optionId !== undefined && !options.some(option => option.entryId === optionId)) {
    const ticket = optionId ? findActivityItem(activity, slug, optionId) : undefined;
    if (!ticket) return <section className={styles.page} aria-labelledby="selected-offer-missing">
      <div className={styles.shell}>
        <AccountSettingsLandingScroll target="selected-offer-missing" initialTarget="selected-offer-missing" focusTarget="selected-offer-missing" allScreens />
        <h1 id="selected-offer-missing" tabIndex={-1}>This purchase option is unavailable</h1>
        <p>The selected option could not be opened for your account.</p>
        <div className={styles.topActions}>
          {walletHref ? <Link href={walletHref} className={styles.return}>Back to this transaction</Link> : null}
          {notificationReturn ? <Link href={notificationReturn} className={styles.return}>Back to this notification</Link> : null}
          {options.length ? <Link href={prizePath} className={styles.shopping}>View this prize’s available options</Link> : null}
          <Link href="/account/entries?filter=completion#my-activity-filters" className={styles.return}>Return to Purchase Options</Link>
        </div>
      </div>
    </section>;
    if (isPurchasedReward(ticket)) {
      redirect(ticket.rewardId ? purchasedRewardHref(ticket.rewardId, slug) : "/account/entries?filter=completed");
    }
    redirect(activityHref(ticket));
  }
  if (options.length === 0) {
    if (activity.some(ticket => ticket.slug === slug && ticket.completionOptionStatus === "declined")) redirect("/account/declined-offers");
    const completed = activity.find(ticket => ticket.slug === slug && isPurchasedReward(ticket));
    if (completed) redirect(completedActivityHref(completed.entryId));
    const expired = activity.filter(ticket => ticket.slug === slug && ticket.completionOptionStatus === "expired");
    const lastExpired = expired.sort((a, b) => (b.completionExpiresAt ?? "").localeCompare(a.completionExpiresAt ?? ""))[0];
    if (lastExpired) redirect(activityHref(lastExpired));
    const product = getDemoProduct(slug);
    if (!product) notFound();
    return <section className={styles.page} aria-labelledby="selected-offer-missing"><div className={styles.shell}>
      <AccountSettingsLandingScroll target="selected-offer-missing" initialTarget="selected-offer-missing" focusTarget="selected-offer-missing" allScreens />
      <h1 id="selected-offer-missing" tabIndex={-1}>No purchase options are available</h1>
      <p>There are no open purchase options for {product.title} in your account.</p>
      <div className={styles.topActions}>
        <Link href="/account/entries?filter=completion#my-activity-filters" className={styles.shopping}>View your purchase options</Link>
        <Link href="/account/entries?filter=completed#my-activity-filters" className={styles.return}>View completed activity</Link>
      </div>
    </div></section>;
  }

  const item = options[0];
  const count = options.length;
  const canBulkDecline = account.wallet?.scope === "demo" && isPreviewDataEnvironment();
  if (canBulkDecline && account.wallet && options.every(option => option.completionOptionId)) {
    const provider = new DemoPaymentProvider(await createClient());
    const [cards, requests] = await Promise.all([
      provider.getPaymentMethods().catch(() => null),
      provider.getRequests().catch(() => null),
    ]);
    return <PurchaseCheckout key={JSON.stringify([account.userId, slug, selectedEntryId, decline === "confirm", query?.choice, query?.resume, options.map(option => option.completionOptionId)])} returnTransactionHref={walletHref} notificationReturnHref={notificationReturn} ownerId={account.userId} walletId={account.wallet.walletAccountId ?? undefined} options={options}
      ticketLabels={offerTicketLabels(options, activity)} initiallySelectedEntryId={selectedEntryId} initiallyConfirmDecline={decline === "confirm"} legacyDeclineReturnHref={legacyDeclineReturnHref} initialBalance={account.wallet.balanceCents}
      cards={cards ?? []} cardsUnavailable={cards === null} creditedDeposits={requests?.filter(request => request.reconciliation === "reconciled").map(request => request.idempotencyKey)} fundingAvailable={account.fundingEnabled && cards !== null}
      pendingDeposits={requests?.filter(request => request.reconciliation !== "reconciled")
        .map(({ idempotencyKey, amount, reconciliation }) => ({ idempotencyKey, amount, reconciliation }))}
      fundingBlocked={requests === null || requests.some(request => request.reconciliation !== "reconciled")} />;
  }
  return <div className={styles.page}>
    <AccountSettingsLandingScroll target="purchase-option-rail" focusTarget="purchase-option-rail" allScreens restrictToTargetHash />
    <AccountSettingsLandingScroll skipForHash="purchase-option-rail" target={canBulkDecline && decline === "confirm" ? "purchase-option-rail" : "purchase-options-intro"} visitKey={`${slug}:${selectedEntryId ?? "first"}:${decline ?? "view"}`} settleAfterNavigation />
    <div className={styles.shell}>
      <div className={styles.topline}>
        <div><p className={styles.eyebrow}>MY ACTIVITY</p><h1>Your Purchase Options</h1><p className={styles.subtitle}>These are your {count} separate purchase {count === 1 ? "option" : "options"}.</p></div>
        <div className={styles.topActions}>
          <Link href="/" className={styles.shopping}>Continue shopping</Link>
          <Link href="/account/entries?filter=completion" className={styles.return}>Return to My Activity <span aria-hidden="true">→</span></Link>
          <Link href="/account/entries?filter=completion" className={styles.close} aria-label="Close purchase options and return to My Activity">×</Link>
        </div>
      </div>

      {notificationReturn && <Link href={notificationReturn} className={styles.return}>Back to this notification</Link>}
      {walletHref && <Link href={walletHref} className={styles.return}>Back to this transaction</Link>}
      <PurchaseOptionRail key={`${selectedEntryId ?? "first"}:${decline ?? "view"}`} title={item.title} options={options} initiallySelectedEntryId={selectedEntryId} initiallyConfirmDecline={canBulkDecline && decline === "confirm"} canBulkDecline={canBulkDecline} showSummary />

      <section className={styles.explanation} aria-labelledby="option-explanation-heading">
        <p className={styles.eyebrow}>YOUR CHOICE</p>
        <h2 id="option-explanation-heading">Each option stands on its own.</h2>
        <p>Choose the exact option you want to review. Its entry credit only applies to that option; credits from separate tickets do not combine. Completing a purchase is optional.</p>
      </section>
    </div>
  </div>;
}
