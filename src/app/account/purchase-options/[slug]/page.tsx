import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PurchaseOptionRail } from "@/components/account/PurchaseOptionRail";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import styles from "@/components/account/purchase-options.module.css";

export const metadata: Metadata = { title: "Your Purchase Options" };

export default async function PurchaseOptionsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ option?: string; decline?: string }> }) {
  const { slug } = await params;
  const { option: selectedEntryId, decline } = await searchParams;
  const account = await getAccountContext();
  const returnPath = `/account/purchase-options/${encodeURIComponent(slug)}`;
  if (!account) redirect(authNavigationHref("/login", returnPath));
  if (account.activity.source === "unavailable") notFound();

  // The authenticated account read model is owner-scoped. Never fetch options
  // by a user ID or trust a count supplied through the URL.
  const options = account.activity.activity
    .filter(item => item.status === "completion" && item.slug === slug && item.completionOptionStatus !== "declined" && item.entryId)
    .sort((left, right) => (left.enteredAt ?? "").localeCompare(right.enteredAt ?? "") || (left.entryId ?? "").localeCompare(right.entryId ?? ""));
  if (options.length === 0) notFound();

  const item = options[0];
  const count = options.length;
  const canBulkDecline = account.wallet?.scope === "demo" && isPreviewDataEnvironment();
  return <main className={styles.page}>
    <AccountSettingsLandingScroll target={canBulkDecline && decline === "confirm" ? "purchase-option-rail" : "purchase-options-intro"} visitKey={`${slug}:${selectedEntryId ?? "first"}:${decline ?? "view"}`} />
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
