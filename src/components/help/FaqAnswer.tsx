import Link from "next/link";
import type { FaqItem } from "@/lib/help/faq";
import styles from "./help-tickets.module.css";

export function FaqAnswer({ item, expanded }: { item: FaqItem; expanded?: boolean }) {
  return <details open={expanded} className={`${styles.ticket} ${styles.answer}`}>
    <summary className={styles.question}>
      {item.question}<span aria-hidden="true" className={styles.plus}>+</span>
    </summary>
    <div className={`${styles.ticket} ${styles.answerBody}`}><p className="text-sm leading-7 sm:text-base">{item.answer}</p><Link href={item.action.href} className={`${styles.ticket} ${styles.button} ${styles.answerLink}`}>{item.action.label}<span aria-hidden="true" className="ml-2">→</span></Link></div>
  </details>;
}
