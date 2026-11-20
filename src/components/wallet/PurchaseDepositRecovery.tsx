"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import type { FundingContinuation } from "@/lib/wallet/funding-navigation";
import { purchaseDepositKeyPattern, purchaseOptionReturnPath } from "@/lib/wallet/funding-navigation";
import { depositSupportHref } from "@/lib/support/references";
import { formatUsdFromCents as usd } from "@/lib/wallet/money";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { DepositRecovery } from "./DepositRecovery";
import { DepositCreditedToast } from "./DepositCreditedToast";
import { ContinueAfterDeposit, DepositReceipt } from "./DepositReceipt";
import { DepositCreditLink, DepositReceiptDate } from "./WeeklyDeposits";
import styles from "./wallet-overview.module.css";
import paymentStyles from "./wallet-payments.module.css";

/** Select only from the server's owner-scoped receipts, including older receipts. */
export function PurchaseDepositRecovery({ requestKey, requests, wallet, continueTo, fundingEnabled, timeZone, fromDeposits = false, restoreLedgerView = false }: {
  requestKey: string; requests: DemoFundingRequest[] | null; wallet: WalletSnapshot | null;
  continueTo?: FundingContinuation; fundingEnabled: boolean; timeZone?: string; fromDeposits?: boolean; restoreLedgerView?: boolean;
}) {
  const router = useRouter();
  const [checking, startChecking] = useTransition();
  const [verified, setVerified] = useState<{ amount: number; balance: number; previousWallet: WalletSnapshot | null } | null>(null);
  const request = requests?.find(request => request.idempotencyKey === requestKey);
  const fromCheckout = purchaseOptionReturnPath(continueTo?.href) !== null;
  const isPurchase = fromCheckout || purchaseDepositKeyPattern.test(requestKey);
  const continuation = isPurchase && !fromCheckout ? undefined : continueTo;
  const supportHref = depositSupportHref(requestKey, fromCheckout ? continueTo?.href : undefined, fromDeposits, continueTo?.entryDepositReturn);
  const date = request && <DepositReceiptDate request={request} timeZone={timeZone} />;
  const credited = request?.reconciliation === "reconciled" && wallet
    ? { amount: request.amount, balance: wallet.balanceCents }
    : verified && request?.reconciliation !== "discrepancy"
      ? { amount: verified.amount, balance: wallet && wallet !== verified.previousWallet ? wallet.balanceCents : verified.balance }
      : null;
  return <section id="purchase-deposit" className={`${styles.ticketPanel} ${styles.purchaseDeposit}`}
    data-landing-align={fromCheckout ? "center" : undefined} aria-labelledby="purchase-deposit-heading">
    <AccountSettingsLandingScroll target="purchase-deposit" focusTarget="purchase-deposit-heading" initialTarget={fromCheckout ? "purchase-deposit" : undefined}
      visitKey={fromCheckout ? `${requestKey}:${credited ? "credited" : "check"}` : requestKey} allScreens settleAfterNavigation />
    {verified && !fromCheckout && <DepositCreditedToast amount={verified.amount} />}
    <div className={paymentStyles.editor}>
      <h2 id="purchase-deposit-heading" tabIndex={-1}>{isPurchase ? "Your purchase deposit" : "Your deposit"}</h2>
      {continuation && <p>{continuation.title}</p>}
      {credited ? <DepositReceipt amount={credited.amount} date={date} tone="ready"
        status={`Deposit credited to your wallet. ${wallet ? "Current balance" : "Last verified balance"}: ${usd(credited.balance)}.${fromCheckout ? " Confirm your purchase separately." : ""}`}>
        {request && <DepositCreditLink request={request} restoreLedgerView={restoreLedgerView} fromDeposits={fromDeposits} />}
        {continuation ? <ContinueAfterDeposit destination={continuation} />
          : !fromDeposits && <Link href="/account/wallet?view=history&panel=transactions#transactions" className={paymentStyles.secondary}>View wallet history</Link>}
      </DepositReceipt> : request?.reconciliation === "discrepancy" ? <DepositReceipt amount={request.amount} date={date} tone="review"
        status="This deposit needs review. Contact Support before adding more funds.">
        <Link href={supportHref} className={paymentStyles.secondary}>Contact Support</Link>
      </DepositReceipt> : request && wallet?.walletAccountId ? <DepositRecovery readOnly={!fundingEnabled} key={request.id} requestKey={requestKey} walletId={wallet.walletAccountId} amount={request.amount}
        date={date} initialStatus={request.reconciliation === "reconciled" ? undefined : request.reconciliation} embedded fromCheckout={fromCheckout} supportHref={supportHref}
        onCredit={(amount, balance) => { setVerified({ amount, balance, previousWallet: wallet }); router.refresh(); }} /> : <DepositReceipt amount={request?.amount} date={date} tone="checking"
        status={requests === null || !wallet ? "We couldn’t load this deposit’s status. Check your connection and try again."
          : !request ? "We couldn’t find this deposit in your account yet. Check again before adding more funds."
            : "This deposit is not confirmed yet. Check its status before adding more funds."}>
        <button type="button" className={paymentStyles.primary} disabled={checking} onClick={() => startChecking(() => router.refresh())}>{checking ? "Checking…" : "Check this deposit"}</button>
        <Link href={supportHref} className={paymentStyles.secondary}>Contact Support about this deposit</Link>
      </DepositReceipt>}
      {fromDeposits && <Link href={`/account/wallet?view=history&panel=deposits&depositRow=${encodeURIComponent(requestKey)}#payment-deposits`} className={paymentStyles.secondary}>Back to Payment deposits</Link>}
    </div>
  </section>;
}
