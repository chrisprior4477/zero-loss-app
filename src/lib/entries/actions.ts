"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensurePreviewCustomer } from "@/lib/preview/provisioning";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";

export type PreviewEntryActionState =
  | { status: "idle" }
  | { status: "error"; message: string; code?: "insufficient_balance" }
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
    const outcome = data?.status;
    if (outcome !== "active" && outcome !== "winner" && outcome !== "not_selected") {
      throw new Error("Invalid entry response");
    }

    revalidatePath("/", "layout");
    // A slug does not identify a ticket/reward after multiple purchases.
    // Older database responses safely land on the list, never an ambiguous detail.
    const entryId = typeof data.entryId === "string" && /^ent_[0-9a-f]+$/.test(data.entryId) ? data.entryId : null;
    const rewardId = typeof data.rewardId === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data.rewardId) ? data.rewardId : null;
    const href = outcome === "winner"
      ? rewardId ? `/account/wallet?${new URLSearchParams({ reward: offeringSlug, rewardId })}` : "/account/wallet"
      : entryId ? `/account/entries?${new URLSearchParams({ item: offeringSlug, entry: entryId })}` : "/account/entries";
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
