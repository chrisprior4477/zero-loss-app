"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { storeNotificationReads } from "@/lib/account/notification-read-store";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { savedShareHref, shareUuid } from "./saved-shares";

export async function recordReceivedProduct(slug: string, token: string | null, save = false) {
  const failure = { ok: false as const, message: "This shared item could not be saved. Please try again." };
  if (typeof slug !== "string" || !getDemoProduct(slug) || (token !== null && (typeof token !== "string" || !shareUuid.test(token))) || typeof save !== "boolean") return failure;
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false as const, message: "Sign in to save items shared with you." };
  const { data, error } = await db.rpc("record_saved_product_share", { p_slug: slug, p_token: token, p_save: save });
  if (error || typeof data !== "string" || !shareUuid.test(data)) return failure;
  revalidatePath("/account/favorites");
  return { ok: true as const, id: data, href: savedShareHref(), message: "Saved in Shared with You." };
}

export async function setReceivedProductState(id: string, state: "viewed" | "declined" | "restore") {
  const failure = { ok: false as const, message: "This shared item could not be updated. Please try again." };
  if (typeof id !== "string" || !shareUuid.test(id) || !["viewed", "declined", "restore"].includes(state)) return failure;
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false as const, message: "Sign in to update this shared item." };
  const { data, error } = await db.rpc("set_saved_product_share_state", { p_id: id, p_state: state });
  if (error || !data || data.id !== id) return failure;
  // A notification outage must not turn a committed share decision into a failure.
  try { await storeNotificationReads([`shared-${id}`]); } catch { /* The unread notification can be retried independently. */ }
  revalidatePath("/account/favorites");
  revalidatePath("/account/notifications");
  return { ok: true as const, viewedAt: typeof data.viewedAt === "string" ? data.viewedAt : null,
    declinedAt: typeof data.declinedAt === "string" ? data.declinedAt : null,
    message: state === "declined" ? "Declined. This item stays in Shared with You." : state === "restore" ? "This share is available to revisit." : "" };
}
