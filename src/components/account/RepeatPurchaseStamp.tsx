import type { PurchaseStamp } from "@/lib/account/repeat-purchase";
import { useAccountTimeZone } from "./TimeZoneProvider";
import styles from "./repeat-purchase-stamp.module.css";

export function RepeatPurchaseStamp({ orderNumber, createdAt }: PurchaseStamp) {
  const timeZone = useAccountTimeZone();
  const date = new Date(createdAt);
  const hasDate = Number.isFinite(date.getTime());
  return <span className={styles.stamp}>
    {hasDate ? <time dateTime={createdAt}>Purchased {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(date)}</time> : <span>Purchased</span>}
    <strong title={orderNumber}>#{orderNumber.slice(-8).toUpperCase()}</strong>
  </span>;
}
