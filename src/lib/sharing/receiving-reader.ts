import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseSharedProductContext } from "./receiving";
export async function getSharedProductContext(slug: string, token: unknown, signedIn: boolean) {
  const db = await createClient();
  let resolved = typeof token === "string" && /^[0-9a-f-]{36}$/i.test(token) ? token : null;
  if (!resolved && signedIn) {
    const { data } = await db.rpc("get_received_product_shares");
    resolved = Array.isArray(data) ? data.find((share: { slug?: string }) => share.slug === slug)?.token ?? null : null;
  }
  if (!resolved) return null;
  const { data } = await db.rpc("product_share_context", { p_token: resolved, p_slug: slug });
  return parseSharedProductContext(data);
}
