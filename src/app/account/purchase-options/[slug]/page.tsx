import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PurchaseOptionRail } from "@/components/account/PurchaseOptionRail";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { activityHref, findActivityItem, isPurchasedReward, openPrizeOptions, purchasedRewardHref } from "@/lib/account/activity";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountReturnPath } from "@/lib/auth/account-return";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import styles from "@/components/account/purchase-options.module.css";
import { PurchaseCheckout } from "@/components/account/PurchaseCheckout";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your Purchase Options" };

type OfferQuery = Partial<Record<"option" | "resume" | "choice" | "decline", string | string[]>>;

export default async function PurchaseOptionsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<OfferQuery> }) {
  const { slug } = await params;
  const query = await searchParams;
  const { option: selectedEntryId, decline } = query;
  const prizePath = `/account/purchase-options/${encodeURIComponent(slug)}`;
  const selectors = new URLSearchParams();
  for (const key of ["option", "resume", "choice", "decline"] as const) {
    const value = query[key];
    if (Array.isArray(value)) notFound();
    if (value !== undefined) selectors.set(key, value);
  }
  const returnPath = accountReturnPath(selectors.size ? `${prizePath}?${selectors}` : prizePath);
  if (!returnPath || Array.isArray(selectedEntryId)) notFound();
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", returnPath));
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
  if (selectedEntryId !== undefined && !options.some(option => option.entryId === selectedEntryId)) {
    if (typeof selectedEntryId !== "string" || !selectedEntryId) notFound();
    const ticket = findActivityItem(activity, slug, selectedEntryId);
    if (!ticket) notFound();
    if (isPurchasedReward(ticket)) {
      redirect(ticket.rewardId ? purchasedRewardHref(ticket.rewardId, slug) : "/account/entries?filter=completed");
    }
    redirect(activityHref(ticket));
  }
  if (options.length === 0) {
    if (activity.some(ticket => ticket.slug === slug && ticket.completionOptionStatus === "declined")) redirect("/account/declined-offers");
    if (activity.some(ticket => ticket.slug === slug && isPurchasedReward(ticket))) redirect("/account/entries?filter=completed");
    notFound();
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
    return <PurchaseCheckout key={JSON.stringify([account.userId, slug, selectedEntryId, decline === "confirm", options.map(option => option.completionOptionId)])} ownerId={account.userId} options={options}
      initiallySelectedEntryId={selectedEntryId} initiallyConfirmDecline={decline === "confirm"} initialBalance={account.wallet.balanceCents}
      cards={cards ?? []} fundingAvailable={account.fundingEnabled && cards !== null}
      fundingBlocked={requests === null || requests.some(request => request.reconciliation !== "reconciled")} />;
  }
  return <main className={styles.page}>
    <AccountSettingsLandingScroll target={canBulkDecline && decline === "confirm" ? "purchase-option-rail" : "purchase-options-intro"} visitKey={`${slug}:${selectedEntryId ?? "first"}:${decline ?? "view"}`} settleAfterNavigation />
    <div className={styles.shell}>
      <div className={styles.topline}>
        <div><p className={styles.eyebrow}>MY ACTIVITY</p><h1>Your Purchase Options</h1><p className={styles.subtitle}>These are your {count} separate purchase {count === 1 ? "option" : "options"}.</p></div>
        <div className={styles.topActions}>
          <Link href="/" className={styles.shopping}>Continue shopping</Link>
          <Link href="/account/entries?filter=completion" className={styles.return}>Return to My Activity <span aria-hidden="true">→</span></Link>
          <Link href="/account/entries?filter=completion" className={styles.close} aria-label="Close purchase options and return to My Activity">×</Link>
        </div>
      </div>

      <PurchaseOptionRail key={`${selectedEntryId ?? "first"}:${decline ?? "view"}`} title={item.title} options={options} initiallySelectedEntryId={selectedEntryId} initiallyConfirmDecline={canBulkDecline && decline === "confirm"} canBulkDecline={canBulkDecline} showSummary />

      <section className={styles.explanation} aria-labelledby="option-explanation-heading">
        <p className={styles.eyebrow}>YOUR CHOICE</p>
        <h2 id="option-explanation-heading">Each option stands on its own.</h2>
        <p>Choose the exact option you want to review. Its entry credit only applies to that option; credits from separate tickets do not combine. Completing a purchase is optional.</p>
      </section>
    </div>
  </main>;
}
