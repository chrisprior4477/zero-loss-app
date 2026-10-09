import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { ReviveOptionButton } from "@/components/account/ReviveOptionButton";
import styles from "@/components/account/my-activity.module.css";

export const metadata: Metadata = { title: "Declined Offers" };

export default async function DeclinedOffersPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/declined-offers"));
  const declined = account.activity.activity.filter(item => item.completionOptionStatus === "declined" && item.completionOptionId);
  return <main className={styles.page}><div className={styles.pageContent}>
    <Link href="/account/entries" className={styles.declinedBack}>← My Activity</Link>
    <p className={styles.eyebrow}>DECLINED OFFERS</p>
    <h1 className={styles.heading}>Changed your mind?</h1>
    <p className={styles.subtitle}>Revive a declined offer before its original deadline.</p>
    {account.activity.source === "unavailable" ? <div className={styles.empty}><h2>Declined offers unavailable</h2><p>We can’t verify your saved options right now. Please try again shortly.</p></div>
      : declined.length === 0 ? <div className={styles.empty}><h2>No declined offers yet</h2><p>Any purchase option you decline will appear here while your demo activity is saved.</p><Link href="/account/entries">Back to My Activity →</Link></div>
      : <div className={styles.declinedList}>{declined.map(item => {
        return <article key={item.completionOptionId} className={styles.declinedRow}>
          <div className={styles.declinedImage}><Image src={item.image} alt="" fill sizes="(max-width: 600px) 76px, 104px" /></div>
          <div className={styles.declinedDetails}>
            <span className={styles.declinedRetailer}>{item.retailer}</span>
            <h2>{item.title}</h2>
            <p>Offer value: <strong>{formatUsdFromCents(item.priceCents)}</strong> · Entry applied: <strong>{formatUsdFromCents(item.paidCents)}</strong></p>
            <p>Cost to revive: <strong>$0.00</strong> · Remaining to complete: <strong>{formatUsdFromCents(item.remainingCents)}</strong></p>
            {item.completionExpiresAt ? <p>Original deadline: <time dateTime={item.completionExpiresAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(item.completionExpiresAt))}</time></p> : null}
          </div>
          <ReviveOptionButton optionId={item.completionOptionId!} expiresAt={item.completionExpiresAt ?? null} />
        </article>;
      })}</div>}
  </div></main>;
}
