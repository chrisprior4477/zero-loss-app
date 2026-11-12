import { PreferenceSnapshot } from "@/components/account/PreferenceSnapshot";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account/context";
import type { ActivityItem } from "@/lib/account/activity";
import { offerTicketLabels } from "@/lib/account/offer-ticket-labels";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { ReviveOptionButton } from "@/components/account/ReviveOptionButton";
import { DeclinedOfferCountdown, DeclinedOfferReminder } from "@/components/account/DeclinedOfferDeadline";
import { DeclinedOfferList } from "@/components/account/DeclinedOfferList";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import styles from "@/components/account/my-activity.module.css";

export const metadata: Metadata = { title: "Declined Offers" };
type DeclinedOffer = ActivityItem & { completionOptionId: string };

export default async function DeclinedOffersPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/declined-offers"));
  const declined = account.activity.activity.filter((item): item is DeclinedOffer =>
    item.completionOptionStatus === "declined" && Boolean(item.completionOptionId));
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
  return <PreferenceSnapshot><main className={styles.page}><div className={styles.pageContent}>
    <div className={styles.declinedHeader}>
      <div className={styles.declinedIntro}>
        <Link href="/account/entries" className={styles.declinedBack}>← My Activity</Link>
        <p className={styles.eyebrow}>DECLINED OFFERS</p>
        <h1 className={styles.heading}>If you change your mind</h1>
        <p className={styles.subtitle}>Revive a declined offer before its original deadline.</p>
      </div>
      <nav className={styles.declinedActions} aria-label="Declined offers navigation">
        <Link href="/account/entries">Return to My Activity</Link>
        <Link href="/">Continue shopping</Link>
      </nav>
    </div>
    {account.activity.source === "unavailable" ? <div className={styles.empty}><h2>Declined offers unavailable</h2><p>We can’t verify your saved options right now. Please try again shortly.</p></div>
      : declined.length === 0 ? <div className={styles.empty}><h2>No declined offers yet</h2><p>Any purchase option you decline will appear here while your demo activity is saved.</p><Link href="/account/entries">Back to My Activity →</Link></div>
      : <DeclinedOfferList>{Array.from(groups, ([slug, offers]) => {
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
          <details className={styles.declinedDisclosure}>
            <summary className={styles.declinedToggle}>
              <span className={styles.declinedShow}>{multiple ? `View ${offers.length} offers` : "View offer"}</span>
              <span className={styles.declinedHide}>{multiple ? "Hide offers" : "Hide offer"}</span>
              <span className={styles.declinedToggleIcon} aria-hidden="true" />
            </summary>
            <div className={styles.declinedTickets}>
              {offers.map(offer => {
                const optionId = offer.completionOptionId;
                const ticketLabel = labels[optionId];
                const expiresAt = offer.completionExpiresAt ?? null;
                return <article key={optionId} id={`declined-offer-${optionId}`} className={styles.declinedRow}>
                  <div className={styles.declinedDetails}>
                    <h3>{ticketLabel}</h3>
                    <p><strong>{formatUsdFromCents(offer.remainingCents)}</strong> to complete</p>
                    {expiresAt && <p>Original deadline <time dateTime={expiresAt}>{formatOfferDeadline(expiresAt, account.timezone)}</time></p>}
                  </div>
                  <DeclinedOfferReminder optionId={optionId} expiresAt={expiresAt}
                    initialReminderStatus={reminderStatus.get(optionId) ?? null}
                    canRequestReminder={remindersAvailable && account.emailConfirmed} />
                  <ReviveOptionButton optionId={optionId} ticketLabel={ticketLabel} productTitle={offer.title} expiresAt={expiresAt}
                    statusHref={offer.entryId ? `/account/purchase-options/${encodeURIComponent(offer.slug)}?option=${encodeURIComponent(offer.entryId)}` : "/account/entries?filter=completion"} />
                </article>;
              })}
            </div>
          </details>
        </section>;
      })}</DeclinedOfferList>}
  </div></main></PreferenceSnapshot>;
}
