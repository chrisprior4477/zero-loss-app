import Link from "next/link";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./purchase-checkout.module.css";

export function CompletedPurchaseReceipt({ title, totalCents, cardReady, href }: {
  title: string; totalCents: number; cardReady: boolean; href: string;
}) {
  return <main className={styles.page}><div className={styles.shell}>
    <section className={`${styles.ticket} ${styles.content}`} aria-labelledby="completed-purchase-heading">
      <h1 id="completed-purchase-heading">Purchase receipt</h1>
      <p>{title}</p>
      <div className={styles.recoveryReceipt} data-state="ready">
        <div className={styles.receiptDetails}>
          <div><h2>{cardReady ? "Gift card ready" : "Purchase completed"}</h2><strong>{formatUsdFromCents(totalCents)}</strong></div>
        </div>
        <Link href={href} className={styles.primary}>{cardReady ? "Open gift card" : "View completed purchases"}</Link>
      </div>
    </section>
  </div></main>;
}
