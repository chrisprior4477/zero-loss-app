"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";

type Preview = { status: "ready"; entryCount: number } | { status: "error"; message: string };
type Result = { status: "succeeded"; clearedCount: number } | { status: "error"; message: string };

async function authorizedDemoAccount() {
  if (!isPreviewDataEnvironment()) throw new Error("Demo entry reset is unavailable here.");
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user?.email_confirmed_at) throw new Error("Sign in to your confirmed demo account.");
  const { data, error } = await db.rpc("get_wallet_snapshot");
  if (error) throw new Error("Your demo wallet is temporarily unavailable.");
  const wallet = parseWalletSnapshot(data);
  if (wallet.scope !== "demo" || !wallet.fundingAvailable || wallet.walletAccountId === null) {
    throw new Error("Demo entry reset is unavailable for this account.");
  }
  return db;
}

export async function previewDemoEntryReset(): Promise<Preview> {
  try {
    const db = await authorizedDemoAccount();
    const { data, error } = await db.rpc("get_demo_entry_reset_preview");
    if (error) throw new Error("Your demo entries could not be checked. Please try again.");
    if (data?.pending === true) return { status: "error", message: "Wait for your pending entry countdown to finish, then try again." };
    const entryCount = Number(data?.entryCount);
    if (!Number.isSafeInteger(entryCount) || entryCount < 0) throw new Error("Your demo entry count could not be verified.");
    return { status: "ready", entryCount };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to check demo entries." };
  }
}

export async function clearOwnDemoEntries(expectedCount: number, requestKey: string): Promise<Result> {
  if (!Number.isSafeInteger(expectedCount) || expectedCount < 1 || !/^[A-Za-z0-9_-]{16,128}$/.test(requestKey)) {
    return { status: "error", message: "Invalid reset request. Please try again." };
  }
  try {
    const db = await authorizedDemoAccount();
    const { data, error } = await db.rpc("clear_own_demo_entries", {
      p_expected_count: expectedCount,
      p_request_key: requestKey,
    });
    if (error) return { status: "error", message: error.code === "P0001"
      ? error.message
      : "Your demo entries could not be cleared. Refresh and try again." };
    const clearedCount = Number(data?.clearedCount);
    if (!Number.isSafeInteger(clearedCount) || clearedCount < 0) {
      return { status: "error", message: "The reset result could not be verified. Refresh My Activity." };
    }
    revalidatePath("/", "layout");
    return { status: "succeeded", clearedCount };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Your demo entries could not be cleared." };
  }
}
