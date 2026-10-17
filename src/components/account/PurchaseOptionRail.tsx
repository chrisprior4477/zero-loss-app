"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./purchase-options.module.css";

export function PurchaseOptionRail({ title, options }: { title: string; options: ActivityItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const count = options.length;

  function toggle() {
    if (expanded) requestAnimationFrame(() => railRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
    setExpanded(!expanded);
  }

  return <section id="purchase-option-rail" ref={railRef} className={styles.rail} aria-label={`Your separate purchase options for ${title}`}>
    <div className={styles.railHeading}>
      <h2>Your {count} purchase {count === 1 ? "option" : "options"}</h2>
      <p>Each numbered ticket has its own applied amount, remaining price and choice.</p>
      <button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls="purchase-option-list" onClick={toggle}>{expanded ? `Hide ${count} purchase ${count === 1 ? "option" : "options"}` : `See ${count} purchase ${count === 1 ? "option" : "options"}`}</button>
    </div>
    <div className={styles.compactTickets} aria-hidden="true">{options.map((option, index) => <span key={option.entryId} className={styles.compactTicket}><small>OPTION</small><strong>{index + 1}</strong></span>)}</div>
    {expanded ? <div id="purchase-option-list" className={styles.optionList}>
      {options.map((option, index) => {
        const href = `/account/entries?item=${encodeURIComponent(option.slug)}&entry=${encodeURIComponent(option.entryId!)}&filter=completion`;
        return <article key={option.entryId} className={styles.optionTicket} aria-label={`Purchase option ${index + 1} of ${count}`}>
          <div className={styles.optionImage}><Image src={option.image} alt={option.title} fill sizes="(max-width: 640px) 75px, 110px" /></div>
          <div className={styles.optionCopy}>
            <div className={styles.optionHeading}><span className={styles.numberCircle}>{index + 1}</span><div><p className={styles.optionKicker}>PURCHASE OPTION {index + 1} OF {count}</p><h3>{option.title}</h3></div></div>
            <p className={styles.optionMath}><strong>{formatUsdFromCents(option.paidCents)} applied</strong><span aria-hidden="true">·</span><strong>{formatUsdFromCents(option.remainingCents)} remaining</strong></p>
            <p className={styles.optionId}>Entry #{option.entryId?.slice(-8)}</p>
            {option.completionExpiresAt ? <p className={styles.deadline}>Available until <time dateTime={option.completionExpiresAt}>{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(option.completionExpiresAt))}</time></p> : null}
          </div>
          <Link href={href} className={styles.reviewOption} aria-label={`Review purchase option ${index + 1} of ${count} for ${option.title}`}>Review this option <span aria-hidden="true">→</span></Link>
        </article>;
      })}
      <div className={styles.closeRow}><button type="button" onClick={toggle} className={styles.closeList}>Close</button></div>
    </div> : <div id="purchase-option-list" hidden />}
  </section>;
}
