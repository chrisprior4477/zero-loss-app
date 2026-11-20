"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { checkDemoDeposit, reconcileDemoFunding, type DepositCheck } from "@/lib/payments/actions";
import { depositWarning } from "@/lib/payments/deposit-warning";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { depositSupportHref } from "@/lib/support/references";
import { revealWalletSection } from "./WalletCardEditor";
import { DepositReceipt } from "./DepositReceipt";
import styles from "./wallet-payments.module.css";

const messages = {
  unavailable: "We couldn’t reach your deposit record. Check your connection and try again.",
  missing: "Your wallet has no record of this deposit yet. You can check again or review the same deposit.",
  discrepancy: "The payment and wallet records need review. Contact Support before making another deposit.",
  not_processed: "Your deposit request was saved. You can finish it using the original request.",
  credit_pending: "Your payment was received. Finish this deposit to post the credit to your wallet.",
};

export function DepositRecovery({ requestKey, walletId, amount, date, initialStatus, embedded = false, fromCheckout = false, readOnly = false, supportHref, onCredit, onReview, onBack }: {
  requestKey: string; walletId: string; amount: number; date?: ReactNode; initialStatus?: "not_processed" | "credit_pending" | "discrepancy"; embedded?: boolean; fromCheckout?: boolean; readOnly?: boolean; supportHref?: string;
  onCredit: (amount: number, balance: number) => void; onReview?: () => void; onBack?: () => void;
}) {
  const sectionId = onBack ? "funding-deposit-recovery" : "add-funds";
  const title = useRef<HTMLHeadingElement>(null);
  const actionButton = useRef<HTMLButtonElement>(null);
  const supportLink = useRef<HTMLAnchorElement>(null);
  const controls = useRef<HTMLFormElement>(null);
  const restoreAction = useRef(false);
  type RecoveryResult = { check: DepositCheck; finishFailed: boolean; initialStatus: typeof initialStatus };
  const [response, action, pending] = useActionState(async (previous: RecoveryResult | null, form: FormData): Promise<RecoveryResult> => {
    let finishFailed = false;
    try {
      if (!readOnly && form.get("intent") === "finish" && previous?.initialStatus === initialStatus && previous && "sessionId" in previous.check) {
        const data = new FormData();
        data.set("sessionId", previous.check.sessionId);
        try {
          const result = await reconcileDemoFunding({ status: "idle" }, data);
          finishFailed = result?.status !== "succeeded";
        } catch { finishFailed = true; }
      }
      const checked = await checkDemoDeposit(requestKey, amount, walletId);
      if (checked.status === "credited") onCredit(checked.amount, checked.balanceCents);
      return { check: checked, finishFailed, initialStatus };
    } catch { return { check: { status: "unavailable" }, finishFailed, initialStatus }; }
  }, null);
  const result = response?.initialStatus === initialStatus ? response?.check : undefined;

  useEffect(() => {
    if (embedded) return;
    title.current?.focus({ preventScroll: true });
    revealWalletSection(sectionId);
  }, [embedded, sectionId]);
  useEffect(() => {
    if (!pending && result && result.status !== "credited" && restoreAction.current) {
      restoreAction.current = false;
      if (document.activeElement !== document.body && !controls.current?.contains(document.activeElement)) return;
      const next = result.status === "discrepancy" ? supportLink.current : actionButton.current;
      next?.focus({ preventScroll: true });
    }
  }, [pending, result]);

  const status = result?.status ?? initialStatus;
  const checkoutWarning = fromCheckout && (status === "credit_pending" || status === "not_processed")
    ? depositWarning(amount, status) : undefined;
  const finishFailed = result && response?.finishFailed && result.status !== "credited";
  const card = <DepositReceipt amount={amount} date={date}
    status={pending ? "Checking this deposit…" : status === "credited" ? "Deposit credited to your wallet."
      : finishFailed ? "We couldn’t finish this deposit. Check this same request again before adding more funds."
        : status === "missing" && !onReview ? "We couldn’t find this deposit in your account yet. Check again before adding more funds."
        : readOnly && (status === "not_processed" || status === "credit_pending") ? "This deposit is still pending. Contact Support for help with this request."
          : status ? checkoutWarning ?? messages[status] : "We lost the confirmation. Check whether this deposit reached your wallet."}
    tone={status === "discrepancy" ? "review" : status === "credited" ? "ready" : "checking"}>
    <form ref={controls} action={action} onSubmit={() => {
      restoreAction.current = Boolean(document.activeElement === document.body || controls.current?.contains(document.activeElement));
    }} className={styles.actions}>
      {pending ? <button className={styles.primary} disabled>Checking…</button>
        : status === "discrepancy" ? <a ref={supportLink} className={styles.secondary} href={supportHref ?? depositSupportHref(requestKey)}>Contact Support</a>
        : status === "missing" && onReview ? <button ref={actionButton} type="button" className={styles.secondary} onClick={onReview}>Review same deposit</button>
        : !readOnly && result && "sessionId" in result && !finishFailed ? <button ref={actionButton} className={styles.confirm} name="intent" value="finish">Finish this deposit</button>
        : <button ref={actionButton} className={styles.primary} name="intent" value="check">Check this deposit</button>}
    </form>
    {readOnly && status !== "credited" && status !== "discrepancy" ? <a className={styles.secondary} href={supportHref ?? depositSupportHref(requestKey)}>Contact Support about this deposit</a> : null}
    {onBack && <button type="button" className={styles.secondary} onClick={onBack} disabled={pending}>Back to Add funds</button>}
  </DepositReceipt>;
  if (embedded) return card;
  return <section id={sectionId} className={styles.editor} aria-labelledby="deposit-recovery-heading">
    <h3 ref={title} tabIndex={-1} id="deposit-recovery-heading">Check your {formatUsdFromCents(amount)} deposit</h3>
    {card}
  </section>;
}
