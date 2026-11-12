"use server";

import { revalidatePath } from "next/cache";
import { getAccountContext } from "@/lib/account/context";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/supabase/server";

type BulkDeclineResult = { status: "succeeded" | "partial" | "error"; message: string; optionIds: string[] };
export type DeclineReceipt = { optionId: string; declineEventId: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function runOptionActions<T, R>(items: T[], action: (db: Awaited<ReturnType<typeof createClient>>, item: T) => Promise<R>) {
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return items.map(() => null);
  const results: (R | null)[] = [];
  for (let start = 0; start < items.length; start += 8) {
    const batch = items.slice(start, start + 8);
    results.push(...await Promise.all(batch.map(async item => {
      try {
        return await action(db, item);
      } catch {
        return null;
      }
    })));
  }
  return results;
}

export async function declineAllDemoPurchaseOptions(slug: string, reviewedOptionIds: string[]): Promise<BulkDeclineResult & { receipts: DeclineReceipt[] }> {
  if (!isPreviewDataEnvironment() || !/^[a-z0-9-]{1,120}$/.test(slug)) {
    return { status: "error", message: "Bulk decline is available only for demo purchase options.", optionIds: [], receipts: [] };
  }
  // A slug/count is not consent to decline offers created in another tab.
  if (!Array.isArray(reviewedOptionIds) || !reviewedOptionIds.length
    || reviewedOptionIds.some(id => typeof id !== "string" || !uuidPattern.test(id))
    || new Set(reviewedOptionIds).size !== reviewedOptionIds.length) {
    return { status: "error", message: "Review the exact offers you want to decline before confirming.", optionIds: [], receipts: [] };
  }
  const account = await getAccountContext();
  if (!account || account.wallet?.scope !== "demo" || account.activity.source === "unavailable") {
    return { status: "error", message: "Sign in to your demo account and refresh these options before trying again.", optionIds: [], receipts: [] };
  }
  const available = new Set(account.activity.activity
    .filter(item => item.slug === slug && item.status === "completion" && item.completionOptionStatus === "available")
    .map(item => item.completionOptionId));
  if (reviewedOptionIds.some(id => !available.has(id))) {
    return { status: "error", message: "These offers have changed. Refresh and review their current status before declining.", optionIds: [], receipts: [] };
  }
  const requestId = crypto.randomUUID().replaceAll("-", "");
  const results = await runOptionActions(reviewedOptionIds, async (db, optionId): Promise<DeclineReceipt | null> => {
    const { data, error } = await db.rpc("decline_preview_purchase_option_with_receipt", {
      p_completion_option_id: optionId,
      p_idempotency_key: `decline_${requestId}_${optionId.replaceAll("-", "")}`,
    });
    return !error && data?.status === "declined" && typeof data.declineEventId === "string" && uuidPattern.test(data.declineEventId)
      ? { optionId, declineEventId: data.declineEventId } : null;
  });
  const receipts = results.filter((receipt): receipt is DeclineReceipt => receipt !== null);
  const confirmed = receipts.length;
  const failed = reviewedOptionIds.length - confirmed;
  const optionIds = receipts.map(receipt => receipt.optionId);
  if (!confirmed) return { status: "error", message: "No declines were confirmed. Check your current offers before trying again.", optionIds, receipts };
  // Do not revalidate here: Next can rerender this checkout before the action's
  // Undo receipt is shown. The client signals peers now and refreshes on exit.
  return failed
    ? { status: "partial", message: `${confirmed} ${confirmed === 1 ? "offer was" : "offers were"} declined, but ${failed} could not be confirmed. Check Declined Offers before retrying.`, optionIds, receipts }
    : { status: "succeeded", message: `${confirmed} ${confirmed === 1 ? "offer" : "offers"} declined. You can undo this for 30 seconds. Original entries and wallet history remain saved.`, optionIds, receipts };
}

export async function undoBulkDemoPurchaseOptions(receipts: DeclineReceipt[]): Promise<BulkDeclineResult> {
  if (!isPreviewDataEnvironment() || !Array.isArray(receipts) || !receipts.length || receipts.some(receipt =>
    !receipt || typeof receipt.optionId !== "string" || !uuidPattern.test(receipt.optionId)
    || typeof receipt.declineEventId !== "string" || !uuidPattern.test(receipt.declineEventId))
    || new Set(receipts.map(receipt => receipt.optionId)).size !== receipts.length) {
    return { status: "error", message: "These demo offers could not be restored. Check Declined Offers.", optionIds: [] };
  }
  const results = await runOptionActions(receipts, async (db, receipt) => {
    const { data, error } = await db.rpc("undo_preview_purchase_option_decline", {
      p_completion_option_id: receipt.optionId, p_decline_event_id: receipt.declineEventId,
    });
    if (error?.code === "PT409") return "stale";
    return !error && data?.status === "available" ? "restored" : null;
  });
  const optionIds = receipts.filter((_, index) => results[index] === "restored").map(receipt => receipt.optionId);
  const failed = receipts.length - optionIds.length;
  if (optionIds.length > 0) {
    revalidatePath("/account/entries");
    revalidatePath("/account/declined-offers");
    revalidatePath("/account/notifications");
  }
  if (failed) {
    const explanation = results.includes("stale") ? "A newer change replaced one or more declines." : "Check Declined Offers for their current status.";
    return { status: optionIds.length ? "partial" : "error", message: `${optionIds.length} restored, ${failed} could not be restored. ${explanation}`, optionIds };
  }
  return { status: "succeeded", message: "All offers restored with their original deadlines and balances.", optionIds };
}
