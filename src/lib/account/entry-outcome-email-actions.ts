"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EntryOutcomeEmailState = { status: "idle" | "succeeded" | "error"; message: string };

export async function saveEntryOutcomeEmailPreference(_previous: EntryOutcomeEmailState, formData: FormData): Promise<EntryOutcomeEmailState> {
  const enabled = formData.get("enabled") === "true";
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { status: "error", message: "Sign in again before saving this choice." };
    const { error } = await db.rpc("set_entry_outcome_email_enabled", { p_enabled: enabled });
    if (error) return { status: "error", message: "We couldn't save your email preference. Try again later." };
    revalidatePath("/account/entries");
    revalidatePath("/account/notifications");
    return { status: "succeeded", message: "Email preference saved. You can change it here any time." };
  } catch {
    return { status: "error", message: "We couldn't confirm this change. Refresh the page before trying again." };
  }
}
