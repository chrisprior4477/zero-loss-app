"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseWalletSnapshot } from "./snapshot";

export type DemoHistoryKind = "transactions" | "deposits";
type Preview = { status: "ready"; balanceCents: number; revision?: string } | { status: "error"; message: string };
type Result = { status: "succeeded"; hiddenCount: number; clearedCents: number } | { status: "error"; message: string; uncertain?: boolean; stale?: boolean };

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
    if (kind === "transactions") {
      const { data, error } = await db.rpc("get_demo_transaction_clear_preview");
      const balance = Number(data?.balanceCents);
      if (error || !Number.isSafeInteger(balance) || balance < 0 || typeof data?.revision !== "string" || !/^[0-9a-f]{64}$/.test(data.revision)) {
        throw new Error("Your demo transaction list could not be verified.");
      }
      return { status: "ready", balanceCents: balance, revision: data.revision };
    }
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

export async function clearDemoWalletHistory(kind: DemoHistoryKind, expectedBalanceCents: number, requestKey: string, revision?: string): Promise<Result> {
  if ((kind !== "transactions" && kind !== "deposits") || !Number.isSafeInteger(expectedBalanceCents)
    || (kind === "transactions" && !/^[0-9a-f]{64}$/.test(revision ?? "")) || expectedBalanceCents < 0 || !/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)) {
    return { status: "error", message: "Invalid reset request. Please try again." };
  }
  try {
    const { db } = await authorizedDemoWallet();
    const { data, error } = await db.rpc(kind === "transactions" ? "clear_reviewed_demo_transactions" : "clear_reviewed_demo_deposits", {
      p_expected_balance_cents: expectedBalanceCents, p_request_key: requestKey,
      ...(kind === "transactions" ? { p_expected_revision: revision } : {}),
    });
    if (error) return { status: "error", stale: error.code === "40001", uncertain: !["P0001", "P0002", "40001"].includes(error.code), message: error.code === "40001" ? error.message : error.code === "P0001"
      ? "Your balance changed. Review the new amount before clearing it."
      : error.code === "P0002" ? "Finish or check pending demo deposits before clearing this history."
        : "The reset could not be confirmed. Refresh your wallet before trying again." };
    const hiddenCount = Number(data?.hiddenCount);
    const clearedCents = Number(data?.clearedCents);
    if (!Number.isSafeInteger(hiddenCount) || hiddenCount < 0 || !Number.isSafeInteger(clearedCents) || clearedCents < 0) {
      return { status: "error", uncertain: true, message: "The reset result could not be verified." };
    }
    revalidatePath("/", "layout");
    return { status: "succeeded", hiddenCount, clearedCents };
  } catch {
    return { status: "error", uncertain: true, message: "We couldn’t confirm the reset. Check its status before trying again." };
  }
}

export async function checkDemoHistoryReset(kind: DemoHistoryKind, requestKey: string): Promise<Result | { status: "not_found" }> {
  const unavailable = { status: "error", message: "We couldn’t verify the reset. Check again." } as const;
  if (!["transactions", "deposits"].includes(kind) || !/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)) return unavailable;
  try {
    const { db } = await authorizedDemoWallet();
    const { data, error } = await db.rpc("read_demo_wallet_history_reset", { p_kind: kind, p_request_key: requestKey });
    if (error) return unavailable;
    if (data === null) return { status: "not_found" };
    const hiddenCount = Number(data?.hiddenCount);
    const clearedCents = Number(data?.clearedCents);
    if (!Number.isSafeInteger(hiddenCount) || hiddenCount < 0 || !Number.isSafeInteger(clearedCents) || clearedCents < 0) return unavailable;
    revalidatePath("/", "layout");
    return { status: "succeeded", hiddenCount, clearedCents };
  } catch { return unavailable; }
}
