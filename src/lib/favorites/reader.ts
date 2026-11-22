import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FavoriteSnapshot = { slugs: string[]; available: boolean };

/** The supplied customer id comes from the verified request-scoped account context. */
export async function getFavoriteSnapshot(customerId: string): Promise<FavoriteSnapshot> {
  try {
    const db = await createClient();
    const pageSize = 200;
    const slugs: string[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await db.from("customer_favorites")
        .select("product_slug")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .order("product_slug")
        .range(offset, offset + pageSize - 1);
      if (error || !data) return { slugs, available: false };
      for (const row of data) if (typeof row.product_slug === "string") slugs.push(row.product_slug);
      if (data.length < pageSize) return { slugs, available: true };
    }
  } catch {
    return { slugs: [], available: false };
  }
}
