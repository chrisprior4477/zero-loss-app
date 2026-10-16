"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseWalletSnapshot } from "./snapshot";

export type DemoHistoryKind = "transactions" | "deposits";
type Preview = { status: "ready"; balanceCents: number } | { status: "error"; message: string };
type Result = { status: "succeeded"; hiddenCount: number; clearedCents: number } | { status: "error"; message: string };

async function authorizedDemoWallet() {
  if (!isPreviewDataEnvironment()) throw new Error("Demo history reset is unavailable here.");
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user?.email_confirmed_at) throw new Error("Sign in to your confirmed demo account.");
  const { data, error } = await db.rpc("get_wallet_snapshot");
  if (error) throw new Error("Your wallet is temporarily unavailable.");
  const wallet = parseWalletSnapshot(data);
  if (wallet.scope !== "demo" || !wallet.fundingAvailable || !wallet.walletAccountId) {
    throw new Error("Demo history reset is unavailable for this wallet.");
  }
  return { db, balanceCents: wallet.balanceCents };
}

export async function previewDemoHistoryClear(kind: DemoHistoryKind): Promise<Preview> {
  if (kind !== "transactions" && kind !== "deposits") return { status: "error", message: "Invalid reset request." };
  try {
    const { db, balanceCents } = await authorizedDemoWallet();
    if (kind === "deposits") {
      const { data, error } = await db.rpc("get_demo_funding_requests");
      if (error || !Array.isArray(data)) throw new Error("Payment status is unavailable. Try again later.");
      if (data.some(request => request?.reconciliation !== "reconciled")) {
        throw new Error("Finish or check pending demo deposits before clearing this history.");
      }
    }
    return { status: "ready", balanceCents };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to check demo history." };
  }
}

export async function clearDemoWalletHistory(kind: DemoHistoryKind, expectedBalanceCents: number, requestKey: string): Promise<Result> {
  if ((kind !== "transactions" && kind !== "deposits") || !Number.isSafeInteger(expectedBalanceCents)
    || expectedBalanceCents < 0 || !/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)) {
    return { status: "error", message: "Invalid reset request. Please try again." };
  }
  try {
    const { db } = await authorizedDemoWallet();
    const { data, error } = await db.rpc("clear_demo_wallet_history", {
      p_kind: kind, p_expected_balance_cents: expectedBalanceCents, p_request_key: requestKey,
    });
    if (error) return { status: "error", message: error.code === "P0001"
      ? "Your balance changed. Review the new amount before clearing it."
      : error.code === "P0002" ? "Finish or check pending demo deposits before clearing this history."
        : "The reset could not be confirmed. Refresh your wallet before trying again." };
    const hiddenCount = Number(data?.hiddenCount);
    const clearedCents = Number(data?.clearedCents);
    if (!Number.isSafeInteger(hiddenCount) || hiddenCount < 0 || !Number.isSafeInteger(clearedCents) || clearedCents < 0) {
      return { status: "error", message: "The reset result could not be verified. Refresh your wallet." };
    }
    revalidatePath("/", "layout");
    return { status: "succeeded", hiddenCount, clearedCents };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "The demo history could not be cleared." };
  }
}
