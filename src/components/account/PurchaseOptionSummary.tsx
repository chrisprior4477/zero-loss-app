import type { ActivityItem } from "@/lib/account/activity";
import { purchaseOptionSummary } from "@/lib/account/purchase-option-summary";
import styles from "./my-activity.module.css";

export function PurchaseOptionSummary({ options }: { options: readonly ActivityItem[] }) {
  const summary = purchaseOptionSummary(options);
  if (!summary) return null;
  return <div className={styles.optionSummary}>
    <div className={styles.optionAmounts}>
      <strong>{summary.remaining}<small>remaining{summary.multiple ? " per option" : ""}</small></strong>
      <span>{summary.applied}<small>applied{summary.multiple ? " to each" : ""}</small></span>
    </div>
    {summary.deadline ? <time dateTime={summary.deadline} title={`Available until ${new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(new Date(summary.deadline))} UTC`}>
      {summary.earliestDeadline ? "First expires" : "Available until"} {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(summary.deadline))}
    </time> : <span className={styles.optionDeadlineUnknown}>Deadline shown in details</span>}
  </div>;
}
