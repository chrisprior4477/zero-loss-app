"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./purchase-options.module.css";

export function PurchaseOptionRail({ title, options, initiallySelectedEntryId }: { title: string; options: ActivityItem[]; initiallySelectedEntryId?: string }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initiallySelectedEntryId && options.some(option => option.entryId === initiallySelectedEntryId) ? [initiallySelectedEntryId] : []));
  const count = options.length;

  function toggle(entryId: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  return <section id="purchase-option-rail" className={styles.rail} aria-label={`Your separate purchase options for ${title}`}>
    <div className={styles.railHeading}>
      <h2>Your {count} purchase {count === 1 ? "option" : "options"}</h2>
      <p>Tap any numbered ticket to see its own purchase details. You can open more than one.</p>
    </div>
    <div className={styles.compactTickets} aria-label="Choose purchase options">
      {options.map((option, index) => {
        const entryId = option.entryId!;
        const isSelected = selected.has(entryId);
        return <button key={entryId} type="button" className={styles.compactTicket} data-selected={isSelected} aria-expanded={isSelected} aria-label={`${isSelected ? "Hide" : "Show"} purchase option ${index + 1} of ${count}`} onClick={() => toggle(entryId)}><small>OPTION</small><strong>{index + 1}</strong></button>;
      })}
    </div>
    {selected.size > 0 ? <div className={`${styles.optionList} ${selected.size === 1 ? styles.singleOptionList : ""}`} aria-label="Selected purchase option details">
      {options.map((option, index) => {
        if (!option.entryId || !selected.has(option.entryId)) return null;
        const href = `/account/entries?item=${encodeURIComponent(option.slug)}&entry=${encodeURIComponent(option.entryId)}&filter=completion&from=purchase-options`;
        return <article key={option.entryId} className={styles.optionTicket} aria-label={`Purchase option ${index + 1} of ${count}`}>
          <div className={styles.optionImage}><Image src={option.image} alt={option.title} fill sizes="(max-width: 640px) 75px, 110px" /></div>
          <div className={styles.optionCopy}>
            <div className={styles.optionHeading}><span className={styles.numberCircle}>{index + 1}</span><div><p className={styles.optionKicker}>PURCHASE OPTION {index + 1} OF {count}</p><h3>{option.title}</h3></div></div>
          </div>
          <div className={styles.optionFacts}>
            <div className={styles.optionMath}><strong>{formatUsdFromCents(option.paidCents)} applied</strong><strong>{formatUsdFromCents(option.remainingCents)} remaining</strong></div>
            <div className={styles.optionMeta}><p>Entry #{option.entryId.slice(-8)}</p>{option.completionExpiresAt ? <><p>Available until</p><time dateTime={option.completionExpiresAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(option.completionExpiresAt))}</time></> : null}</div>
          </div>
          <Link href={href} className={styles.reviewOption} aria-label={`Complete purchase for option ${index + 1} of ${count} for ${option.title}`}>Complete this purchase <span aria-hidden="true">→</span></Link>
        </article>;
      })}
    </div> : null}
  </section>;
}
