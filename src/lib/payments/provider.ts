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

export function isFundingAmount(amountCents: number): boolean {
  // Preserve exact integer cents supported by the existing ledger/RPC storage.
  // This is a representation boundary, not a demo deposit or account quota.
  return Number.isSafeInteger(amountCents) && amountCents >= 100 && amountCents <= 2_147_483_647;
}

export function assertFundingAmount(amountCents: number): void {
  if (!isFundingAmount(amountCents)) {
    throw new Error("Enter an amount of at least $1 in whole cents that can be represented safely.");
  }
}

export function assertIdempotencyKey(value: string): void {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(value)) {
    throw new Error("Invalid idempotency key.");
  }
}
