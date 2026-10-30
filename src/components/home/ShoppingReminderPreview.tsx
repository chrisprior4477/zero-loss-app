"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { productEntryHref } from "@/lib/entries/return-intent";
import styles from "./shopping-reminder-preview.module.css";

type Props = {
  variant: "viewed" | "entry";
  product: { slug: string; title: string; image: string };
};

/** Explicit review links only. Never creates, clears, or submits a real entry intent. */
export function ShoppingReminderPreview({ variant, product }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const hasEntry = variant === "entry";
  const action = hasEntry ? "Continue your entry" : "Back to this product";

  if (dismissed) return <div className={styles.reset}>
    <span>Reminder preview closed.</span>
    <button type="button" onClick={() => setDismissed(false)}>Show again</button>
    <Link href="/">Exit preview</Link>
  </div>;

  return <div className={styles.dock}>
    <aside className={styles.ticket} aria-label={hasEntry ? "Unfinished entry reminder preview" : "Recently viewed reminder preview"}
      onKeyDown={event => { if (event.key === "Escape") setDismissed(true); }}>
      <div className={styles.picture}>
        <Image src={product.image} alt="" width={64} height={64} />
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{hasEntry ? "You started an entry" : "You were looking at"}</p>
        <p className={styles.title}>{product.title}</p>
        {hasEntry ? <p className={styles.status}>1 entry selected <span aria-hidden="true">·</span> <strong>Not submitted</strong></p> : null}
      </div>
      <Link className={styles.action} href={hasEntry ? productEntryHref(product.slug) : `/items/${product.slug}`}>
        {action}<span aria-hidden="true">→</span>
      </Link>
      <button className={styles.close} type="button" aria-label="Dismiss reminder" onClick={() => setDismissed(true)}>×</button>
    </aside>
  </div>;
}
