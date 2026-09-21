"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PurchaseOptionActionState =
  | { status: "idle" }
  | { status: "succeeded"; message: string }
  | { status: "error"; message: string };

export type RewardClaimActionState = PurchaseOptionActionState | { status: "verification_required"; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function declinePurchaseOption(
  _previous: PurchaseOptionActionState,
  formData: FormData,
): Promise<PurchaseOptionActionState> {
  const optionId = String(formData.get("completionOptionId") ?? "");
  if (!uuidPattern.test(optionId)) return { status: "error", message: "This purchase option is invalid." };

  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { status: "error", message: "Your session expired. Sign in again before changing this option." };

  const { error } = await db.rpc("decline_purchase_option", {
    p_completion_option_id: optionId,
    p_idempotency_key: `decline_${optionId.replaceAll("-", "")}`,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "P0001" ? error.message : "This purchase option could not be declined. Refresh and try again.",
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/account/entries");
  revalidatePath("/account/notifications");
  return { status: "succeeded", message: "Purchase option declined. Its reminders have been stopped and the original entry was not refunded." };
}

export async function purchaseGiftCard(
  _previous: PurchaseOptionActionState,
  formData: FormData,
): Promise<PurchaseOptionActionState> {
  const optionId = String(formData.get("completionOptionId") ?? "");
  if (!uuidPattern.test(optionId)) return { status: "error", message: "This purchase option is invalid." };

  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { status: "error", message: "Your session expired. Sign in again before completing this option." };

  const { error } = await db.rpc("purchase_preview_gift_card", {
    p_option_id: optionId,
    p_idempotency_key: `checkout_${optionId.replaceAll("-", "")}`,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "P0001" ? error.message : "This purchase option could not be completed. Refresh and try again.",
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/account/entries");
  revalidatePath("/account/wallet");
  revalidatePath("/account/orders");
  revalidatePath("/account/notifications");
  return { status: "succeeded", message: "Purchase complete. Your retailer gift card is ready in Gift Cards & Rewards." };
}

export async function setPurchaseOptionEmailPreference(
  _previous: PurchaseOptionActionState,
  formData: FormData,
): Promise<PurchaseOptionActionState> {
  const enabled = formData.get("enabled") === "true";
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { status: "error", message: "Your session expired. Sign in again before changing reminders." };
  const { error } = await db.rpc("set_purchase_option_email_enabled", { p_enabled: enabled });
  if (error) return { status: "error", message: "Your reminder preference could not be saved." };
  revalidatePath("/account/notifications");
  return { status: "succeeded", message: enabled ? "Purchase-option email reminders are on." : "Purchase-option email reminders are off. Your options remain available until they expire." };
}

export async function claimReward(
  _previous: RewardClaimActionState,
  formData: FormData,
): Promise<RewardClaimActionState> {
  const rewardId = String(formData.get("rewardId") ?? "");
  if (!uuidPattern.test(rewardId)) return { status: "error", message: "This reward is invalid." };
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { status: "error", message: "Your session expired. Sign in again before claiming this reward." };
  const { error } = await db.rpc("claim_preview_reward", {
    p_reward_id: rewardId,
    p_idempotency_key: `claim_${rewardId.replaceAll("-", "")}`,
  });
  if (error?.code === "P0001" && error.details === "identity_verification_required") return { status: "verification_required", message: "Complete the demo identity check to claim your prize." };
  if (error) return { status: "error", message: error.code === "P0001" ? error.message : "Your reward could not be claimed. Refresh and try again." };
  revalidatePath("/", "layout");
  revalidatePath("/account/wallet");
  return { status: "succeeded", message: "Reward claimed. Its retailer gift card is now ready to open." };
}
