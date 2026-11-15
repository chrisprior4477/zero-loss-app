"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";

export type DemoActivityRevision = { entries: string; transactions: string };
type Preview = { status: "ready"; entryCount: number; balanceCents: number; revision?: DemoActivityRevision } | { status: "error"; message: string };
type Result = { status: "succeeded"; clearedCount: number; clearedCents: number } | { status: "error"; message: string; stale?: boolean };

async function authorizedDemoAccount() {
  if (!isPreviewDataEnvironment()) throw new Error("Demo activity reset is unavailable here.");
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user?.email_confirmed_at) throw new Error("Sign in to your confirmed demo account.");
  const { data, error } = await db.rpc("get_wallet_snapshot");
  if (error) throw new Error("Your demo wallet is temporarily unavailable.");
  const wallet = parseWalletSnapshot(data);
  if (wallet.scope !== "demo" || !wallet.fundingAvailable || !wallet.walletAccountId) {
    throw new Error("Demo activity reset is unavailable for this account.");
  }
  return { db, balanceCents: wallet.balanceCents };
}

export async function previewAllDemoActivityReset(): Promise<Preview> {
  try {
    const { db, balanceCents } = await authorizedDemoAccount();
    const [entries, deposits, transactions] = await Promise.all([
      db.rpc("get_demo_entry_reset_preview"),
      db.rpc("get_demo_funding_requests"),
      db.rpc("get_demo_transaction_clear_preview"),
    ]);
    if (entries.error || deposits.error || !Array.isArray(deposits.data)) {
      throw new Error("Demo activity could not be checked. Try again later.");
    }
    if (entries.data?.pending === true) throw new Error("Wait for your pending entry countdown to finish, then try again.");
    if (deposits.data.some(request => request?.reconciliation !== "reconciled")) {
      throw new Error("Finish or check pending demo deposits before resetting activity.");
    }
    const entryCount = Number(entries.data?.entryCount);
    if (!Number.isSafeInteger(entryCount) || entryCount < 0) throw new Error("Your demo entry count could not be verified.");
    if (transactions.error || !/^[0-9a-f]{64}$/.test(entries.data?.revision ?? "")
      || !/^[0-9a-f]{64}$/.test(transactions.data?.revision ?? "") || Number(transactions.data?.balanceCents) !== balanceCents) {
      throw new Error("Demo activity could not be verified. Open a fresh review before resetting.");
    }
    return { status: "ready", entryCount, balanceCents, revision: { entries: entries.data.revision, transactions: transactions.data.revision } };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to check demo activity." };
  }
}

export async function resetAllDemoActivity(expectedEntryCount: number, expectedBalanceCents: number, requestKey: string, revision?: DemoActivityRevision): Promise<Result> {
  if (!Number.isSafeInteger(expectedEntryCount) || expectedEntryCount < 0
    || !Number.isSafeInteger(expectedBalanceCents) || expectedBalanceCents < 0
    || !/^[A-Za-z0-9_-]{16,108}$/.test(requestKey)) {
    return { status: "error", message: "Invalid reset request. Please try again." };
  }
  try {
    const { db } = await authorizedDemoAccount();
    const { data, error } = await db.rpc("reset_reviewed_demo_activity", {
      p_expected_entry_count: expectedEntryCount,
      p_expected_balance_cents: expectedBalanceCents,
      p_request_key: requestKey,
      p_entry_revision: revision?.entries ?? null,
      p_transaction_revision: revision?.transactions ?? null,
    });
    if (error?.code === "PT409") return { status: "error", message: error.message, stale: true };
    if (error) return { status: "error", message: error.code === "P0001" || error.code === "P0002"
      ? error.message : "Demo activity could not be reset. Nothing was changed; refresh and try again." };
    const clearedCount = Number(data?.clearedCount);
    const clearedCents = Number(data?.clearedCents);
    if (!Number.isSafeInteger(clearedCount) || clearedCount < 0 || !Number.isSafeInteger(clearedCents) || clearedCents < 0) {
      return { status: "error", message: "The reset result could not be verified. Refresh your account." };
    }
    revalidatePath("/", "layout");
    return { status: "succeeded", clearedCount, clearedCents };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Demo activity could not be reset." };
  }
}
