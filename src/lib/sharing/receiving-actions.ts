"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseSharedProductContext } from "./receiving";
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export async function prepareProductShareLink(slug: string, groupId: string | null = null): Promise<string | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (groupId !== null && !uuid.test(groupId))) return null;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data, error } = await db.rpc("create_product_share_link", { p_slug: slug, p_group_id: groupId });
  return !error && typeof data === "string" && uuid.test(data) ? data : null;
}
export async function updateSharedProductReceiving(token: string, receiving: boolean, shareBack: boolean | null = null, onlyIfNew = false) {
  if (!uuid.test(token) || typeof receiving !== "boolean" || (shareBack !== null && typeof shareBack !== "boolean") || typeof onlyIfNew !== "boolean") return { ok: false, message: "That shared link is unavailable.", context: null };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to save your sharing choices.", context: null };
  const { data, error } = await db.rpc("set_product_share_receiving", { p_token: token, p_receiving: receiving, p_share_back: shareBack, p_only_if_new: onlyIfNew });
  const context = parseSharedProductContext(data);
  if (error || !context) return { ok: false, message: "Your sharing choices could not be saved. Please try again.", context: null };
  revalidatePath("/account/crew"); revalidatePath("/account/notifications");
  return { ok: true, message: receiving ? "Your receiving choice is saved. Your own picks stay private unless you choose to share them." : `You left ${context.scope}. You can rejoin here.`, context };
}
