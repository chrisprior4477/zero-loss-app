import { AccountSessionRetry } from "@/components/account/AccountSessionRetry";
import { PreferenceSnapshot } from "@/components/account/PreferenceSnapshot";
import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { AccountReadRetryLink } from "@/components/account/AccountReadRetryLink";
import { notFound, redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account/context";
import { activityHref, openPrizeOptions } from "@/lib/account/activity";
import { compareSavedEntries } from "@/lib/account/entry-order";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { availabilityStatus } from "@/lib/catalog/availability";
import { activityOfferMetrics } from "@/lib/account/activity-progress";
import { prizeNumberForSlug } from "@/lib/catalog/prize-number";
import { createClient } from "@/lib/personal-demo/shopper";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryPageActions } from "@/components/account/EntryPageActions";
import { EntryCountShortcut } from "@/components/account/EntryCountShortcut";
import { entryTicketFocusReturnKey } from "@/lib/account/entry-ticket-return";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { EntryActivityReturnLink, EntryTicketRail, EntryTicketSelectionProvider, SelectedEntryDate } from "@/components/account/EntryTicketRail";
import { PrizeNumberCopy } from "@/components/account/PrizeNumberCopy";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { getEntryRequestHead } from "@/lib/entries/request-head";
import { parseEntryRequest, type EntryRequest } from "@/lib/entries/request";
import styles from "@/components/account/entry-page.module.css";
import { transactionOriginHref, transactionOriginParams } from "@/lib/wallet/ledger-return";
import { parseEntryQuantity } from "@/lib/entries/quantity";
import { notificationHref, notificationFilter, validNotice } from "@/lib/account/notification-return";
import { entryReviewContext } from "@/lib/wallet/funding-navigation";
import { matchingQueryValue } from "@/lib/navigation/query-value";

export const metadata: Metadata = { title: "Your Entry Details" };

export default async function EntryPage({ params, searchParams }: { params: Promise<{ entryId: string }>; searchParams?: Promise<{ entries?: string; quantity?: string | string[]; review?: string | string[]; filter?: string; transaction?: string; walletView?: string; fromOrders?: string; orderFilter?: string; alerts?: string; notice?: string }> }) {
  const entryId = (await params).entryId.toLowerCase();
  if (!/^ent_[a-f0-9]{32}$/i.test(entryId)) notFound();
  const raw = await searchParams;
  const query = raw && { ...raw, quantity: matchingQueryValue(raw.quantity) ?? raw.quantity };
  const selectedQuantity = parseEntryQuantity(query?.quantity);
  const invalidQuantity = query?.review === "entry" && query.quantity !== undefined && selectedQuantity === null;
  const entryContext = entryReviewContext(query);
  const missingTransaction = transactionOriginHref(query ?? {});
  const missingNotification = entryContext.notice ? notificationHref(notificationFilter(entryContext.alerts), entryContext.notice) : undefined;
  const destination = accountPageReturnPath(`/account/entries/${entryId}`,
    invalidQuantity ? { ...query, review: undefined, quantity: undefined } : query,
    invalidQuantity ? "#add-entries-title" : query?.review === "entry" ? "#additional-entry-checkout" : query?.entries === "open" ? "#saved-entry-rail" : "");
  const account = await getAccountContext("report");
  if (account === "unavailable") return <AccountSessionRetry />;
  if (!account) redirect(authNavigationHref("/login", destination));
  if (account.activity.source === "unavailable") {
    console.warn("[entry-details] Account activity unavailable; showing retry instead of not found.");
    return <div className={styles.page}><div className={styles.shell}>
      <div className={styles.topline}><div className={styles.toplineHeading}><p className={styles.eyebrow}>MY ACTIVITY</p><h1>Your Entry Details</h1></div></div>
      <section className={styles.playTicket} aria-labelledby="entry-unavailable-title">
        <h2 id="entry-unavailable-title">We couldn’t load your entry right now</h2>
        <p>Your account activity is temporarily unavailable. Try again to check this entry.</p>
        {/* A full navigation retries the server read, including a previously cached failed response. */}
        <AccountReadRetryLink href={destination} className={styles.primaryLink}>Try again</AccountReadRetryLink>
        {missingTransaction && <Link href={missingTransaction} className={styles.returnButton}>Back to this transaction</Link>}
        {missingNotification && <Link href={missingNotification} className={styles.returnButton}>Back to this notification</Link>}
        <Link href={query?.filter === "active" ? "/account/entries?filter=active#my-activity-filters" : "/account/entries#my-activity-filters"} className={styles.returnButton}>Go to My Activity</Link>
      </section>
    </div></div>;
  }
  // A saved URL remains usable after this customer's entry receives an outcome.
  const item = account.activity.activity.find(entry => entry.entryId === entryId);
  if (!item && account.activity.incomplete) return <section className={styles.page}>
    <h1>We couldn’t verify this saved ticket</h1><AccountReadRetryLink href={destination}>Check this ticket again</AccountReadRetryLink>
    {missingTransaction && <Link href={missingTransaction} className={styles.returnButton}>Back to this transaction</Link>}
    {missingNotification && <Link href={missingNotification} className={styles.returnButton}>Back to this notification</Link>}
    <Link href={query?.filter === "active" ? "/account/entries?filter=active#my-activity-filters" : "/account/entries#my-activity-filters"} className={styles.returnButton}>Go to My Activity</Link>
  </section>;
  if (!item) return <div className={styles.page}><div className={styles.shell}>
    <AccountSettingsLandingScroll target="entry-unavailable-title" initialTarget="entry-unavailable-title" focusTarget="entry-unavailable-title" allScreens />
    <section className={styles.playTicket} aria-labelledby="entry-unavailable-title">
      <h1 id="entry-unavailable-title" tabIndex={-1}>This saved entry is unavailable</h1>
      <p>Open My Activity to see the entries available for this account.</p>
      {missingTransaction ? <Link href={missingTransaction} className={styles.returnButton}>Back to this transaction</Link> : null}
      {missingNotification ? <Link href={missingNotification} className={styles.returnButton}>Back to this notification</Link> : null}
      <Link href={query?.filter === "active" ? "/account/entries?filter=active#my-activity-filters" : "/account/entries#my-activity-filters"} className={styles.returnButton}>Go to My Activity</Link>
    </section>
  </div></div>;
  if (item.status !== "active") {
    if (item.rewardId && (entryContext.transaction || entryContext.notice)) {
      const reward = new URLSearchParams({ reward: item.slug, rewardId: item.rewardId, ...entryContext, ...transactionOriginParams(query ?? {}) });
      redirect(`/account/wallet?${reward}#reward-pass`);
    }
    if (openPrizeOptions([item], item.slug).length && (entryContext.transaction || entryContext.notice)) {
      const option = new URLSearchParams({ option: entryId, ...entryContext, ...transactionOriginParams(query ?? {}) });
      redirect(`/account/purchase-options/${item.slug}?${option}`);
    }
    redirect(activityHref(item));
  }
  const relatedEntries = account.activity.activity
    .filter(entry => entry.status === "active" && entry.slug === item.slug && entry.entryId)
    .sort(compareSavedEntries);
  const entryCount = relatedEntries.length;
  const entryView = query?.entries;
  const resumeReview = query?.review === "entry" && !invalidQuantity;
  const initialQuantity = resumeReview ? selectedQuantity ?? 1 : 1;
  const savedTickets = relatedEntries.map((entry, index) => ({
    entryId: entry.entryId!,
    number: index + 1,
    title: entry.title,
    image: entry.image,
    enteredAt: entry.enteredAt && Number.isFinite(Date.parse(entry.enteredAt)) ? entry.enteredAt : null,
    enteredLabel: entry.enteredAt && Number.isFinite(Date.parse(entry.enteredAt))
      ? new Intl.DateTimeFormat(account.preferredLocale ?? "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: account.timezone }).format(new Date(entry.enteredAt)) : "Date unavailable",
    amountLabel: formatUsdFromCents(entry.paidCents),
  }));
  const initialTicket = entryView === "first" ? savedTickets[0].entryId : entryId;

  const [availability, db] = await Promise.all([getOfferingAvailability(), createClient()]);
  const metrics = activityOfferMetrics([item], availability)[item.slug];
  const progressColor = metrics ? availabilityStatus(metrics.capacity, metrics.sold).color : null;
  const [emailResult, crewResult, requestHead, pendingResult] = await Promise.all([
    db.rpc("get_entry_outcome_email_enabled"),
    db.rpc("get_crew_member_profiles"),
    getEntryRequestHead(db, item.slug),
    db.rpc("list_preview_entry_requests"),
  ]);
  // Recover the owner's existing hold before offering another entry or top-up.
  // This RPC is owner-scoped; never infer a reservation from a URL or balance.
  let initialReceipt: EntryRequest | null = null;
  let pendingReadReady = !pendingResult.error && Array.isArray(pendingResult.data);
  if (pendingReadReady) {
    try {
      initialReceipt = pendingResult.data.map(parseEntryRequest).find((request: EntryRequest) => request.slug === item.slug && request.status === "pending") ?? null;
    } catch { pendingReadReady = false; }
  }
  const crew = crewResult.error || !Array.isArray(crewResult.data) ? [] : crewResult.data
    .filter((member: { member_id?: unknown; name?: unknown }) => typeof member.member_id === "string" && typeof member.name === "string")
    .map((member: { member_id: string; name: string; avatar_reference?: string | null }) => ({
      id: member.member_id,
      name: member.name,
      avatarUrl: member.avatar_reference ? db.storage.from("profile-photos").getPublicUrl(member.avatar_reference).data.publicUrl : null,
    }));
  const returnFilter = query?.filter === "active" ? "active" : undefined;
  const walletHref = transactionOriginHref(query ?? {});
  const alertsHref = validNotice(query?.notice) ? notificationHref(notificationFilter(query?.alerts), query.notice) : undefined;
  const returnHref = `/account/entries?viewed=${encodeURIComponent(entryId)}${returnFilter ? "&filter=active" : ""}`;
  const shareItem = { slug: item.slug, title: item.title, image: item.image, retailer: item.retailer };

  return <PreferenceSnapshot><div className={styles.page}>
    <AccountSettingsLandingScroll target="entry-details-intro" focusTarget={invalidQuantity ? "entry-review-quantity" : resumeReview || initialReceipt ? undefined : entryView === "open" ? "saved-entry-rail" : "entry-details-heading"} initialTarget={invalidQuantity ? "entry-review-quantity" : resumeReview || initialReceipt ? "additional-entry-checkout" : undefined} visitKey={`${entryId}:${initialQuantity}:${resumeReview}:${invalidQuantity}`} skipForHistoryKey={entryTicketFocusReturnKey} skipForHash="entry-crew-share" settleAfterNavigation allScreens />
    <EntryTicketSelectionProvider key={`${account.userId}:${entryId}:${entryView}`} initial={initialTicket}>
    <div className={styles.shell}>
      <div className={styles.topline} id="entry-details-intro">
        <div className={styles.toplineHeading}><p className={styles.eyebrow}>MY ACTIVITY</p><h1 id="entry-details-heading" tabIndex={-1}>Your Entry Details</h1><p className={styles.pageSubtitle}>{entryCount === 1 ? "Your saved entry" : `Your ${entryCount} saved entries`} for the prize below.</p></div>
        <div className={styles.toplineActions}>
          <Link href="/" className={styles.topShoppingButton}>Continue shopping</Link>
          <EntryActivityReturnLink href={walletHref ?? alertsHref ?? returnHref} className={styles.topReturnButton}>{walletHref ? "Back to this transaction" : alertsHref ? "Back to this notification" : "Go to My Activity"}</EntryActivityReturnLink>
          <EntryActivityReturnLink href={walletHref ?? alertsHref ?? returnHref} className={styles.closePage} aria-label={walletHref ? "Close entry details and return to this transaction" : alertsHref ? "Close entry details and return to this update" : "Close entry details and return to My Activity"}><span aria-hidden="true">×</span></EntryActivityReturnLink>
        </div>
      </div>
      <section className={styles.heroTicket} aria-label="Saved entry and prize pool">
        <div className={styles.productImage}><Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100px, (max-width: 900px) 150px, 190px" /></div>
        <div className={styles.heroCopy}>
          <p className={styles.retailer}>{item.retailer}</p>
          <h2>{item.title}</h2>
          <span className={styles.status}>◷ No winners yet. We will notify you when the pool is complete.</span>
          <dl className={styles.entryIdentity}>
            <div><dt>Entered</dt><dd><SelectedEntryDate tickets={savedTickets} initial={initialTicket} /></dd><dd><EntryCountShortcut count={entryCount} /></dd></div>
            <div><dt>Prize number</dt><PrizeNumberCopy number={prizeNumberForSlug(item.slug)}><ProductShareButton product={shareItem} label="Share" className={styles.mobileShare} /></PrizeNumberCopy></div>
          </dl>
        </div>
        <div className={styles.progressCorner}>
          {metrics ? <>
          <div role="progressbar" aria-label={`${item.title} prize pool filled`} aria-valuenow={metrics.percentFilled} aria-valuemin={0} aria-valuemax={100} className={styles.progressCircle} style={{ background: `conic-gradient(${progressColor} ${metrics.percentFilled}%, #dbe9f3 0)` }}><span>{metrics.percentFilled}%</span></div>
          <strong>{metrics.remaining === 0 ? "Pool full" : `${metrics.remaining.toLocaleString("en-US")} tickets left`}</strong>
          </> : <p>Current pool count unavailable</p>}
          <ProductShareButton product={shareItem} className={styles.desktopShare} />
        </div>
      </section>
      <EntryTicketRail ownerId={account.userId} title={item.title} tickets={savedTickets} selectedEntryId={initialTicket} returnFilter={returnFilter} walletOrigin={transactionOriginParams(query ?? {}) ?? undefined} alerts={notificationFilter(query?.alerts)} notice={validNotice(query?.notice) ? query.notice : undefined} />
      <section className={styles.playTicket} aria-labelledby="in-play-title">
        <p className={styles.eyebrow}>IN PLAY</p>
        <h2 id="in-play-title">{item.title} prize pool {metrics ? metrics.remaining === 0 ? "is full and awaiting a result" : "still has tickets available" : "status is temporarily unavailable"}.</h2>
        <p>{entryCount === 1 ? "Your saved entry is one chance" : `Your ${entryCount} saved entries are ${entryCount} separate chances`} in this pool. {metrics ? `${metrics.sold.toLocaleString("en-US")} of ${metrics.capacity.toLocaleString("en-US")} places are filled.` : "Check back for verified pool progress."}</p>
        {invalidQuantity ? <p role="status" id="entry-review-quantity" tabIndex={-1}>The saved quantity is invalid. Choose how many additional entries you want below before reviewing.</p> : null}
        <EntryPageActions key={`${entryId}:${initialQuantity}:${resumeReview}`} entryId={entryId} ownerId={account.userId} initialQuantity={initialQuantity} resumeReview={resumeReview} initialReceipt={initialReceipt} itemTitle={item.title} itemImage={item.image} slug={item.slug} remaining={metrics?.remaining ?? null} entryPriceCents={availability?.[item.slug]?.entryPriceCents ?? null} balanceCents={account.wallet?.balanceCents ?? null} entryEnabled={account.wallet?.scope === "demo" && account.emailConfirmed} requestKey={randomUUID()} requestHead={pendingReadReady ? requestHead : { ready: false, requestId: null }} crew={crew} senderName={account.displayName} emailEnabled={emailResult.error ? null : emailResult.data === true} returnHref={returnHref} transactionReturnHref={walletHref} notificationReturnHref={alertsHref} entryContext={entryContext} />
      </section>
    </div>
    </EntryTicketSelectionProvider>
  </div></PreferenceSnapshot>;
}
