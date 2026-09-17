import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_CARD_TOKEN, parseDemoCard, type DemoCard } from "./demo-card";

export type DemoFundingRequest = {
  id: string; amount: number; currency: "USD"; status: string; created_at: string;
  reconciliation: "not_processed" | "credit_pending" | "reconciled" | "discrepancy";
};

export class FundingFailure extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}

/** Replace this adapter for an external provider. No client-computed balances.
 * Each RPC is its own transaction: a lost response can leave a durable provider
 * payment awaiting credit. Verification and posting are atomic inside PostgreSQL.
 */
export class DemoPaymentProvider {
  constructor(private readonly db: SupabaseClient) {}

  async createFundingSession(amountCents: number, key: string, makeDefault: boolean | null): Promise<string> {
    const { data, error } = makeDefault === null
      ? await this.db.rpc("resume_demo_funding_session", { p_amount: amountCents, p_idempotency_key: key })
      : await this.db.rpc("create_demo_card_funding_session", { p_amount: amountCents, p_idempotency_key: key,
        p_payment_method: DEMO_CARD_TOKEN, p_make_default: makeDefault });
    if (error) throw new FundingFailure(error.code, error.message);
    if (!data || typeof data.id !== "string") throw new Error("Unconfirmed funding request");
    return data.id;
  }

  async getPaymentMethod(): Promise<DemoCard | null> {
    const { data, error } = await this.db.rpc("get_demo_payment_method");
    if (error) throw new FundingFailure(error.code, error.message);
    return parseDemoCard(data);
  }

  async finishFunding(sessionId: string): Promise<void> {
    // Owner-scoped RPC reuses the one durable receipt, even after a timeout.
    const { data: receipt, error: providerError } = await this.db.rpc("simulate_demo_payment", { p_session_id: sessionId });
    if (providerError) throw new FundingFailure(providerError.code, providerError.message);
    if (typeof receipt?.body !== "string" || typeof receipt?.signature !== "string") throw new Error("Unconfirmed provider response");
    const { data, error } = await this.db.rpc("accept_demo_payment_event", { p_body: receipt.body, p_signature: receipt.signature });
    if (error) throw new FundingFailure(error.code, error.message);
    if (data?.status !== "succeeded" || data?.sessionId !== sessionId) throw new Error("Unconfirmed ledger posting");
  }

  async getRequests(): Promise<DemoFundingRequest[]> {
    const { data, error } = await this.db.rpc("get_demo_funding_requests");
    if (error) throw new FundingFailure(error.code, error.message);
    if (!Array.isArray(data) || data.some(row => !row || typeof row.id !== "string" || !Number.isSafeInteger(row.amount)
      || row.amount < 100 || row.amount > 50000 || row.currency !== "USD" || typeof row.created_at !== "string"
      || !["not_processed", "credit_pending", "reconciled", "discrepancy"].includes(row.reconciliation))) {
      throw new Error("Invalid funding request list");
    }
    return data;
  }
}
