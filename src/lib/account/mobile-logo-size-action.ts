"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMobileLogoSize } from "@/lib/navigation/mobile-logo-size";

export async function saveMobileLogoSize(size: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isMobileLogoSize(size)) return { ok: false, message: "Choose one of the logo sizes." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in again to save your logo size." };
  const { error } = await supabase.rpc("set_mobile_logo_size", { p_size: size });
  if (error) return { ok: false, message: "Your logo size could not be saved. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}
