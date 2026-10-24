"use server";

import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/supabase/server";

export type BulkPurchaseRequest = { slug: string; purchaseIds: string[]; declineIds: string[]; totalCents: number; requestId: string; confirmed: boolean };
export type BulkPurchaseResult = { status: "succeeded"; purchasedCount: number; declinedCount: number; href: string }
  | { status: "error"; message: string; recovery: "balance" | "check" | "edit" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    if (error && ["P0001", "42501", "22023"].includes(error.code)) {
      return { status: "error", recovery: "check", message: "These options have changed or are no longer available. Refresh and check them before continuing. No new purchases or declines were made." };
    }
    if (error || data?.status !== "purchased" || data.purchasedCount !== request.purchaseIds.length || data.declinedCount !== request.declineIds.length || data.totalCents !== request.totalCents) {
      return { status: "error", recovery: "check", message: "We couldn’t confirm the result. Check your purchases before trying again; they may already be saved." };
    }
    // Navigation reads a fresh account projection. Do not rerender this now-empty
    // options page in the action response before the browser can open the rewards.
    return { status: "succeeded", purchasedCount: data.purchasedCount, declinedCount: data.declinedCount, href: "/account/wallet" };
  } catch {
    return { status: "error", recovery: "check", message: "The connection was interrupted. Check your purchases before trying again; they may already be saved." };
  }
}
