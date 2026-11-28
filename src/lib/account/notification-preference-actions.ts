"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as shoppingClient } from "@/lib/personal-demo/shopper";
import { directAlertKeys, notificationPreferenceKeys, type DirectAlertKey, type NotificationPreferenceKey } from "./notifications";

export async function setInAppAlertPreference(key: NotificationPreferenceKey | DirectAlertKey, enabled: boolean): Promise<{ ok: boolean; message: string; savedAt?: number }> {
  const direct = directAlertKeys.some(candidate => candidate === key);
  if ((!direct && !notificationPreferenceKeys.some(candidate => candidate === key)) || typeof enabled !== "boolean") {
    return { ok: false, message: "Choose a valid alert setting." };
  }
  try {
    const db = await (direct ? shoppingClient() : createClient());
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ok: false, message: "Sign in again to change your alerts." };
    const { error } = await db.rpc("set_in_app_alert_preference", { p_key: key, p_enabled: enabled });
    if (error) return { ok: false, message: "This alert setting could not be saved. Please try again." };
    const savedAt = Date.now();
    revalidatePath("/account/notifications");
    return { ok: true, savedAt, message: `${enabled ? "On" : "Off"} — your alert choice was saved.` };
  } catch {
    return { ok: false, message: "We couldn’t confirm your alert choice. Please try again." };
  }
}
