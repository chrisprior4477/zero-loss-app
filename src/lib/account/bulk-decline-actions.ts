"use server";

import { revalidatePath } from "next/cache";
import { getAccountContext } from "@/lib/account/context";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/supabase/server";

type BulkDeclineResult = { status: "succeeded" | "partial" | "error"; message: string; optionIds: string[] };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function runOptionAction(optionIds: string[], action: "decline" | "revive") {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { confirmed: [], failed: optionIds };

  const confirmed: string[] = [];
  const failed: string[] = [];
  for (let start = 0; start < optionIds.length; start += 8) {
    const batch = optionIds.slice(start, start + 8);
    const results = await Promise.all(batch.map(async optionId => {
      try {
        const { data, error } = await db.rpc(action === "decline" ? "decline_purchase_option" : "revive_preview_purchase_option", {
          p_completion_option_id: optionId,
          p_idempotency_key: `${action}_${optionId.replaceAll("-", "")}`,
        });
        return !error && (action === "decline" ? data?.status === "declined" : data?.status === "available");
      } catch {
        return false;
      }
    }));
    batch.forEach((optionId, index) => (results[index] ? confirmed : failed).push(optionId));
  }
  return { confirmed, failed };
}

export async function declineAllDemoPurchaseOptions(slug: string): Promise<BulkDeclineResult> {
  if (!isPreviewDataEnvironment() || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return { status: "error", message: "Bulk decline is available only for demo purchase options.", optionIds: [] };
  }
  const account = await getAccountContext();
  if (!account || account.wallet?.scope !== "demo" || account.activity.source === "unavailable") {
    return { status: "error", message: "Sign in to your demo account and refresh these options before trying again.", optionIds: [] };
  }
  const options = account.activity.activity.filter(item => item.slug === slug && item.status === "completion" && item.completionOptionStatus !== "declined");
  if (options.length === 0) return { status: "error", message: "There are no available demo offers to decline.", optionIds: [] };
  if (options.length > 500 || options.some(item => !item.completionOptionId || !uuidPattern.test(item.completionOptionId))) {
    return { status: "error", message: "These offers could not all be verified. Refresh and check their current status.", optionIds: [] };
  }
  const optionIds = options.map(item => item.completionOptionId!);
  const { confirmed, failed } = await runOptionAction([...new Set(optionIds)], "decline");
  if (confirmed.length === 0) return { status: "error", message: "No declines were confirmed. Check your current offers before trying again.", optionIds: [] };
  return failed.length
    ? { status: "partial", message: `${confirmed.length} offers were declined, but ${failed.length} could not be confirmed. Check Declined Offers before retrying.`, optionIds: confirmed }
    : { status: "succeeded", message: `${confirmed.length} offers declined. You can undo this for 30 seconds. Original entries and wallet history remain saved.`, optionIds: confirmed };
}

export async function undoBulkDemoPurchaseOptions(optionIds: string[]): Promise<BulkDeclineResult> {
  if (!isPreviewDataEnvironment() || !Array.isArray(optionIds) || optionIds.length === 0 || optionIds.length > 500 || optionIds.some(id => typeof id !== "string" || !uuidPattern.test(id))) {
    return { status: "error", message: "These demo offers could not be restored. Check Declined Offers.", optionIds: [] };
  }
  const { confirmed, failed } = await runOptionAction([...new Set(optionIds)], "revive");
  if (confirmed.length > 0) {
    revalidatePath("/account/entries");
    revalidatePath("/account/declined-offers");
    revalidatePath("/account/notifications");
  }
  if (failed.length) return { status: confirmed.length ? "partial" : "error", message: `${confirmed.length} offers restored; ${failed.length} could not be restored. Check Declined Offers for their current status.`, optionIds: confirmed };
  return { status: "succeeded", message: "All offers restored with their original deadlines and balances.", optionIds: confirmed };
}
