"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";

export type SupportActionState = { status: "idle" } | { status: "error"; message: string; uncertain?: boolean } | { status: "saved"; caseId: string };
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const key = /^[A-Za-z0-9_-]{16,128}$/;

export async function saveSupportCase(_previous: SupportActionState, form: FormData): Promise<SupportActionState> {
  const caseId = String(form.get("caseId") ?? "");
  const transactionId = String(form.get("transactionId") ?? "");
  const body = String(form.get("body") ?? "").trim();
  const requestKey = String(form.get("requestKey") ?? "");
  const subject = String(form.get("subject") ?? "").trim();
  const category = String(form.get("category") ?? "other");
  const status = String(form.get("status") ?? "open");
  if (!isPreviewDataEnvironment()) return { status: "error", message: "Support submission is unavailable in this environment." };
  if (!key.test(requestKey) || (caseId && !uuid.test(caseId)) || (transactionId && !uuid.test(transactionId)) || body.length < 10 || body.length > 4000 ||
    (!caseId && (subject.length < 5 || subject.length > 140 || !["wallet", "entry", "reward", "account", "other"].includes(category))) ||
    !["open", "awaiting_customer", "resolved"].includes(status)) return { status: "error", message: "Please check the form. Include a message of 10–4,000 characters." };
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { status: "error", message: "Sign in again before sending your request." };
    const result = caseId
      ? await db.rpc("reply_support_case", { p_case_id: caseId, p_body: body, p_status: status, p_idempotency_key: requestKey })
      : await db.rpc("create_support_case", { p_ledger_entry_id: transactionId || null, p_category: category, p_subject: subject, p_body: body, p_idempotency_key: requestKey });
    if (result.error) {
      if (result.error.code === "P0001") return { status: "error", message: "Please wait a few minutes, or continue an existing case." };
      if (result.error.code === "42501") return { status: "error", message: "That case or transaction is unavailable for this account." };
      if (result.error.code === "22023") return { status: "error", message: "These details don’t match the saved request. Open My support cases to check the conversation before sending again." };
      throw result.error;
    }
    if (typeof result.data !== "string" || !uuid.test(result.data)) throw new Error("Invalid support receipt");
    revalidatePath("/support");
    revalidatePath("/contact");
    revalidatePath("/account/notifications");
    return { status: "saved", caseId: result.data };
  } catch {
    return { status: "error", uncertain: true, message: "We couldn’t confirm your message. Check the saved result below; we’ll resend the exact same request safely." };
  }
}
