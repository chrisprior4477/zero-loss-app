"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensurePreviewCustomer } from "@/lib/preview/provisioning";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { entryReceiptHref, parseEntryRequest, type EntryRequest } from "./request";

export type PreviewEntryActionState =
  | { status: "idle" }
  | { status: "error"; message: string; code?: "insufficient_balance" }
  | { status: "request"; message: string; request: EntryRequest }
  | { status: "succeeded"; message: string; href: string; outcome: "active" | "winner" | "not_selected" };

export type EntryExplainerPreferenceState =
  | { status: "succeeded" }
  | { status: "error"; message: string };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const keyPattern = /^[A-Za-z0-9_-]{16,128}$/;

function entryError(error: unknown): PreviewEntryActionState {
  const candidate = error as { code?: string; message?: string };
  if (candidate.code === "P0001" && candidate.message === "Add demo funds before entering this quantity.") {
    return { status: "error", code: "insufficient_balance", message: "Add funds to cover these entries, then return to this prize." };
  }
  if (candidate.code === "P0001") return { status: "error", message: candidate.message ?? "This preview entry is not available." };
  if (candidate.code === "22023") return { status: "error", message: "This product is not currently available for a preview entry." };
  if (candidate.code === "42501") return { status: "error", message: "Sign in with a confirmed preview account to enter." };
  return { status: "error", message: "We could not confirm the entry. Check My Activity before trying again." };
}

export async function acknowledgeExtraEntryExplainer(): Promise<EntryExplainerPreferenceState> {
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) {
      return { status: "error", message: "Sign in again to save this preference." };
    }
    const { error } = await db.rpc("acknowledge_extra_entry_explainer");
    if (error) return { status: "error", message: "We could not save this preference. Please try again." };
    revalidatePath("/", "layout");
    return { status: "succeeded" };
  } catch {
    return { status: "error", message: "We could not save this preference. Please try again." };
  }
}

export async function createPreviewEntry(
  _previous: PreviewEntryActionState,
  formData: FormData,
): Promise<PreviewEntryActionState> {
  const offeringSlug = String(formData.get("offeringSlug") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const quantity = Number(formData.get("quantity") ?? "1");
  const shareWithCrew = formData.get("shareWithCrew") === "yes";
  if (!slugPattern.test(offeringSlug) || !keyPattern.test(idempotencyKey) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    return { status: "error", message: "This entry request is invalid. Refresh the page and try again." };
  }
  if (!isPreviewDataEnvironment()) {
    return { status: "error", message: "Preview entries are unavailable in this environment." };
  }

  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user?.email_confirmed_at) {
      return { status: "error", message: "Sign in with a confirmed preview account to enter." };
    }
    await ensurePreviewCustomer(db, user);
    const { data, error } = await db.rpc("create_preview_entries_with_sharing", {
      p_offering_slug: offeringSlug,
      p_quantity: quantity,
      p_idempotency_key: idempotencyKey,
      p_share_with_crew: shareWithCrew,
    });
    if (error) return entryError(error);
    if (data?.requestId) {
      const request = parseEntryRequest(data);
      revalidatePath("/", "layout");
      return { status: "request", request, message: request.status === "pending"
        ? "Reserved for 30 seconds. You can undo this submission before it is confirmed."
        : request.status === "accepted" ? "Your entries are confirmed."
        : "This submission was not entered. Its reserved funds were returned to Playable Balance." };
    }
    const outcome = data?.status;
    if (outcome !== "active" && outcome !== "winner" && outcome !== "not_selected") {
      throw new Error("Invalid entry response");
    }

    revalidatePath("/", "layout");
    // A slug does not identify a ticket/reward after multiple purchases.
    // Older database responses safely land on the list, never an ambiguous detail.
    const href = entryReceiptHref(data, offeringSlug);
    const entryLabel = quantity === 1 ? "Entry" : `${quantity} entries`;
    const message = outcome === "winner"
      ? `${entryLabel} confirmed—opening your wallet reward${quantity === 1 ? "" : "s"}.`
      : outcome === "not_selected"
        ? `${entryLabel} confirmed. Your separate product completion option${quantity === 1 ? " is" : "s are"} ready.`
        : `${entryLabel} confirmed. ${quantity === 1 ? "It is" : "They are"} now in My Activity.`;
    return { status: "succeeded", message, href, outcome };
  } catch (error) {
    return entryError(error);
  }
}

export async function listPendingEntryRequests(): Promise<{ requests: EntryRequest[]; error?: string }> {
  if (!isPreviewDataEnvironment()) return { requests: [] };
  try {
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return { requests: [] };
    const result = await db.rpc("list_preview_entry_requests");
    // Compatible with the app-before-switch rollout; absent schema is not success
    // for a submission, but there cannot yet be any pending requests to display.
    if (result.error) return { requests: [], error: "Could not refresh pending entries." };
    if (!Array.isArray(result.data)) throw new Error("Invalid request list");
    return { requests: result.data.map(parseEntryRequest) };
  } catch {
    return { requests: [], error: "Could not refresh pending entries." };
  }
}

export async function resolvePendingEntryRequest(requestId: string, undo: boolean): Promise<{ request?: EntryRequest; error?: string }> {
  if (!isPreviewDataEnvironment() || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId) || typeof undo !== "boolean") {
    return { error: "Invalid entry request." };
  }
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { error: "Sign in again to check this entry." };
    const { data, error } = await db.rpc("resolve_preview_entry_request", { p_request_id: requestId, p_undo: undo });
    if (error) throw error;
    const request = parseEntryRequest(data);
    revalidatePath("/", "layout");
    return { request };
  } catch {
    return { error: "We couldn’t confirm that change. Retry to check the saved result; you won’t be charged twice." };
  }
}
