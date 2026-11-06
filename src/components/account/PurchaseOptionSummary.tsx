"use client";
import { useAccountTimeZone } from "./TimeZoneProvider";
import { formatOfferDeadline } from "@/lib/account/timezone";
import type { ActivityItem } from "@/lib/account/activity";
import { purchaseOptionSummary } from "@/lib/account/purchase-option-summary";
import styles from "./my-activity.module.css";

export function PurchaseOptionSummary({ options }: { options: readonly ActivityItem[] }) {
  const timeZone = useAccountTimeZone();
  const summary = purchaseOptionSummary(options);
  if (!summary) return null;
  return <div className={styles.optionSummary}>
    <div className={styles.optionAmounts}>
      <strong>{summary.remaining}<small>remaining{summary.multiple ? " per option" : ""}</small></strong>
      <span>{summary.applied}<small>applied{summary.multiple ? " to each" : ""}</small></span>
    </div>
    {summary.deadline ? <time dateTime={summary.deadline}>
      {summary.earliestDeadline ? "First expires" : "Available until"} {formatOfferDeadline(summary.deadline, timeZone)}
    </time> : <span className={styles.optionDeadlineUnknown}>Deadline shown in details</span>}
  </div>;
}
