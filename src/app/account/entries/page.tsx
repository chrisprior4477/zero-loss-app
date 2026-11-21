import { PreferenceSnapshot } from "@/components/account/PreferenceSnapshot";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyZeroLossActivity } from "@/components/account/MyZeroLossActivity";
import { AccountIcon } from "@/components/account/AccountIcon";
import { getAccountContext } from "@/lib/account/context";
import { activityFilter, declinedOfferHref, filterActivity, findActivityItem, openEntriesAnchorId } from "@/lib/account/activity";
import styles from "@/components/account/my-activity.module.css";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { activityOfferMetrics } from "@/lib/account/activity-progress";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseEntryRequest, type EntryRequest } from "@/lib/entries/request";
import { repeatPurchaseStamps } from "@/lib/account/repeat-purchase";
import { checkDemoPurchaseReceipt } from "@/lib/account/bulk-purchase-actions";
import { notificationHref, notificationFilter, validNotice } from "@/lib/account/notification-return";
import { transactionOriginHref } from "@/lib/wallet/ledger-return";
import { checkoutReceiptId } from "@/lib/account/checkout-cards";

export const metadata: Metadata = { title: "My Activity" };

const accountLinks = [
  ["Orders & Fulfillment", "Your orders and delivery updates", "/account/orders", "/account/drawer/orders-fulfillment-324x180.png", "fill-panel"],
  ["Notifications", "Account messages and activity updates", "/account/notifications", "/account/drawer/notifications-exact-324x180.png", "full"],
  ["Account & Security", "Email confirmation and sign-in details", "/account/security", "/account/drawer/account-security-324x180.png", "zoom"],
] as const;

export default async function MyZeroLossPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await getAccountContext();
  const query = await searchParams;
  const filter = activityFilter(query.filter);
  if (query.filter !== undefined && query.filter !== filter) {
    redirect(accountPageReturnPath("/account/entries", { ...query, filter: undefined, filterReset: "1" }, `#${openEntriesAnchorId}`));
  }
  if (!account) redirect(authNavigationHref("/login", accountPageReturnPath("/account/entries", query, query.filterReset === "1" || query.fromUpdates === "1" || query.filter === "completed" && (query.viewed || query.viewedReward || query.prize) ? `#${openEntriesAnchorId}` : query.filter === "completion" || query.filter === "active" ? "#my-activity-filters" : "")));
  const transactionReturn = transactionOriginHref(query);
  const noticeReturn = validNotice(query.notice) ? notificationHref(notificationFilter(query.alerts), query.notice) : undefined;
  const completedPrizeRequested = filter === "completed" && query.prize !== undefined;
  const completedPrize = completedPrizeRequested && typeof query.prize === "string"
    && (getDemoProduct(query.prize) || account.activity.activity.some(item => item.slug === query.prize)) ? query.prize : undefined;
  const selectedSlug = typeof query.item === "string" ? query.item : undefined;
  const selectedEntryId = typeof query.entry === "string" ? query.entry : undefined;
  const viewedEntryId = typeof query.viewed === "string" && account.activity.activity.some(item => item.entryId === query.viewed) ? query.viewed : undefined;
  const requestedRewardId = typeof query.viewedReward === "string" ? query.viewedReward.toLowerCase() : undefined;
  const viewedRewardId = filter === "completed" && requestedRewardId && filterActivity(account.activity.activity, "completed")
    .some(item => item.rewardId === requestedRewardId && (!completedPrize || item.slug === completedPrize)) ? requestedRewardId : undefined;
  const selectedItem = findActivityItem(account.activity.activity, selectedSlug, selectedEntryId, filter);
  const missingSelection = query.entry !== undefined && (!selectedEntryId || !selectedItem) ? "entry"
    : filter === "completed" && query.viewedReward !== undefined && !viewedRewardId ? "reward" : null;
  const selectionMessage = missingSelection ? account.activity.source === "unavailable" || account.activity.incomplete
    ? `We couldn’t check the selected ${missingSelection} right now.` : `The selected ${missingSelection} could not be opened. The available records are shown below.` : undefined;
  const checkoutItem = filter === "completed" && viewedEntryId
    ? account.activity.activity.find(item => item.entryId === viewedEntryId && item.rewardId && item.slug === query.checkout)
    : undefined;
  const receiptId = checkoutItem && typeof query.receipt === "string" && checkoutReceiptId.test(query.receipt) ? query.receipt : undefined;
  const receipt = checkoutItem && receiptId ? await checkDemoPurchaseReceipt(receiptId, checkoutItem.slug) : null;
  const checkout = receiptId && receipt?.status === "succeeded" && checkoutItem?.rewardId && receipt.rewardIds.includes(checkoutItem.rewardId)
    ? { receipt: receiptId, rewardIds: receipt.rewardIds } : undefined;
  const availabilityPromise = getOfferingAvailability();
  let pendingEntries: EntryRequest[] | null = [];
  if (isPreviewDataEnvironment() && account.activity.source !== "unavailable") {
    pendingEntries = null;
    try {
      const db = await createClient();
      const { data, error } = await db.rpc("list_preview_entry_requests");
      if (!error && Array.isArray(data)) pendingEntries = data.map(parseEntryRequest).filter(request => request.status === "pending");
    } catch { /* Confirmed activity remains usable while pending requests are unavailable. */ }
  }
  let outcomeEmailPreference: boolean | null = null;
  if (selectedItem?.status === "active" && !missingSelection) {
    try {
      const db = await createClient();
      const { data, error } = await db.rpc("get_entry_outcome_email_enabled");
      if (!error) outcomeEmailPreference = data === true;
    } catch { /* The detail view remains usable when preferences are unavailable. */ }
  }
  const metricsBySlug = activityOfferMetrics(account.activity.activity, await availabilityPromise);
  return <PreferenceSnapshot><div className={styles.page}><div className={styles.pageContent}>
    {transactionReturn ? <Link className="font-bold text-cyan-300 underline" href={transactionReturn}>← Back to this transaction</Link> : null}
    {noticeReturn ? <Link className="font-bold text-cyan-300 underline" href={noticeReturn}>← Back to this notification</Link> : null}
    <h1 id="my-activity-heading" className={styles.heading}>Everything you chose. Every outcome.</h1>
    <p className={styles.subtitle}>Track your entries, see results, and take the next step.</p>
    {completedPrizeRequested && !completedPrize ? <p role="status" className="mb-4 text-sm text-amber-100">That prize selection is unavailable. Showing all completed activity. <Link href="/account/entries?filter=completed#my-activity-filters" className="underline">Clear prize selection</Link></p> : null}
    {query.legacyEntry === "1" && filter === "active" ? <p role="status" className="mb-4 text-sm text-amber-100">This older ticket can’t be opened by number. Your open entries remain below.</p> : null}
    <MyZeroLossActivity ownerId={account.userId} state={account.activity} purchaseStamps={repeatPurchaseStamps(account.orders?.orders ?? [])} filter={filter} metricsBySlug={metricsBySlug} pendingEntries={pendingEntries} outcomeEmailPreference={outcomeEmailPreference} completedPrize={completedPrize} selectedSlug={missingSelection === "entry" ? undefined : selectedSlug} selectedEntryId={missingSelection === "entry" ? undefined : selectedEntryId} viewedEntryId={viewedEntryId} missingViewedEntry={typeof query.viewed === "string" && !viewedEntryId && account.activity.source !== "unavailable"} viewedRewardId={viewedRewardId} selectionMessage={selectionMessage} filterReset={query.filterReset === "1"} checkout={checkout} returnToOptions={query.from === "purchase-options"} resumePurchase={query.resume === "purchase"} canClearDemoEntries={isPreviewDataEnvironment() && account.wallet?.scope === "demo" && account.activity.source !== "unavailable"} />
    <section aria-labelledby="account-tools-heading" className={styles.accountTools}>
      <div className={styles.accountToolsHeading}>
        <p className={styles.eyebrow}>ACCOUNT DASHBOARD</p>
        <h2 id="account-tools-heading">Your account, all in one place.</h2>
      </div>
      <div className={styles.accountToolsGrid}>
        <Link href="/account/profile#account-settings-sections" aria-label="Open Your Profile" className={`${styles.accountTool} ${styles.profileTool}`}>
          <span className={styles.accountAvatar}>
            {account.avatarUrl ? <Image src={account.avatarUrl} alt="" fill unoptimized sizes="54px" className={styles.accountAvatarImage} /> : <span aria-hidden="true">{account.initials}</span>}
          </span>
          <span className={styles.accountToolText}><strong>Your Profile</strong><span>{account.displayName}</span><small>Profile &amp; photo</small></span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>
        {accountLinks.map(([title, detail, href, imageSrc, treatment]) => <Link key={title} href={href} className={styles.accountTool}>
          <span className={styles.accountToolIcon} data-treatment={treatment}><Image src={imageSrc} alt="" fill sizes="(max-width: 600px) 80px, 112px" className={styles.accountToolIllustration} /></span>
          <span className={styles.accountToolText}><strong>{title}</strong><span>{detail}</span>{title === "Account & Security" && <small>{account.emailConfirmed ? "Email confirmed" : "Confirmation pending"}</small>}</span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>)}
        <Link href={declinedOfferHref(null, filter)} className={`${styles.accountTool} ${styles.declinedTool}`}>
          <span className={styles.accountToolIcon} data-treatment="declined"><Image src="/account/drawer/declined-offers-blue-bag.png" alt="" fill sizes="(max-width: 600px) 80px, 112px" className={styles.accountToolIllustration} /></span>
          <span className={styles.accountToolText}><strong>Declined Offers</strong><span>Changed your mind? Review saved options.</span></span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>
      </div>
      <p className={styles.ledgerNote}>The balance is read from your account&apos;s database ledger. {account.fundingEnabled ? "Demo funding is enabled." : "Demo funding is not enabled."} Real payments, entry purchases and rewards remain disabled.</p>
    </section>
    <p className={styles.footerNote}>SHOPPING SHOULD NEVER FEEL LIKE A LOSS.</p>
  </div></div></PreferenceSnapshot>;
}
