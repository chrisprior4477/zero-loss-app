"use client";

import { useEffect, useState } from "react";
import { clearEntryIntent, productEntryHref, readEntryIntent } from "@/lib/entries/return-intent";
import { SHOPPING_REMINDER_EVENT } from "@/lib/catalog/viewed-product";
import { ShoppingReminder, type ReminderProduct } from "./ShoppingReminder";

type Reminder = { product: ReminderProduct; href: string; quantity?: number };

export function ContinueEntryBanner({ products }: { products: ReminderProduct[] }) {
  const [reminder, setReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const refresh = () => {
      const intent = readEntryIntent();
      const entryProduct = intent && products.find(product => product.slug === intent.slug);
      if (intent?.resumeAfter && entryProduct) {
        setReminder({ product: entryProduct, quantity: intent.quantity, href: productEntryHref(intent.slug, intent.quantity, intent.browseReturn) });
        return;
      }
      // Browsing or adjusting quantity alone must never interrupt the homepage.
      setReminder(null);
    };
    // Read optional browser navigation hints after hydration, and refresh on Back/restore.
    refresh();
    window.addEventListener(SHOPPING_REMINDER_EVENT, refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SHOPPING_REMINDER_EVENT, refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [products]);

  if (!reminder) return null;

  return <ShoppingReminder {...reminder} onDismiss={() => { clearEntryIntent(); setReminder(null); }} />;
}
