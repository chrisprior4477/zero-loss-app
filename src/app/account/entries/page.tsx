import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MyZeroLossActivity } from "@/components/account/MyZeroLossActivity";
import { AccountIcon } from "@/components/account/AccountIcon";
import { getAccountContext } from "@/lib/account/context";
import { activityFilter } from "@/lib/account/activity";
import styles from "@/components/account/my-activity.module.css";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";

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
  return <div className={styles.page}><div className={styles.pageContent}>
    <h1 className={styles.heading}>Everything you chose. Every outcome.</h1>
    <p className={styles.subtitle}>Track your entries, see results, and take the next step.</p>
    <MyZeroLossActivity state={account.activity} filter={activityFilter(query.filter)} selectedSlug={typeof query.item === "string" ? query.item : undefined} selectedEntryId={typeof query.entry === "string" ? query.entry : undefined} />
    <section aria-labelledby="account-tools-heading" className={styles.accountTools}>
      <div className={styles.accountToolsHeading}>
        <p className={styles.eyebrow}>ACCOUNT DASHBOARD</p>
        <h2 id="account-tools-heading">Your account, all in one place.</h2>
      </div>
      <div className={styles.accountToolsGrid}>
        <Link href="/account/security" aria-label="Open Your Account and Security" className={`${styles.accountTool} ${styles.profileTool}`}>
          <span className={styles.accountAvatar}>
            {account.avatarUrl ? <Image src={account.avatarUrl} alt="" fill unoptimized sizes="54px" className={styles.accountAvatarImage} /> : <span aria-hidden="true">{account.initials}</span>}
          </span>
          <span className={styles.accountToolText}><strong>Your Account and Security</strong><span>{account.displayName}</span><small>Profile &amp; photo</small></span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>
        {accountLinks.map(([title, detail, href, imageSrc, treatment]) => <Link key={title} href={href} className={styles.accountTool}>
          <span className={styles.accountToolIcon} data-treatment={treatment}><Image src={imageSrc} alt="" fill sizes="(max-width: 600px) 80px, 112px" className={styles.accountToolIllustration} /></span>
          <span className={styles.accountToolText}><strong>{title}</strong><span>{detail}</span>{title === "Account & Security" && <small>{account.emailConfirmed ? "Email confirmed" : "Confirmation pending"}</small>}</span>
          <AccountIcon name="chevron" className={styles.accountToolArrow} />
        </Link>)}
      </div>
      <p className={styles.ledgerNote}>The balance is read from your account&apos;s database ledger. {account.fundingEnabled ? "Demo funding is enabled." : "Demo funding is not enabled."} Real payments, entry purchases and rewards remain disabled.</p>
    </section>
    <p className={styles.footerNote}>SHOPPING SHOULD NEVER FEEL LIKE A LOSS.</p>
  </div></div>;
}
