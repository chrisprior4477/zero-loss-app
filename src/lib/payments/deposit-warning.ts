import type { DemoFundingRequest } from "./demo-provider";
import { formatUsdFromCents } from "@/lib/wallet/money";

export type CheckoutDeposit = Pick<DemoFundingRequest, "idempotencyKey" | "amount" | "reconciliation">;

export function depositWarning(amount: number, status: Exclude<CheckoutDeposit["reconciliation"], "reconciled">): string {
  const dollars = formatUsdFromCents(amount);
  switch (status) {
    case "credit_pending":
      return `We received your ${dollars} payment, but it hasn’t been added to your wallet yet.`;
    case "not_processed":
      return `We saved your ${dollars} deposit request, but couldn’t confirm the payment. Check its status before adding more funds.`;
    case "discrepancy":
      return `We couldn’t match this ${dollars} deposit to your wallet. Check its status before adding more funds.`;
  }
}
