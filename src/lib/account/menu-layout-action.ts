"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMenuLayout } from "@/lib/navigation/menu-layout";

export async function saveMenuLayout(layout: unknown): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isMenuLayout(layout)) return { ok: false, message: "Choose one of the five menu styles." };
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in again to save your menu choice." };
  const { error } = await supabase.rpc("set_menu_layout", { p_layout: layout });
  if (error) return { ok: false, message: "Your menu choice could not be saved. Please try again." };
  revalidatePath("/", "layout");
  return { ok: true };
}
