"use server";
import { createClient } from "@/lib/supabase/server";
import { bannerStyles, notificationPopupStyles, type BannerStyle, type NotificationPopupStyle } from "./banner-style";
export async function saveNotificationBanner(style: BannerStyle, enabled: boolean, speed = 5, displaySeconds = 6, popupStyle?: NotificationPopupStyle) {
  if (!bannerStyles.includes(style) || typeof enabled !== "boolean" || !Number.isInteger(speed) || speed < 1 || speed > 10) return { ok: false, message: "Choose one of the six banner styles." };
  if (!Number.isInteger(displaySeconds) || displaySeconds < 1 || displaySeconds > 10) return { ok: false, message: "Choose a display time from 1 to 10 seconds." };
  if (popupStyle !== undefined && !notificationPopupStyles.includes(popupStyle)) return { ok: false, message: "Choose rounded edges or ticket for your popup." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to save your banner." };
  const { error } = await db.rpc("save_notification_banner_preferences", { p_style: style, p_enabled: enabled, p_speed: speed, p_display_seconds: displaySeconds, ...(popupStyle === undefined ? {} : { p_popup_style: popupStyle }) });
  if (error) return { ok: false, message: "Your banner could not be saved. Please try again." };
  // The provider applies this choice immediately. Account pages are read fresh
  // from the signed-in session; rebuilding the whole layout delays every save.
  return { ok: true, message: "Notification banner saved." };
}
