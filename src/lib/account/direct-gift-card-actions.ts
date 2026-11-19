"use server";

import { revalidatePath } from "next/cache";
import { getDemoProduct } from "@/lib/catalog/demo-products";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/supabase/server";
import { purchasedRewardHref } from "./activity";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function purchaseDirectDemoGiftCard(slug: string, requestId: string, expectedCents: number): Promise<
  { status: "succeeded"; href: string } | { status: "balance" | "error" | "uncertain"; message: string }
> {
  if (!isPreviewDataEnvironment() || !uuid.test(requestId) || expectedCents !== 10_000 || getDemoProduct(slug)?.value !== 100) {
    return { status: "error", message: "This demo gift-card checkout is unavailable." };
  }

  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { status: "error", message: "Sign in again before buying this demo gift card." };
    const { data, error } = await db.rpc("purchase_direct_demo_gift_card", {
      p_slug: slug, p_request_id: requestId, p_expected_cents: expectedCents,
    });
    if (error?.code === "P0001" && error.message === "Add demo funds before buying this gift card.") {
      return { status: "balance", message: "Add demo funds to your Playable Wallet before buying this gift card." };
    }
    if (error?.code === "42501" || error?.code === "22023") {
      return { status: "error", message: "This checkout is unavailable. Refresh this page to check the current offer and wallet." };
    }
    if (!error && data?.status === "purchased" && typeof data.rewardId === "string" && uuid.test(data.rewardId)) {
      revalidatePath("/account/wallet");
      revalidatePath("/account/orders");
      revalidatePath("/account/entries");
      revalidatePath("/account/notifications");
      return { status: "succeeded", href: purchasedRewardHref(data.rewardId, slug) };
    }
  } catch {
    // A transport failure can happen after commit. Retrying the same key is safe.
  }
  return { status: "uncertain", message: "We couldn’t confirm your purchase. Check this same purchase before starting another." };
}
