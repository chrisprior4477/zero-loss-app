"use server";

import { purchasedRewardHref } from "./activity";
import { checkoutReceiptId as uuid } from "./checkout-cards";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/supabase/server";

export type BulkPurchaseRequest = { slug: string; purchaseIds: string[]; declineIds: string[]; totalCents: number; requestId: string; confirmed: boolean };
export type BulkPurchaseResult = CompletedCheckout
  | { status: "error"; message: string; recovery: "balance" | "offers" | "check" | "edit" };
export type CompletedCheckout = { status: "succeeded"; purchasedCount: number; declinedCount: number; totalCents: number; href: string; cardReady: boolean; rewardIds: string[] };

export async function completeDemoPurchaseOptions(request: BulkPurchaseRequest): Promise<BulkPurchaseResult> {
  if (!isPreviewDataEnvironment() || !request || request.confirmed !== true
    || typeof request.slug !== "string" || !/^[a-z0-9-]{1,120}$/.test(request.slug)
    || typeof request.requestId !== "string" || !uuid.test(request.requestId)
    || !Number.isSafeInteger(request.totalCents) || request.totalCents < 0
    || !Array.isArray(request.purchaseIds) || !request.purchaseIds.length || !Array.isArray(request.declineIds)) {
    return { status: "error", recovery: "edit", message: "Review and confirm your demo purchase choices before continuing." };
  }
  const ids = [...request.purchaseIds, ...request.declineIds];
  if (ids.some(id => typeof id !== "string" || !uuid.test(id)) || new Set(ids).size !== ids.length) {
    return { status: "error", recovery: "edit", message: "Refresh these options and choose the ones you want to purchase." };
  }
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { status: "error", recovery: "check", message: "Sign in again before completing these purchases." };
    const { data, error } = await db.rpc("complete_preview_purchase_options", {
      p_slug: request.slug, p_purchase_ids: request.purchaseIds, p_decline_ids: request.declineIds,
      p_expected_total: request.totalCents, p_request_id: request.requestId,
    });
    if (error?.code === "P0001" && error.message === "Add demo funds before completing these options.") {
      return { status: "error", recovery: "balance", message: "Your wallet does not have enough funds for these purchases. No purchases or declines were made." };
    }
    if (error && ((error.code === "P0001" && ["Purchase selection changed. Refresh your options.", "Purchase total changed. Refresh your options."].includes(error.message))
      || (error.code === "42501" && error.message === "Purchase option unavailable"))) {
      return { status: "error", recovery: "offers", message: "These offers changed or are no longer available. Refresh available offers, or view your completed purchases. No new purchases or declines were made." };
    }
    if (error || data?.status !== "purchased" || data.purchasedCount !== request.purchaseIds.length || data.declinedCount !== request.declineIds.length || data.totalCents !== request.totalCents) {
      return { status: "error", recovery: "check", message: "We couldn’t confirm the result. Check your purchases before trying again; they may already be saved." };
    }
    return completedPurchase(request.slug, data);
  } catch {
    return { status: "error", recovery: "check", message: "The connection was interrupted. Check your purchases before trying again; they may already be saved." };
  }
}

function completedPurchase(slug: string, data: { purchasedCount: number; declinedCount: number; totalCents: number; rewardIds?: unknown }): CompletedCheckout {
  const rewardIds = Array.isArray(data.rewardIds)
    ? [...new Set(data.rewardIds.filter((id): id is string => typeof id === "string" && uuid.test(id)))] : [];
  const href = rewardIds[0] ? purchasedRewardHref(rewardIds[0], slug) : "/account/entries?filter=completed";
  return { status: "succeeded", purchasedCount: data.purchasedCount, declinedCount: data.declinedCount, totalCents: data.totalCents, href, cardReady: rewardIds.length > 0, rewardIds };
}

export async function checkDemoPurchaseReceipt(requestId: string, slug: string): Promise<BulkPurchaseResult | { status: "not_found" }> {
  const unavailable = { status: "error", recovery: "check", message: "We couldn’t verify this purchase yet. Check again." } as const;
  if (!isPreviewDataEnvironment() || !uuid.test(requestId) || !/^[a-z0-9-]{1,120}$/.test(slug)) return unavailable;
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return unavailable;
    const { data, error } = await db.rpc("read_preview_checkout_receipt", { p_request_id: requestId, p_slug: slug });
    if (error) return unavailable;
    if (data === null) return { status: "not_found" };
    if (data.status !== "purchased" || !Number.isSafeInteger(data.purchasedCount) || data.purchasedCount < 1 || !Number.isSafeInteger(data.declinedCount) || !Number.isSafeInteger(data.totalCents) || data.totalCents < 0) return unavailable;
    return completedPurchase(slug, data);
  } catch { return unavailable; }
}
