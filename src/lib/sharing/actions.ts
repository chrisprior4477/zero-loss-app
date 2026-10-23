"use server";

import { createClient } from "@/lib/supabase/server";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import type { ProductShareItem } from "./product-share";

export async function getProductShareItem(slug: string): Promise<ProductShareItem | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  const product = getDemoProduct(slug);
  return product ? { slug: product.slug, title: product.title, image: product.gallery[0]?.src, retailer: product.retailer, value: product.value } : null;
}
