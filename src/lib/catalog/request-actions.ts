"use server";

import { createClient } from "@/lib/supabase/server";

export type CatalogRequestState =
  | { status: "idle" }
  | { status: "succeeded"; message: string }
  | { status: "error"; message: string };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitCatalogRequest(
  _previous: CatalogRequestState,
  formData: FormData,
): Promise<CatalogRequestState> {
  const requestedItem = String(formData.get("requestedItem") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const notes = String(formData.get("notes") ?? "").trim();
  const sourceQuery = String(formData.get("sourceQuery") ?? "").trim();

  if (requestedItem.length < 2 || requestedItem.length > 160) {
    return { status: "error", message: "Tell us what you would like to see in 2–160 characters." };
  }
  if (!emailPattern.test(email) || email.length > 254) {
    return { status: "error", message: "Enter a valid email address so we can follow up if needed." };
  }
  if (notes.length > 1000 || sourceQuery.length > 160) {
    return { status: "error", message: "Keep the extra details under 1,000 characters." };
  }

  try {
    const db = await createClient();
    const { error } = await db.rpc("submit_catalog_request", {
      p_email: email,
      p_requested_item: requestedItem,
      p_notes: notes || null,
      p_source_query: sourceQuery || null,
    });
    if (error) {
      const message = error.code === "P0001" ? error.message : null;
      return { status: "error", message: message ?? "We could not save that request. Please try again." };
    }
    return {
      status: "succeeded",
      message: "Thanks—we saved your request. What customers ask for helps shape what we add next.",
    };
  } catch {
    return { status: "error", message: "We could not save that request. Please try again." };
  }
}
