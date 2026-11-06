"use client";

import { useActionState, useEffect, useRef } from "react";
import { checkDemoDeposit, reconcileDemoFunding, type DepositCheck } from "@/lib/payments/actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { revealWalletSection } from "./WalletCardEditor";
import styles from "./wallet-payments.module.css";

const messages = {
  unavailable: "We couldn’t reach your deposit record. Check your connection and try again.",
  missing: "Your wallet has no record of this deposit yet. You can check again or review the same deposit.",
  discrepancy: "The payment and wallet records need review. Contact Support before making another deposit.",
  not_processed: "Your deposit request was saved. You can finish it using the original request.",
  credit_pending: "Your payment was received. Finish this deposit to post the credit to your wallet.",
};

export function DepositRecovery({ requestKey, walletId, amount, onCredit, onReview }: {
  requestKey: string; walletId: string; amount: number; onCredit: (amount: number, balance: number) => void; onReview: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  const [result, action, pending] = useActionState(async (previous: DepositCheck | null, form: FormData): Promise<DepositCheck> => {
    try {
      if (form.get("intent") === "finish" && previous && "sessionId" in previous) {
        const data = new FormData();
        data.set("sessionId", previous.sessionId);
        await reconcileDemoFunding({ status: "idle" }, data);
      }
      const checked = await checkDemoDeposit(requestKey, amount, walletId);
      if (checked.status === "credited") onCredit(checked.amount, checked.balanceCents);
      return checked;
    } catch { return { status: "unavailable" }; }
  }, null);

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    revealWalletSection("add-funds");
  }, []);

  return <section id="add-funds" className={styles.editor} aria-labelledby="deposit-recovery-heading">
    <h3 ref={title} tabIndex={-1} id="deposit-recovery-heading">Check your {formatUsdFromCents(amount)} deposit</h3>
    <p role="status" className={styles.notice}>{result && result.status !== "credited" ? messages[result.status]
      : "We lost the confirmation. Check whether this deposit reached your wallet."}</p>
    <form action={action} className={styles.actions}>
      <button className={styles.primary} disabled={pending} name="intent" value="check">{pending ? "Checking…" : "Check this deposit"}</button>
      {result && "sessionId" in result ? <button className={styles.confirm} disabled={pending} name="intent" value="finish">Finish this deposit</button> : null}
      {result?.status === "missing" ? <button type="button" className={styles.secondary} disabled={pending} onClick={onReview}>Review same deposit</button> : null}
      {result?.status === "discrepancy" ? <a className={styles.secondary} href="/support">Contact Support</a> : null}
    </form>
  </section>;
}
