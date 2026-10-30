"use client";

import { useEffect } from "react";
import { rememberViewedProduct } from "@/lib/catalog/viewed-product";

export function RememberViewedProduct({ slug, browseReturn }: { slug: string; browseReturn?: string }) {
  useEffect(() => { rememberViewedProduct(slug, browseReturn); }, [slug, browseReturn]);
  return null;
}
