"use server";

import { createClient } from "@/lib/supabase/server";
import { isBusinessDraft, missingBusinessFields, type BusinessDraft, type BusinessRecord } from "./application";

export async function readBusinessApplication(owner: string): Promise<{ record: BusinessRecord | null } | { error: string }> {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user?.email_confirmed_at || user.id !== owner) return { error: "Sign in to the original account to check your saved draft." };
    const { data, error } = await db.from("business_applications").select("document,revision,status").eq("owner_id", owner).maybeSingle();
    if (error || (data && (!isBusinessDraft(data.document) || !Number.isSafeInteger(data.revision)
      || !["draft", "submitted"].includes(data.status)))) return { error: "We couldn’t check the latest saved draft. Your edits are still here." };
    return { record: data as BusinessRecord | null };
  } catch { return { error: "We couldn’t check the latest saved draft. Your edits are still here." }; }
}

export async function saveBusinessApplication(owner: string, draft: BusinessDraft, revision: number, submit: boolean) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email_confirmed_at || user.id !== owner) return { error: "Your sign-in changed. Sign in to the original account before saving." };
  if (!isBusinessDraft(draft) || !Number.isInteger(revision) || revision < 0 || typeof submit !== "boolean") return { error: "The application could not be validated." };
  if (submit) {
    const missing = missingBusinessFields(draft.values, draft.files, draft.listings);
    if (draft.values.submit_authority !== true) missing.push("Submission authorization");
    if (missing.length) return { error: "Please complete: " + missing.join(", ") };
  }
  const { data, error } = await db.rpc("save_business_application", { p_document: draft, p_revision: revision, p_submit: submit });
  if (error?.code === "PT409") return { conflict: true as const, error: "This application changed in another session." };
  if (error || typeof data !== "number") return { error: "Your changes could not be saved. Keep this page open and try Save draft again." };
  return { revision: data };
}
