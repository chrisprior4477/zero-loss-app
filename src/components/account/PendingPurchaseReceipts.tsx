"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { purchaseReceiptHref } from "@/lib/account/activity";
import { checkoutReceiptId } from "@/lib/account/checkout-cards";
import { checkoutAttemptKey } from "@/lib/account/checkout-attempt";

type CompletedOption = { slug: string; title: string; optionId: string };
const subscribe = () => () => {};
const serverSnapshot = () => "";

export function PendingPurchaseReceipts({ ownerId, purchases }: { ownerId: string; purchases: CompletedOption[] }) {
  const snapshot = useSyncExternalStore(subscribe, () => {
    const receipts = new Map<string, { href: string; title: string }>();
    for (const purchase of purchases) {
      try {
        const attempt = JSON.parse(sessionStorage.getItem(checkoutAttemptKey(ownerId, purchase.slug)) ?? "null")?.purchase;
        if (attempt?.slug !== purchase.slug || !checkoutReceiptId.test(attempt.requestId)
          || !Array.isArray(attempt.purchaseIds) || !attempt.purchaseIds.includes(purchase.optionId)) continue;
        const href = purchaseReceiptHref(purchase.slug, attempt.requestId);
        receipts.set(href, { href, title: purchase.title });
      } catch { /* Other completed records are still available. */ }
    }
    return JSON.stringify([...receipts.values()]);
  }, serverSnapshot);
  const receipts: { href: string; title: string }[] = snapshot ? JSON.parse(snapshot) : [];
  if (!receipts.length) return null;
  return <ul aria-label="Purchase receipts to check" className="my-4 space-y-2">
    {receipts.map(({ href, title }) => <li key={href}><Link href={href} className="inline-flex min-h-11 items-center font-bold text-cyan-200 underline">Check purchase receipt · {title}</Link></li>)}
  </ul>;
}
