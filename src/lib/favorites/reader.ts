import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FavoriteSnapshot = { slugs: string[]; available: boolean };

/** The supplied customer id comes from the verified request-scoped account context. */
export async function getFavoriteSnapshot(customerId: string): Promise<FavoriteSnapshot> {
  try {
    const db = await createClient();
    const { data, error } = await db.from("customer_favorites")
      .select("product_slug")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return { slugs: [], available: false };
    return { slugs: data.map(row => row.product_slug).filter((slug): slug is string => typeof slug === "string"), available: true };
  } catch {
    return { slugs: [], available: false };
  }
}
