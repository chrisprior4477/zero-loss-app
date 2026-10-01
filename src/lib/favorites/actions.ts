"use server";

import { getDemoProduct } from "@/lib/catalog/demo-products";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { ensurePreviewCustomer } from "@/lib/preview/provisioning";
import { createClient } from "@/lib/supabase/server";

export type FavoriteResult = { status: "saved" | "removed" | "error" | "sign-in"; message?: string };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function setFavorite(productSlug: string, shouldSave: boolean): Promise<FavoriteResult> {
  if (typeof productSlug !== "string" || productSlug.length > 120 || !slugPattern.test(productSlug) || typeof shouldSave !== "boolean") {
    return { status: "error", message: "That product could not be saved. Refresh and try again." };
  }
  if (shouldSave && !getDemoProduct(productSlug)) {
    return { status: "error", message: "That product is no longer in the catalog." };
  }

  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { status: "sign-in", message: "Sign in to save favorites." };
    if (isPreviewDataEnvironment()) await ensurePreviewCustomer(db, user);
    if (shouldSave) {
      const { error } = await db.from("customer_favorites").insert({ customer_id: user.id, product_slug: productSlug });
      if (error && error.code !== "23505") throw error;
      return { status: "saved" };
    }
    const { error } = await db.from("customer_favorites").delete()
      .eq("customer_id", user.id).eq("product_slug", productSlug);
    if (error) throw error;
    return { status: "removed" };
  } catch {
    return { status: "error", message: "Favorites could not be updated. Please try again." };
  }
}
