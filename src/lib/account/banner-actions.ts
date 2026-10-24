"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bannerStyles, type BannerStyle } from "./banner-style";
export async function saveNotificationBanner(style: BannerStyle, enabled: boolean, speed = 5, displaySeconds = 6) {
  if (!bannerStyles.includes(style) || typeof enabled !== "boolean" || !Number.isInteger(speed) || speed < 1 || speed > 10) return { ok: false, message: "Choose one of the six banner styles." };
  if (!Number.isInteger(displaySeconds) || displaySeconds < 1 || displaySeconds > 10) return { ok: false, message: "Choose a display time from 1 to 10 seconds." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to save your banner." };
  const { error } = await db.rpc("save_notification_banner_preferences", { p_style: style, p_enabled: enabled, p_speed: speed, p_display_seconds: displaySeconds });
  if (error) return { ok: false, message: "Your banner could not be saved. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Notification banner saved." };
}
