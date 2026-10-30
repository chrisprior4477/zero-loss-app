"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./shopping-reminder-preview.module.css";

export type ReminderProduct = { slug: string; title: string; image: string };

export function ShoppingReminder({ product, quantity, href, onDismiss }: {
  product: ReminderProduct;
  quantity?: number;
  href: string;
  onDismiss: () => void;
}) {
  const hasEntry = quantity !== undefined;
  return <div className={styles.dock}>
    <aside className={styles.ticket} aria-label={hasEntry ? "Unfinished entry reminder" : "Recently viewed reminder"}
      onKeyDown={event => { if (event.key === "Escape") onDismiss(); }}>
      <div className={styles.picture}><Image src={product.image} alt="" width={64} height={64} /></div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{hasEntry ? "You started an entry" : "You were looking at"}</p>
        <p className={styles.title}>{product.title}</p>
        {hasEntry ? <p className={styles.status}>{quantity} {quantity === 1 ? "entry" : "entries"} selected <span aria-hidden="true">·</span> <strong>Not submitted</strong></p> : null}
      </div>
      <Link className={styles.action} href={href}>
        {hasEntry ? "Continue your entry" : "Back to this product"}<span aria-hidden="true">→</span>
      </Link>
      <button className={styles.close} type="button" aria-label="Dismiss reminder" onClick={onDismiss}>×</button>
    </aside>
  </div>;
}
