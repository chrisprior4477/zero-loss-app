import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyZeroLossActivity } from "@/components/account/MyZeroLossActivity";
import { AccountIcon, type AccountIconName } from "@/components/account/AccountIcon";
import { getAccountContext } from "@/lib/account/context";
import { activityFilter } from "@/lib/account/activity";
import styles from "@/components/account/showroom.module.css";

export const metadata: Metadata = { title: "My Zero Loss" };

const accountLinks = [
  ["Orders & Fulfillment", "Your orders and delivery updates", "/account/orders", "orders"],
  ["Notifications", "Account messages and activity updates", "/account/notifications", "bell"],
  ["Account & Security", "Email confirmation and sign-in details", "/account/security", "security"],
] as const satisfies readonly (readonly [string, string, string, AccountIconName])[];

export default async function MyZeroLossPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  const query = await searchParams;
  return <div className={styles.page}><div className={styles.pageContent}>
    <Link href="/account" className={styles.breadcrumb}>‹ Account Dashboard</Link>
    <p className={styles.eyebrow}>MY ZERO LOSS</p>
    <h1 className={styles.heading}>Everything you chose. Every outcome.</h1>
    <p className={styles.subtitle}>Track your entries, see results, and take the next step.</p>
    <MyZeroLossActivity state={account.activity} filter={activityFilter(query.filter)} selectedSlug={typeof query.item === "string" ? query.item : undefined} />
    <section aria-labelledby="account-tools-heading" className={styles.accountTools}>
      <div className={styles.accountToolsHeading}>
        <p className={styles.eyebrow}>YOUR ACCOUNT</p>
        <h2 id="account-tools-heading">Manage everything else.</h2>
      </div>
      <div className={styles.accountToolsGrid}>
        <Link href="/account/profile" aria-label={`Open ${account.displayName}'s account`} className={`${styles.accountTool} ${styles.profileTool}`}>
          <span className={styles.accountAvatar}>
            {account.avatarUrl ? <Image src={account.avatarUrl} alt="" fill unoptimized sizes="54px" className={styles.accountAvatarImage} /> : <span aria-hidden="true">{account.initials}</span>}
          </span>
          <span className={styles.accountToolText}><strong>Your Account</strong><span>{account.displayName}</span><small>Profile & photo</small></span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>
        {accountLinks.map(([title, detail, href, icon]) => <Link key={title} href={href} className={styles.accountTool}>
          <span className={styles.accountToolIcon}><AccountIcon name={icon} /></span>
          <span className={styles.accountToolText}><strong>{title}</strong><span>{detail}</span>{title === "Account & Security" && <small>{account.emailConfirmed ? "Email confirmed" : "Confirmation pending"}</small>}</span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>)}
      </div>
      <p className={styles.ledgerNote}>The balance is read from your account&apos;s database ledger. {account.fundingEnabled ? "Demo funding is enabled." : "Demo funding is not enabled."} Real payments, entry purchases and rewards remain disabled.</p>
    </section>
    <p className={styles.footerNote}>REAL PRODUCTS. REAL PROGRESS.</p>
  </div></div>;
}
