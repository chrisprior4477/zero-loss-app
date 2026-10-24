"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getNotificationSnapshot } from "./notification-snapshot";
import { headerCategory } from "./header-notifications";
import { notificationIsEnabled } from "./notifications";

export async function restoreNotificationBanner() {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false as const, message: "Sign in again to restore your banner." };
  const snapshot = await getNotificationSnapshot();
  if (!snapshot?.readAvailable || !snapshot.preferences) return { ok: false as const, message: "Your updates could not be loaded. Please try again." };
  // Restore only current, enabled header updates, preserving unrelated receipts.
  const ids = snapshot.notifications.filter(n => headerCategory(n) && notificationIsEnabled(n, snapshot.preferences!)).map(n => n.id);
  const { error } = await db.rpc("restore_notification_banner", { p_ids: ids });
  if (error) return { ok: false as const, message: "Your banner could not be restored. Please try again." };
  const restored = new Set(ids);
  revalidatePath("/account/profile");
  return { ok: true as const, ids, snapshot: { ...snapshot, readIds: snapshot.readIds.filter(id => !restored.has(id)) }, message: ids.length ? "Banner restored. Your current alerts are available again." : "Banner turned on. There are no current alerts to restore." };
}
