"use client";

import { PRODUCT_SHARE_EVENT, type ProductShareItem } from "@/lib/sharing/product-share";
import { ShareIcon } from "./ShareIcon";
import styles from "./post-entry-crew-toast.module.css";

/** Rendered only in authenticated product/account views. No entry is required. */
export function ProductShareButton({ product }: { product: ProductShareItem }) {
  return <button type="button" className={styles.reopen} data-product-share={product.slug}
    onClick={() => window.dispatchEvent(new CustomEvent(PRODUCT_SHARE_EVENT, { detail: product }))}>
    <ShareIcon name="share" /> Share this item
  </button>;
}
