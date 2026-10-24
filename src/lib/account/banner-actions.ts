"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bannerStyles, type BannerStyle } from "./banner-style";
export async function saveNotificationBanner(style: BannerStyle, enabled: boolean) {
  if (!bannerStyles.includes(style) || typeof enabled !== "boolean") return { ok: false, message: "Choose one of the six banner styles." };
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to save your banner." };
  const { error } = await db.rpc("set_notification_banner_style", { p_style: style, p_enabled: enabled });
  if (error) return { ok: false, message: "Your banner could not be saved. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Notification banner saved." };
}
