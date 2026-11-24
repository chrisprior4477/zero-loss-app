import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseSharedProductContext } from "./receiving";
import { parseSavedProductShares } from "./saved-shares";
export async function getSharedProductContext(slug: string, token: unknown, signedIn: boolean, savedShareId?: string) {
  const db = await createClient();
  let resolved = typeof token === "string" && /^[0-9a-f-]{36}$/i.test(token) ? token : null;
  if (!resolved && signedIn) {
    const { data, error } = await db.rpc("get_received_product_shares");
    const shares = error ? null : parseSavedProductShares(data);
    resolved = shares?.find(share => share.slug === slug && (!savedShareId || share.id === savedShareId))?.token ?? null;
  }
  if (!resolved) return null;
  const { data } = await db.rpc("product_share_context", { p_token: resolved, p_slug: slug });
  return parseSharedProductContext(data);
}
