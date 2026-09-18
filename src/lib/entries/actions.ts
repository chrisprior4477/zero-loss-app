"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensurePreviewCustomer } from "@/lib/preview/provisioning";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";

export type PreviewEntryActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "succeeded"; message: string; href: string; outcome: "active" | "winner" | "not_selected" };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const keyPattern = /^[A-Za-z0-9_-]{16,128}$/;

function entryError(error: unknown): PreviewEntryActionState {
  const candidate = error as { code?: string; message?: string };
  if (candidate.code === "P0001") return { status: "error", message: candidate.message ?? "This preview entry is not available." };
  if (candidate.code === "22023") return { status: "error", message: "This product is not currently available for a preview entry." };
  if (candidate.code === "42501") return { status: "error", message: "Sign in with a confirmed preview account to enter." };
  return { status: "error", message: "We could not confirm the entry. Check My Activity before trying again." };
}

export async function createPreviewEntry(
  _previous: PreviewEntryActionState,
  formData: FormData,
): Promise<PreviewEntryActionState> {
  const offeringSlug = String(formData.get("offeringSlug") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!slugPattern.test(offeringSlug) || !keyPattern.test(idempotencyKey)) {
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
    const { data, error } = await db.rpc("create_preview_entry", {
      p_offering_slug: offeringSlug,
      p_idempotency_key: idempotencyKey,
    });
    if (error) return entryError(error);
    const outcome = data?.status;
    if (outcome !== "active" && outcome !== "winner" && outcome !== "not_selected") {
      throw new Error("Invalid entry response");
    }

    revalidatePath("/", "layout");
    const href = outcome === "winner"
      ? `/account/wallet?${new URLSearchParams({ reward: offeringSlug })}`
      : `/account/entries?${new URLSearchParams({ item: offeringSlug })}`;
    const message = outcome === "winner"
      ? "Entry confirmed—you won. Opening your wallet reward."
      : outcome === "not_selected"
        ? "Entry confirmed. Your product completion option is ready."
        : "Entry confirmed. It is now in My Activity.";
    return { status: "succeeded", message, href, outcome };
  } catch (error) {
    return entryError(error);
  }
}
