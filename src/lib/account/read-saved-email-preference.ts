"use server";

import { createClient } from "@/lib/personal-demo/shopper";

const readers = {
  outcome: "get_entry_outcome_email_enabled",
  purchase: "get_purchase_option_email_enabled",
  favorites: "get_favorite_alert_email_enabled",
  crew: "get_crew_win_email_enabled",
} as const;

export async function readSavedEmailPreference(preference: keyof typeof readers): Promise<boolean | null> {
  if (!Object.hasOwn(readers, preference)) return null;
  const db = await createClient();
  const { data, error } = await db.rpc(readers[preference]);
  return !error && typeof data === "boolean" ? data : null;
}
