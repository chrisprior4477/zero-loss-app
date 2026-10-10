import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account/context";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { availabilityStatus } from "@/lib/catalog/availability";
import { activityOfferMetrics } from "@/lib/account/activity-progress";
import { prizeNumberForSlug } from "@/lib/catalog/prize-number";
import { createClient } from "@/lib/supabase/server";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryPageActions } from "@/components/account/EntryPageActions";
import { EntryTicketRail } from "@/components/account/EntryTicketRail";
import { getEntryRequestHead } from "@/lib/entries/request-head";
import styles from "@/components/account/entry-page.module.css";

export const metadata: Metadata = { title: "Your Entry Details" };

const entryCountWords = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function enteredTime(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

export default async function EntryPage({ params, searchParams }: { params: Promise<{ entryId: string }>; searchParams?: Promise<{ entries?: string }> }) {
  const { entryId } = await params;
  if (!/^ent_[a-f0-9]{32}$/i.test(entryId)) notFound();
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", `/account/entries/${entryId}`));
  const item = account.activity.activity.find(entry => entry.entryId === entryId && entry.status === "active");
  if (!item || account.activity.source === "unavailable") notFound();
  const relatedEntries = account.activity.activity
    .filter(entry => entry.status === "active" && entry.slug === item.slug && entry.entryId)
    .sort((left, right) => enteredTime(left.enteredAt) - enteredTime(right.enteredAt)
      || (left.entryId ?? "").localeCompare(right.entryId ?? ""));
  const entryCount = relatedEntries.length;
  const entryCountLabel = entryCountWords[entryCount] ?? entryCount.toLocaleString("en-US");
  const expandEntries = (await searchParams)?.entries === "open";
  const savedTickets = relatedEntries.map((entry, index) => ({
    entryId: entry.entryId!,
    number: index + 1,
    enteredAt: entry.enteredAt && Number.isFinite(Date.parse(entry.enteredAt)) ? entry.enteredAt : null,
    enteredLabel: entry.enteredAt && Number.isFinite(Date.parse(entry.enteredAt))
      ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.enteredAt)) : "Date unavailable",
    amountLabel: formatUsdFromCents(entry.paidCents),
  }));

  const [availability, db] = await Promise.all([getOfferingAvailability(), createClient()]);
  const metrics = activityOfferMetrics([item], availability)[item.slug];
  const progressColor = metrics ? availabilityStatus(metrics.capacity, metrics.sold).color : null;
  const [emailResult, crewResult, requestHead] = await Promise.all([
    db.rpc("get_entry_outcome_email_enabled"),
    db.rpc("get_crew_member_profiles"),
    getEntryRequestHead(db, item.slug),
  ]);
  const crew = crewResult.error || !Array.isArray(crewResult.data) ? [] : crewResult.data
    .filter((member: { member_id?: unknown; name?: unknown }) => typeof member.member_id === "string" && typeof member.name === "string")
    .map((member: { member_id: string; name: string; avatar_reference?: string | null }) => ({
      id: member.member_id,
      name: member.name,
      avatarUrl: member.avatar_reference ? db.storage.from("profile-photos").getPublicUrl(member.avatar_reference).data.publicUrl : null,
    }));
  const enteredAt = item.enteredAt && Number.isFinite(Date.parse(item.enteredAt)) ? item.enteredAt : null;
  const returnHref = `/account/entries?viewed=${encodeURIComponent(entryId)}`;

  return <main className={styles.page}>
    <div className={styles.shell}>
      <div className={styles.topline}>
        <div className={styles.toplineHeading}><p className={styles.eyebrow}>MY ACTIVITY</p><h1>Your Entry Details</h1><p className={styles.pageSubtitle}>Your saved entry for the prize below.</p></div>
        <div className={styles.toplineActions}>
          <Link href={returnHref} className={styles.topReturnButton}>Return to My Activity <span aria-hidden="true">→</span></Link>
          <Link href={returnHref} className={styles.closePage} aria-label="Close entry details and return to My Activity"><span aria-hidden="true">×</span></Link>
        </div>
      </div>
      <section className={styles.heroTicket} aria-label="Saved entry and prize pool">
        <div className={styles.productImage}><Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100px, (max-width: 900px) 150px, 190px" /></div>
        <div className={styles.heroCopy}>
          <p className={styles.retailer}>{item.retailer}</p>
          <h2>{item.title}</h2>
          <span className={styles.status}>◷ No winners yet. We will notify you when the pool is complete.</span>
          <dl className={styles.entryIdentity}>
            <div><dt>Entered</dt><dd>{enteredAt ? <time dateTime={enteredAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(enteredAt))}</time> : "Date unavailable"}</dd><dd><a href="#saved-entry-rail" className={styles.entryCountBadge} aria-label={`Jump to your ${entryCount} ${entryCount === 1 ? "entry" : "entries"} for this prize`}><span className={styles.entryCountTicket} aria-hidden="true">{entryCount}</span><span>{entryCount === 1 ? "Entry" : "Entries"}</span></a></dd></div>
            <div><dt>Prize number</dt><dd className={styles.entryNumber}>{prizeNumberForSlug(item.slug)}</dd></div>
          </dl>
        </div>
        {metrics ? <div className={styles.progressCorner}>
          <div role="progressbar" aria-label={`${item.title} prize pool filled`} aria-valuenow={metrics.percentFilled} aria-valuemin={0} aria-valuemax={100} className={styles.progressCircle} style={{ background: `conic-gradient(${progressColor} ${metrics.percentFilled}%, #dbe9f3 0)` }}><span>{metrics.percentFilled}%</span></div>
          <strong>{metrics.remaining === 0 ? "Pool full" : `${metrics.remaining.toLocaleString("en-US")} tickets left`}</strong>
        </div> : <p className={styles.progressUnavailable}>Current pool count unavailable</p>}
      </section>
      <EntryTicketRail key={`${entryId}:${expandEntries}`} title={item.title} tickets={savedTickets} selectedEntryId={entryId} initiallyExpanded={expandEntries} heading={entryCount === 1 ? "Your saved entry" : `Your ${entryCountLabel} separate entries`} />
      <section className={styles.playTicket} aria-labelledby="in-play-title">
        <p className={styles.eyebrow}>IN PLAY</p>
        <h2 id="in-play-title">{item.title} prize pool {metrics ? metrics.remaining === 0 ? "is full and awaiting a result" : "still has tickets available" : "status is temporarily unavailable"}.</h2>
        <p>Your saved entry is one chance in this pool. {metrics ? `${metrics.sold.toLocaleString("en-US")} of ${metrics.capacity.toLocaleString("en-US")} places are filled.` : "Check back for verified pool progress."}</p>
        <EntryPageActions itemTitle={item.title} slug={item.slug} remaining={metrics?.remaining ?? null} entryPriceCents={availability?.[item.slug]?.entryPriceCents ?? null} balanceCents={account.wallet?.balanceCents ?? null} entryEnabled={account.wallet?.scope === "demo" && account.emailConfirmed} requestKey={randomUUID()} requestHead={requestHead} crew={crew} senderName={account.displayName} emailEnabled={emailResult.error ? null : emailResult.data === true} returnHref={returnHref} />
      </section>
    </div>
  </main>;
}
