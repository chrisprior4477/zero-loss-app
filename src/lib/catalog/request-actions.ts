"use server";

import { createClient } from "@/lib/supabase/server";
import { isCatalogRequestKey } from "./request-draft";
import { maxCatalogSearchLength } from "./search-text";

export type CatalogRequestState =
  | { status: "idle" }
  | { status: "succeeded"; message: string }
  | { status: "error"; message: string; uncertain?: boolean };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitCatalogRequest(
  _previous: CatalogRequestState,
  formData: FormData,
): Promise<CatalogRequestState> {
  const requestedItem = String(formData.get("requestedItem") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const notes = String(formData.get("notes") ?? "").trim();
  const sourceQuery = String(formData.get("sourceQuery") ?? "").trim();
  const requestKey = formData.get("requestKey");

  if (requestedItem.length < 2 || requestedItem.length > 160) {
    return { status: "error", message: "Tell us what you would like to see in 2–160 characters." };
  }
  if (!emailPattern.test(email) || email.length > 254) {
    return { status: "error", message: "Enter a valid email address so we can follow up if needed." };
  }
  if (notes.length > 1000) {
    return { status: "error", message: "Keep the extra details to 1,000 characters or fewer." };
  }
  if (sourceQuery.length > maxCatalogSearchLength) {
    return { status: "error", message: "Shorten the original search before submitting this request." };
  }
  if (!isCatalogRequestKey(requestKey)) {
    return { status: "error", message: "Refresh the request form and try again." };
  }

  try {
    const db = await createClient();
    const { data: receipt, error } = await db.rpc("submit_catalog_request_once", {
      p_request_key: requestKey,
      p_email: email,
      p_requested_item: requestedItem,
      p_notes: notes || null,
      p_source_query: sourceQuery || null,
    });
    if (error) {
      const message = error.code === "P0001" ? error.message : null;
      return message ? { status: "error", message } : { status: "error", uncertain: true, message: "We couldn’t confirm this request. Check the original submission." };
    }
    if (receipt !== requestKey.toLowerCase()) {
      return { status: "error", uncertain: true, message: "We couldn’t confirm this request. Check the original submission." };
    }
    return {
      status: "succeeded",
      message: "Thanks—we saved your request. What customers ask for helps shape what we add next.",
    };
  } catch {
    return { status: "error", uncertain: true, message: "We couldn’t confirm this request. Check the original submission." };
  }
}
