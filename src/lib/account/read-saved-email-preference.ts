"use server";

import { createClient } from "@/lib/supabase/server";

export async function readSavedEmailPreference(preference: "outcome" | "purchase"): Promise<boolean | null> {
  // Both getters authorize the current account through auth.uid().
  if (preference !== "outcome" && preference !== "purchase") return null;
  const db = await createClient();
  const { data, error } = await db.rpc(preference === "outcome"
    ? "get_entry_outcome_email_enabled"
    : "get_purchase_option_email_enabled");
  return !error && typeof data === "boolean" ? data : null;
}
