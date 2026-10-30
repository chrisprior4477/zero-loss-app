"use client";

import Link from "next/link";
import { useState } from "react";
import { productEntryHref } from "@/lib/entries/return-intent";
import styles from "./shopping-reminder-preview.module.css";
import { ShoppingReminder } from "./ShoppingReminder";

type Props = {
  variant: "viewed" | "entry";
  product: { slug: string; title: string; image: string };
};

/** Explicit review links only. Never creates, clears, or submits a real entry intent. */
export function ShoppingReminderPreview({ variant, product }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const hasEntry = variant === "entry";

  if (dismissed) return <div className={styles.reset}>
    <span>Reminder preview closed.</span>
    <button type="button" onClick={() => setDismissed(false)}>Show again</button>
    <Link href="/">Exit preview</Link>
  </div>;

  return <ShoppingReminder product={product} quantity={hasEntry ? 1 : undefined}
    href={hasEntry ? productEntryHref(product.slug) : `/items/${product.slug}`} onDismiss={() => setDismissed(true)} />;
}
