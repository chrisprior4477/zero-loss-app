"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import type { FundingContinuation } from "@/lib/wallet/funding-navigation";
import { purchaseDepositKeyPattern } from "@/lib/wallet/funding-navigation";
import { depositSupportHref } from "@/lib/support/references";
import { formatUsdFromCents as usd } from "@/lib/wallet/money";
import { AccountSettingsLandingScroll } from "@/components/account/AccountSettingsLandingScroll";
import { DepositRecovery } from "./DepositRecovery";
import { DepositReceiptDate } from "./WeeklyDeposits";
import styles from "./wallet-overview.module.css";
import paymentStyles from "./wallet-payments.module.css";

/** Select only from the server's owner-scoped receipts, including older receipts. */
export function PurchaseDepositRecovery({ requestKey, requests, wallet, continueTo, fundingEnabled, timeZone }: {
  requestKey: string; requests: DemoFundingRequest[] | null; wallet: WalletSnapshot | null;
  continueTo?: FundingContinuation; fundingEnabled: boolean; timeZone?: string;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState<{ amount: number; balance: number } | null>(null);
  const request = requests?.find(request => request.idempotencyKey === requestKey);
  const isPurchase = purchaseDepositKeyPattern.test(requestKey);
  const supportHref = request ? depositSupportHref(requestKey) : "/support";
  const credited = verified ?? (request?.reconciliation === "reconciled" && wallet
    ? { amount: request.amount, balance: wallet.balanceCents } : null);
  return <section id="purchase-deposit" className={`${styles.ticketPanel} ${styles.purchaseDeposit}`} aria-labelledby="purchase-deposit-heading">
    <AccountSettingsLandingScroll target="purchase-deposit" allScreens settleAfterNavigation />
    <div className={paymentStyles.editor}>
      <h2 id="purchase-deposit-heading">{isPurchase ? "Your purchase deposit" : "Your deposit"}</h2>
      {continueTo && <p>{continueTo.title}</p>}
      {request && <><p><strong>{usd(request.amount)} deposit</strong></p><DepositReceiptDate request={request} timeZone={timeZone} /></>}
      {credited ? <>
        <p role="status" className={paymentStyles.notice}>Your {usd(credited.amount)} deposit is in your wallet. Current balance: {usd(credited.balance)}.{isPurchase ? " Confirm your purchase separately." : ""}</p>
        {continueTo ? <Link href={continueTo.href} className={paymentStyles.confirm}>Return to purchase review</Link>
          : isPurchase ? <Link href="/account/entries?filter=completion" className={paymentStyles.secondary}>View your purchase options</Link>
            : <Link href="/account/wallet?view=history#transactions" className={paymentStyles.secondary}>View wallet history</Link>}
      </> : request?.reconciliation === "discrepancy" ? <>
        <p role="alert" className={paymentStyles.error}>This deposit needs review. Contact Support before adding more funds.</p>
        <Link href={supportHref} className={paymentStyles.secondary}>Contact Support</Link>
      </> : request && wallet?.walletAccountId && fundingEnabled ? <DepositRecovery requestKey={requestKey} walletId={wallet.walletAccountId} amount={request.amount}
        onCredit={(amount, balance) => { setVerified({ amount, balance }); router.refresh(); }} onReview={() => router.refresh()} /> : <>
        <p role="status" className={paymentStyles.notice}>{requests === null || !wallet ? "We couldn’t load this deposit’s status. Check your connection and try again."
          : !request ? "We couldn’t find this deposit in your account yet. Check again before adding more funds."
            : "This deposit is not confirmed yet. Refresh to check its status before adding more funds."}</p>
        <div className={paymentStyles.actions}><button type="button" className={paymentStyles.primary} onClick={() => router.refresh()}>Check again</button><Link href={supportHref} className={paymentStyles.secondary}>Contact Support</Link></div>
      </>}
    </div>
  </section>;
}
