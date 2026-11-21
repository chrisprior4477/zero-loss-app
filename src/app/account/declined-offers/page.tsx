import { PreferenceSnapshot } from "@/components/account/PreferenceSnapshot";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account/context";
import { activityFilter, activityHref, declinedOfferHref, openEntriesAnchorId, openPrizeOptions, type ActivityItem } from "@/lib/account/activity";
import { crewUuid } from "@/lib/crew/visibility";
import { offerTicketLabels } from "@/lib/account/offer-ticket-labels";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { ReviveOptionButton } from "@/components/account/ReviveOptionButton";
import { DeclinedOfferCountdown, DeclinedOfferReminder } from "@/components/account/DeclinedOfferDeadline";
import { DeclinedOfferFilterNotice } from "@/components/account/DeclinedOfferFilterNotice";
import { DeclinedOfferList } from "@/components/account/DeclinedOfferList";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { notificationHref, notificationFilter, validNotice } from "@/lib/account/notification-return";
import { transactionOriginHref } from "@/lib/wallet/ledger-return";
import styles from "@/components/account/my-activity.module.css";

export const metadata: Metadata = { title: "Declined Offers" };
type DeclinedOffer = ActivityItem & { completionOptionId: string };

export default async function DeclinedOffersPage({ searchParams }: { searchParams?: Promise<{ offer?: string | string[]; prize?: string | string[]; filter?: string | string[]; transaction?: string | string[]; walletView?: string | string[]; fromOrders?: string | string[]; orderFilter?: string | string[]; notice?: string | string[]; alerts?: string | string[] }> }) {
  const query = await searchParams;
  const requested = query?.offer;
  const prize = typeof query?.prize === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.prize) ? query.prize : undefined;
  const offerId = typeof requested === "string" && crewUuid.test(requested) ? requested : undefined;
  const filter = activityFilter(query?.filter);
  const obsoleteFilter = query?.filter !== undefined && query.filter !== filter;
  const transactionReturn = transactionOriginHref(query ?? {});
  const selectedHref = accountPageReturnPath("/account/declined-offers", { ...query, offer: offerId, filter: filter === "all" ? undefined : filter }, offerId ? `#declined-offer-${offerId}` : "");
  const noticeReturn = validNotice(query?.notice) ? notificationHref(notificationFilter(query?.alerts), query.notice) : undefined;
  const activityReturn = `/account/entries${filter === "all" ? "" : `?filter=${filter}`}#${openEntriesAnchorId}`;
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", selectedHref));
  const declined = account.activity.activity.filter((item): item is DeclinedOffer =>
    item.completionOptionStatus === "declined" && Boolean(item.completionOptionId) && (Boolean(offerId) || !prize || item.slug === prize));
  const requestedMissing = offerId && account.activity.source !== "unavailable" && !declined.some(item => item.completionOptionId === offerId);
  const currentOffer = requestedMissing ? account.activity.activity.find(item => item.completionOptionId === offerId) : undefined;
  const currentOfferHref = currentOffer && (openPrizeOptions([currentOffer], currentOffer.slug).length
    ? `/account/purchase-options/${encodeURIComponent(currentOffer.slug)}?option=${encodeURIComponent(currentOffer.entryId!)}`
    : activityHref(currentOffer));
  const requestedAnchor = offerId ? `declined-offer-${offerId}` : undefined;
  const groups = new Map<string, DeclinedOffer[]>();
  for (const offer of declined) {
    const group = groups.get(offer.slug);
    if (group) group.push(offer);
    else groups.set(offer.slug, [offer]);
  }
  const labels = offerTicketLabels(declined, account.activity.activity);
  const reminderStatus = new Map<string, string>();
  let remindersAvailable = false;
  if (isPreviewDataEnvironment() && declined.length > 0) {
    try {
      const db = await createClient();
      const [{ data, error }, { data: deliveryEnabled, error: deliveryError }] = await Promise.all([
        db.from("completion_option_reminders")
          .select("completion_option_id,status")
          .eq("customer_id", account.userId)
          .eq("reminder_key", "declined_2d")
          .in("completion_option_id", declined.map(item => item.completionOptionId)),
        db.rpc("get_declined_offer_reminder_delivery_enabled"),
      ]);
      remindersAvailable = !error && !deliveryError && deliveryEnabled === true;
      if (!error) for (const row of data ?? []) reminderStatus.set(row.completion_option_id, row.status);
    } catch { /* Show an unavailable control, not an unsaved opt-in. */ }
  }
  return <PreferenceSnapshot><div className={styles.page}><div className={styles.pageContent}>
    <div className={styles.declinedHeader}>
      <div className={styles.declinedIntro}>
        <Link href={activityReturn} scroll={false} className={styles.declinedBack}>← My Activity</Link>
        <p className={styles.eyebrow}>DECLINED OFFERS</p>
        <h1 className={styles.heading}>If you change your mind</h1>
        <p className={styles.subtitle}>Revive a declined offer before its original deadline.</p>
      </div>
      <nav className={styles.declinedActions} aria-label="Declined offers navigation">
        {transactionReturn ? <Link href={transactionReturn} scroll={false}>Back to this transaction</Link> : null}
        {noticeReturn ? <Link href={noticeReturn}>Back to this notification</Link> : null}
        {prize && !offerId && <Link href={accountPageReturnPath("/account/declined-offers", { ...query, prize: undefined, filter: filter === "all" ? undefined : filter })}>View all declined offers</Link>}
        <Link href={activityReturn} scroll={false}>Return to My Activity</Link>
        <Link href="/">Continue shopping</Link>
      </nav>
    </div>
    {obsoleteFilter && <DeclinedOfferFilterNotice />}
    {requested !== undefined && !offerId ? <div id="invalid-declined-offer" className={styles.empty}>
      <AccountSettingsLandingScroll target="invalid-declined-offer" initialTarget="invalid-declined-offer" focusTarget="invalid-declined-heading" allScreens />
      <h2 id="invalid-declined-heading" tabIndex={-1}>This declined-offer link is invalid</h2>
      <Link href={declinedOfferHref()}>View all declined offers</Link>
    </div> : null}
    {requestedMissing && requestedAnchor && <div id={requestedAnchor} role="status" className={`${styles.empty} ${styles.declinedDestination}`}>
      <AccountSettingsLandingScroll target={requestedAnchor} initialTarget={requestedAnchor} focusTarget="missing-declined-offer" allScreens settleAfterNavigation />
      <h2 id="missing-declined-offer" tabIndex={-1}>This offer is no longer in Declined Offers</h2>
      {currentOfferHref && <Link href={currentOfferHref}>View its current status →</Link>}
    </div>}
    {account.activity.source === "unavailable" ? <div id={requestedAnchor} className={`${styles.empty} ${styles.declinedDestination}`}><h2>Declined offers unavailable</h2><p>We can’t verify your saved options right now. Please try again shortly.</p><a href={selectedHref}>Try again</a></div>
      : declined.length === 0 ? <div className={styles.empty}>{prize && !requestedMissing ? <AccountSettingsLandingScroll target="no-declined-offers" initialTarget="no-declined-offers" focusTarget="no-declined-offers" allScreens /> : null}<h2 id="no-declined-offers" tabIndex={-1}>{prize ? "No declined offers for this prize" : "No declined offers yet"}</h2><p>Any purchase option you decline will appear here while your demo activity is saved.</p><Link href={activityReturn} scroll={false}>Back to My Activity →</Link></div>
      : <DeclinedOfferList offerId={offerId} ownerId={account.userId}>{Array.from(groups, ([slug, offers]) => {
        const [product] = offers;
        const multiple = offers.length > 1;
        const deadlines = offers.map(offer => Date.parse(offer.completionExpiresAt ?? ""))
          .filter(Number.isFinite).sort((a, b) => a - b);
        return <section key={slug} aria-labelledby={`declined-product-${slug}`}>
          <div className={styles.declinedStack} data-layers={Math.min(offers.length - 1, 2)}>
            <div className={styles.declinedProduct}>
              <div className={styles.declinedImage}><Image src={product.image} alt="" fill sizes="(max-width: 600px) 76px, 104px" /></div>
              <div className={styles.declinedDetails}>
                <span className={styles.declinedRetailer}>{product.retailer}</span>
                <h2 id={`declined-product-${slug}`}>{product.title}</h2>
                <p>{offers.length} declined {multiple ? "offers" : "offer"}</p>
              </div>
              <DeclinedOfferCountdown deadlines={deadlines} />
            </div>
          </div>
          <details className={styles.declinedDisclosure} data-declined-product={slug}>
            <summary className={styles.declinedToggle}>
              <span className={styles.declinedShow}>{multiple ? `View ${offers.length} offers` : "View offer"}</span>
              <span className={styles.declinedHide}>{multiple ? "Hide offers" : "Hide offer"}</span>
              <span className={styles.declinedToggleIcon} aria-hidden="true" />
            </summary>
            <div className={styles.declinedTickets}>
              {offers.map(offer => {
                const optionId = offer.completionOptionId;
                const statusHref = declinedOfferHref(optionId, filter);
                const ticketLabel = labels[optionId];
                const expiresAt = offer.completionExpiresAt && Number.isFinite(Date.parse(offer.completionExpiresAt)) ? offer.completionExpiresAt : null;
                return <article key={optionId} id={`declined-offer-${optionId}`} tabIndex={-1} className={styles.declinedRow}>
                  <div className={styles.declinedDetails}>
                    <div className={styles.declinedTicketSummary}>
                      <div className={styles.declinedImage}>
                        <Image src={offer.image} alt={offer.title} fill sizes="48px" />
                      </div>
                      <div>
                        <h3>{ticketLabel}</h3>
                        <p><strong>{formatUsdFromCents(offer.remainingCents)}</strong> to complete</p>
                      </div>
                    </div>
                    {expiresAt && <p>Original deadline <time dateTime={expiresAt}>{formatOfferDeadline(expiresAt, account.timezone)}</time></p>}
                  </div>
                  <DeclinedOfferReminder optionId={optionId} expiresAt={expiresAt}
                    initialReminderStatus={reminderStatus.get(optionId) ?? null}
                    canRequestReminder={remindersAvailable && account.emailConfirmed} statusHref={statusHref} />
                  <ReviveOptionButton optionId={optionId} ticketLabel={ticketLabel} productTitle={offer.title} expiresAt={expiresAt}
                    statusHref={statusHref} />
                </article>;
              })}
            </div>
          </details>
        </section>;
      })}</DeclinedOfferList>}
  </div></div></PreferenceSnapshot>;
}
