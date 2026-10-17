import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PurchaseOptionRail } from "@/components/account/PurchaseOptionRail";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import styles from "@/components/account/purchase-options.module.css";

export const metadata: Metadata = { title: "Your Purchase Options" };

export default async function PurchaseOptionsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ option?: string }> }) {
  const { slug } = await params;
  const { option: selectedEntryId } = await searchParams;
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
  return <main className={styles.page}>
    <div className={styles.shell}>
      <div className={styles.topline}>
        <div><p className={styles.eyebrow}>MY ACTIVITY</p><h1>Your Purchase Options</h1><p className={styles.subtitle}>These are your {count} separate purchase {count === 1 ? "option" : "options"}.</p></div>
        <div className={styles.topActions}>
          <Link href="/" className={styles.shopping}>Continue shopping</Link>
          <Link href="/account/entries?filter=completion" className={styles.return}>Return to My Activity <span aria-hidden="true">→</span></Link>
          <Link href="/account/entries?filter=completion" className={styles.close} aria-label="Close purchase options and return to My Activity">×</Link>
        </div>
      </div>

      <section className={styles.hero} aria-label="Purchase option summary">
        <div className={styles.heroImage}><Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100px, (max-width: 900px) 150px, 190px" /></div>
        <div className={styles.heroCopy}>
          <p className={styles.retailer}>{item.retailer}</p>
          <h2>{item.title}</h2>
          <span className={styles.status}>Purchase options available</span>
          <p className={styles.heroNote}>Each entry’s credit applies only to its own purchase option.</p>
          <div className={styles.heroCountRow}><span className={styles.heroCount}><span className={styles.heroCircle}>{count}</span><span>Separate purchase {count === 1 ? "option" : "options"}</span></span><p>Choose as many or as few as you like to complete.</p></div>
        </div>
      </section>

      <PurchaseOptionRail title={item.title} options={options} initiallySelectedEntryId={selectedEntryId} />

      <section className={styles.explanation} aria-labelledby="option-explanation-heading">
        <p className={styles.eyebrow}>YOUR CHOICE</p>
        <h2 id="option-explanation-heading">Each option stands on its own.</h2>
        <p>Choose the exact option you want to review. Its entry credit only applies to that option; credits from separate tickets do not combine. Completing a purchase is optional.</p>
      </section>
    </div>
  </main>;
}
