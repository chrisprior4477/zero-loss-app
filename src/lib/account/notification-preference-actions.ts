"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notificationPreferenceKeys, type NotificationPreferenceKey } from "./notifications";

export async function setInAppAlertPreference(key: NotificationPreferenceKey, enabled: boolean): Promise<{ ok: boolean; message: string }> {
  if (!notificationPreferenceKeys.includes(key) || typeof enabled !== "boolean") {
    return { ok: false, message: "Choose a valid alert setting." };
  }
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ok: false, message: "Sign in again to change your alerts." };
    const { error } = await db.rpc("set_in_app_alert_preference", { p_key: key, p_enabled: enabled });
    if (error) return { ok: false, message: "This alert setting could not be saved. Please try again." };
    revalidatePath("/account/notifications");
    return { ok: true, message: `${enabled ? "On" : "Off"} — your alert choice was saved.` };
  } catch {
    return { ok: false, message: "We couldn’t confirm your alert choice. Please try again." };
  }
}
