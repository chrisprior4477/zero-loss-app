"use server";

import { createClient } from "@/lib/supabase/server";
import { assertFundingAmount, assertIdempotencyKey } from "@/lib/payments/provider";
import { revalidatePath } from "next/cache";
import { demoFundingAllowed } from "./demo-access";
import { DemoPaymentProvider, FundingFailure } from "./demo-provider";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";
import { ensurePreviewCustomer } from "@/lib/preview/provisioning";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { DEMO_CARD_TOKEN } from "./demo-card";

export type DemoFundingActionState =
  | { status: "idle" }
  | { status: "succeeded"; message: string }
  | { status: "pending"; message: string }
  | { status: "error"; message: string };

async function fundingProvider() {
  if (!isPreviewDataEnvironment()) throw new FundingFailure("42501", "Simulated funding is unavailable in this environment.");
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user?.email_confirmed_at) throw new FundingFailure("42501", "Sign in with your confirmed test account.");
  await ensurePreviewCustomer(db, user);
  const { data, error: walletError } = await db.rpc("get_wallet_snapshot");
  if (walletError || !demoFundingAllowed(parseWalletSnapshot(data), Boolean(user.email_confirmed_at))) {
    throw new FundingFailure("42501", "Demo funding is not enabled for this account.");
  }
  return new DemoPaymentProvider(db);
}

function failure(error: unknown): DemoFundingActionState {
  // A transport failure is UNKNOWN, never a decline and never proof of no credit.
  if (error instanceof FundingFailure && ["42501", "22023", "P0001"].includes(error.code)) {
    return { status: "error", message: error.code === "P0001" ? error.message : "This demo request is not permitted. Check your account and amount." };
  }
  return { status: "pending", message: "We couldn't confirm the result. Use Finish / check on the existing request below, or retry this same request. Don't start a second payment." };
}

function updateWalletViews() { revalidatePath("/", "layout"); }

export async function completeDemoFunding(
  _previous: DemoFundingActionState,
  formData: FormData,
): Promise<DemoFundingActionState> {
  const amountCents = Number(formData.get("amountCents"));
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const recoveryOnly = formData.get("recoveryOnly") === "true";

  try {
    if (formData.get("currency") !== "USD") throw new Error("Only USD demo funding is supported.");
    assertFundingAmount(amountCents);
    assertIdempotencyKey(idempotencyKey);
    if (!recoveryOnly && (formData.get("paymentMethod") !== DEMO_CARD_TOKEN
      || !["true", "false"].includes(String(formData.get("makeDefault"))))) {
      throw new Error("Choose the supplied test card. Real cards are not accepted.");
    }
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Invalid funding request." };
  }

  let result: DemoFundingActionState;
  try {
    const provider = await fundingProvider();
    const sessionId = await provider.createFundingSession(amountCents, idempotencyKey,
      recoveryOnly ? null : formData.get("makeDefault") === "true");
    await provider.finishFunding(sessionId);
    result = { status: "succeeded", message: "Demo funds added. Your updated balance comes from the database ledger. No real money was charged." };
  } catch (error) { result = failure(error); }
  updateWalletViews();
  return result;
}

export async function reconcileDemoFunding(_previous: DemoFundingActionState, formData: FormData): Promise<DemoFundingActionState> {
  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return { status: "error", message: "Invalid funding request." };
  }
  let result: DemoFundingActionState;
  try {
    await (await fundingProvider()).finishFunding(sessionId);
    result = { status: "succeeded", message: "Payment checked and ledger credit confirmed. Rechecking cannot add another credit." };
  } catch (error) { result = failure(error); }
  updateWalletViews();
  return result;
}
