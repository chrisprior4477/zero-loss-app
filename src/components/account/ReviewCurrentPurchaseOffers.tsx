"use client";

import Link from "next/link";
import { checkoutAttemptKey } from "@/lib/account/checkout-attempt";

export function ReviewCurrentPurchaseOffers({ href, className, ownerId, slug, receipt }: {
  href: string; className: string; ownerId: string; slug: string; receipt: string;
}) {
  return <Link href={href} className={className} onNavigate={() => {
    try {
      const key = checkoutAttemptKey(ownerId, slug);
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (saved?.purchase?.slug === slug && saved.purchase.requestId === receipt) {
        // The server already looked up this exact receipt. A retry still uses
        // the original request so a late confirmation cannot charge twice.
        sessionStorage.setItem(key, JSON.stringify({ ...saved, receiptNotFound: receipt }));
      }
    } catch { /* The offer remains available without browser storage. */ }
  }}>Review current offers</Link>;
}
