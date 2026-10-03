"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type AlertResult = { ok: boolean; message: string };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function setFavoriteCapacityAlert(slug: string, enabled: boolean): Promise<AlertResult> {
  if (typeof slug !== "string" || slug.length > 120 || !slugPattern.test(slug) || typeof enabled !== "boolean") {
    return { ok: false, message: "That alert choice could not be saved." };
  }
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ok: false, message: "Sign in to change this alert." };
    const { error } = await db.rpc("set_favorite_capacity_alert", { p_slug: slug, p_enabled: enabled });
    if (error) return { ok: false, message: "We couldn't save this alert. Try again." };
    revalidatePath("/account/favorites");
    return { ok: true, message: enabled ? "Almost-full email alert on." : "Almost-full email alert off." };
  } catch {
    return { ok: false, message: "We couldn't confirm this change. Refresh and try again." };
  }
}

export async function setFavoriteAlertEmailPreference(enabled: boolean): Promise<AlertResult> {
  if (typeof enabled !== "boolean") return { ok: false, message: "That email choice could not be saved." };
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ok: false, message: "Sign in to change this preference." };
    const { error } = await db.rpc("set_favorite_alert_email_enabled", { p_enabled: enabled });
    if (error) return { ok: false, message: "We couldn't save this email preference. Try again." };
    revalidatePath("/account/notifications");
    revalidatePath("/account/favorites");
    return { ok: true, message: enabled ? "Favorite alerts are allowed." : "Favorite alert emails are paused." };
  } catch {
    return { ok: false, message: "We couldn't confirm this change. Refresh and try again." };
  }
}
