"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { checkDemoDeposit, reconcileDemoFunding, type DepositCheck } from "@/lib/payments/actions";
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

export function DepositRecovery({ requestKey, walletId, amount, date, initialStatus, embedded = false, onCredit, onReview, onBack }: {
  requestKey: string; walletId: string; amount: number; date?: ReactNode; initialStatus?: "not_processed" | "credit_pending" | "discrepancy"; embedded?: boolean;
  onCredit: (amount: number, balance: number) => void; onReview?: () => void; onBack?: () => void;
}) {
  const sectionId = onBack ? "funding-deposit-recovery" : "add-funds";
  const title = useRef<HTMLHeadingElement>(null);
  const actionButton = useRef<HTMLButtonElement>(null);
  const supportLink = useRef<HTMLAnchorElement>(null);
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
    if (embedded) return;
    title.current?.focus({ preventScroll: true });
    revealWalletSection(sectionId);
  }, [embedded, sectionId]);
  useEffect(() => {
    if (!pending && result && result.status !== "credited") {
      const next = result.status === "discrepancy" ? supportLink.current : actionButton.current;
      next?.focus({ preventScroll: true });
    }
  }, [pending, result]);

  const status = result?.status ?? initialStatus;
  const card = <DepositReceipt amount={amount} date={date}
    status={pending ? "Checking this deposit…" : status === "credited" ? "Deposit credited to your wallet."
      : status === "missing" && !onReview ? "We couldn’t find this deposit in your account yet. Check again before adding more funds."
        : status ? messages[status] : "We lost the confirmation. Check whether this deposit reached your wallet."}
    tone={status === "discrepancy" ? "review" : status === "credited" ? "ready" : "checking"}>
    <form action={action} className={styles.actions}>
      {pending ? <button className={styles.primary} disabled>Checking…</button>
        : status === "discrepancy" ? <a ref={supportLink} className={styles.secondary} href={depositSupportHref(requestKey)}>Contact Support</a>
        : status === "missing" && onReview ? <button ref={actionButton} type="button" className={styles.secondary} onClick={onReview}>Review same deposit</button>
        : result && "sessionId" in result ? <button ref={actionButton} className={styles.confirm} name="intent" value="finish">Finish this deposit</button>
        : <button ref={actionButton} className={styles.primary} name="intent" value="check">Check this deposit</button>}
    </form>
    {onBack && <button type="button" className={styles.secondary} onClick={onBack} disabled={pending}>Back to Add funds</button>}
  </DepositReceipt>;
  if (embedded) return card;
  return <section id={sectionId} className={styles.editor} aria-labelledby="deposit-recovery-heading">
    <h3 ref={title} tabIndex={-1} id="deposit-recovery-heading">Check your {formatUsdFromCents(amount)} deposit</h3>
    {card}
  </section>;
}
