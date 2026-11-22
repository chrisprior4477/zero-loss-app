"use client";

import Link from "next/link";
import type { FaqItem } from "@/lib/help/faq";
import styles from "./help-tickets.module.css";

export function FaqAnswer({ item, expanded, onToggle }: { item: FaqItem; expanded?: boolean; onToggle?: (open: boolean) => void }) {
  return <details id={`faq-${item.id}`} data-faq-id={item.id} open={expanded} onToggle={event => onToggle?.(event.currentTarget.open)} className={`${styles.ticket} ${styles.answer}`}>
    <summary className={styles.question}>
      {item.question}<span aria-hidden="true" className={styles.plus}>+</span>
    </summary>
    <div className={`${styles.ticket} ${styles.answerBody}`}><p className="text-sm leading-7 sm:text-base">{item.answer}</p>{item.issuerTerms ? <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">{item.issuerTerms.map(terms => <li key={terms.href}><a href={terms.href} className="font-bold underline">{terms.label}</a></li>)}</ul> : null}<Link href={item.action.href} className={`${styles.ticket} ${styles.button} ${styles.answerLink}`}>{item.action.label}<span aria-hidden="true" className="ml-2">→</span></Link>{item.followUpAction ? <Link href={item.followUpAction.href} className={`${styles.ticket} ${styles.button} ${styles.answerLink}`}>{item.followUpAction.label}<span aria-hidden="true" className="ml-2">→</span></Link> : null}</div>
  </details>;
}
