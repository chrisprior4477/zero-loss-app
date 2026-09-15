/**
 * Payment providers stop at verified funding events. They never calculate a
 * wallet balance and never write entry outcomes; the ledger remains the sole
 * financial authority.
 */
export type FundingStatus =
  | "created"
  | "processing"
  | "succeeded"
  | "declined"
  | "timed_out"
  | "refunded";

export type FundingSession = {
  id: string;
  customerId: string;
  amountCents: number;
  currency: "USD";
  status: FundingStatus;
  provider: string;
};

export type VerifiedFundingEvent = {
  eventId: string;
  sessionId: string;
  customerId: string;
  amountCents: number;
  currency: "USD";
  status: Exclude<FundingStatus, "created" | "processing">;
};

export interface PaymentProvider {
  createFundingSession(input: {
    customerId: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<FundingSession>;
  verifyFundingResult(event: unknown): Promise<VerifiedFundingEvent>;
  handleProviderEvent(event: VerifiedFundingEvent): Promise<void>;
  refundFunding(input: {
    sessionId: string;
    amountCents: number;
    idempotencyKey: string;
  }): Promise<VerifiedFundingEvent>;
  getFundingStatus(sessionId: string): Promise<FundingStatus>;
}

export function assertFundingAmount(amountCents: number): void {
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 50_000) {
    throw new Error("Funding amount must be between $1 and $500 in whole cents.");
  }
}

export function assertIdempotencyKey(value: string): void {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(value)) {
    throw new Error("Invalid idempotency key.");
  }
}
