"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";

type Preview = { status: "ready"; balanceCents: number } | { status: "error"; message: string };
type Result = { status: "succeeded"; clearedCents: number } | { status: "error"; message: string };

async function authorizedDemoWallet() {
  if (!isPreviewDataEnvironment()) throw new Error("Demo balance reset is unavailable here.");
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user?.email_confirmed_at) throw new Error("Sign in to your confirmed demo account.");
  const { data, error } = await db.rpc("get_wallet_snapshot");
  if (error) throw new Error("Your wallet is temporarily unavailable.");
  const wallet = parseWalletSnapshot(data);
  if (wallet.scope !== "demo" || !wallet.fundingAvailable || wallet.walletAccountId === null) {
    throw new Error("Demo balance reset is unavailable for this wallet.");
  }
  return { db, balanceCents: wallet.balanceCents };
}

export async function previewDemoBalanceClear(): Promise<Preview> {
  try {
    const { balanceCents } = await authorizedDemoWallet();
    return { status: "ready", balanceCents };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to check your demo wallet." };
  }
}

export async function clearDemoBalance(expectedBalanceCents: number, requestKey: string): Promise<Result> {
  if (!Number.isSafeInteger(expectedBalanceCents) || expectedBalanceCents < 0 ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)) {
    return { status: "error", message: "Invalid reset request. Please try again." };
  }
  try {
    const { db } = await authorizedDemoWallet();
    const { data, error } = await db.rpc("clear_demo_playable_balance", {
      p_expected_balance_cents: expectedBalanceCents,
      p_request_key: requestKey,
    });
    if (error) {
      return { status: "error", message: error.code === "P0001"
        ? "Your balance changed. Close this window and review the new amount before clearing it."
        : "We couldn’t confirm the reset. Refresh your wallet before trying again." };
    }
    const clearedCents = Number(data?.clearedCents);
    if (!Number.isSafeInteger(clearedCents) || clearedCents < 0) {
      return { status: "error", message: "The reset result could not be verified. Refresh your wallet." };
    }
    revalidatePath("/", "layout");
    return { status: "succeeded", clearedCents };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "The demo balance could not be cleared." };
  }
}
