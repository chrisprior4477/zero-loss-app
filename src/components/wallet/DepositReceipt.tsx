import Link from "next/link";
import type { ReactNode } from "react";
import { fundedProductEntryHref } from "@/lib/entries/return-intent";
import type { FundingContinuation } from "@/lib/wallet/funding-navigation";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./wallet-overview.module.css";
import paymentStyles from "./wallet-payments.module.css";

export function DepositReceipt({ amount, date, status, tone, children }: {
  amount?: number; date?: ReactNode; status: string; tone: "checking" | "ready" | "review"; children?: ReactNode;
}) {
  return <div className={styles.depositReceipt} data-tone={tone}>
    <div className={styles.depositReceiptDetails} role={tone === "review" ? "alert" : "status"}>
      <div>
        {amount !== undefined && <strong>{formatUsdFromCents(amount)} deposit</strong>}
        {date}
      </div>
      <p>{status}</p>
    </div>
    {children}
  </div>;
}

export function ContinueAfterDeposit({ destination }: { destination: FundingContinuation }) {
  return <Link href={fundedProductEntryHref(destination.href)} className={paymentStyles.confirm}>
    {destination.label === "Back to purchase option" || destination.href.startsWith("/account/purchase-options/") ? "Return to purchase review" : "Return to entry review"}
  </Link>;
}
