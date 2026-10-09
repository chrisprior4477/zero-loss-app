import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyZeroLossActivity } from "@/components/account/MyZeroLossActivity";
import { AccountIcon } from "@/components/account/AccountIcon";
import { getAccountContext } from "@/lib/account/context";
import { activityFilter, findActivityItem } from "@/lib/account/activity";
import styles from "@/components/account/my-activity.module.css";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { activityOfferMetrics } from "@/lib/account/activity-progress";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseEntryRequest, type EntryRequest } from "@/lib/entries/request";

export const metadata: Metadata = { title: "My Activity" };

const accountLinks = [
  ["Orders & Fulfillment", "Your orders and delivery updates", "/account/orders", "/account/drawer/orders-fulfillment-324x180.png", "fill-panel"],
  ["Notifications", "Account messages and activity updates", "/account/notifications", "/account/drawer/notifications-exact-324x180.png", "full"],
  ["Account & Security", "Email confirmation and sign-in details", "/account/security", "/account/drawer/account-security-324x180.png", "zoom"],
] as const;

export default async function MyZeroLossPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await getAccountContext();
  const query = await searchParams;
  if (!account) redirect(authNavigationHref("/login", accountPageReturnPath("/account/entries", query)));
  const filter = activityFilter(query.filter);
  const selectedSlug = typeof query.item === "string" ? query.item : undefined;
  const selectedEntryId = typeof query.entry === "string" ? query.entry : undefined;
  const availability = await getOfferingAvailability();
  const metricsBySlug = activityOfferMetrics(account.activity.activity, availability);
  let pendingEntries: EntryRequest[] = [];
  if (isPreviewDataEnvironment() && account.activity.source !== "unavailable") {
    try {
      const db = await createClient();
      const { data, error } = await db.rpc("list_preview_entry_requests");
      if (!error && Array.isArray(data)) pendingEntries = data.map(parseEntryRequest).filter(request => request.status === "pending");
    } catch { /* The account still shows only confirmed, authoritative activity. */ }
  }
  let outcomeEmailPreference: boolean | null = null;
  if (findActivityItem(account.activity.activity, selectedSlug, selectedEntryId, filter)?.status === "active") {
    try {
      const db = await createClient();
      const { data, error } = await db.rpc("get_entry_outcome_email_enabled");
      if (!error) outcomeEmailPreference = data === true;
    } catch { /* The detail view remains usable when preferences are unavailable. */ }
  }
  return <div className={styles.page}><div className={styles.pageContent}>
    <h1 className={styles.heading}>Everything you chose. Every outcome.</h1>
    <p className={styles.subtitle}>Track your entries, see results, and take the next step.</p>
    <MyZeroLossActivity state={account.activity} filter={filter} metricsBySlug={metricsBySlug} pendingEntries={pendingEntries} outcomeEmailPreference={outcomeEmailPreference} selectedSlug={selectedSlug} selectedEntryId={selectedEntryId} canClearDemoEntries={isPreviewDataEnvironment() && account.wallet?.scope === "demo" && account.activity.source !== "unavailable"} />
    <section aria-labelledby="account-tools-heading" className={styles.accountTools}>
      <div className={styles.accountToolsHeading}>
        <p className={styles.eyebrow}>ACCOUNT DASHBOARD</p>
        <h2 id="account-tools-heading">Your account, all in one place.</h2>
      </div>
      <div className={styles.accountToolsGrid}>
        <Link href="/account/security" aria-label="Open Your Profile" className={`${styles.accountTool} ${styles.profileTool}`}>
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
        <Link href="/account/declined-offers" className={`${styles.accountTool} ${styles.declinedTool}`}>
          <span className={styles.accountToolIcon} data-treatment="declined"><Image src="/account/drawer/declined-offers-blue-bag.png" alt="" fill sizes="(max-width: 600px) 80px, 112px" className={styles.accountToolIllustration} /></span>
          <span className={styles.accountToolText}><strong>Declined Offers</strong><span>Changed your mind? Review saved options.</span></span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>
      </div>
      <p className={styles.ledgerNote}>The balance is read from your account&apos;s database ledger. {account.fundingEnabled ? "Demo funding is enabled." : "Demo funding is not enabled."} Real payments, entry purchases and rewards remain disabled.</p>
    </section>
    <p className={styles.footerNote}>SHOPPING SHOULD NEVER FEEL LIKE A LOSS.</p>
  </div></div>;
}
