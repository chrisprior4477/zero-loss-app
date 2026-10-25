"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { clearDemoWalletHistory, previewDemoHistoryClear, type DemoHistoryKind } from "@/lib/wallet/demo-history-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./demo-history-clear-button.module.css";

export function DemoHistoryClearButton({ kind }: { kind: DemoHistoryKind }) {
  const router = useRouter();
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const requestKey = useRef<string | null>(null);
  const label = kind === "transactions" ? "Clear All Demo Transactions" : "Delete All Demo Deposits";

  useEffect(() => {
    if (balanceCents !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [balanceCents]);

  function close() {
    dialog.current?.close();
    setBalanceCents(null);
    requestKey.current = null;
  }

  function open() {
    setNotice("");
    startTransition(async () => {
      try {
        const preview = await previewDemoHistoryClear(kind);
        if (preview.status === "error") { setNotice(preview.message); return; }
        requestKey.current = crypto.randomUUID();
        setBalanceCents(preview.balanceCents);
      } catch { setNotice("Unable to check demo history. Refresh and try again."); }
    });
  }

  function confirm() {
    if (balanceCents === null || !requestKey.current) return;
    startTransition(async () => {
      try {
        const result = await clearDemoWalletHistory(kind, balanceCents, requestKey.current!);
        if (result.status === "error") { setNotice(result.message); return; }
        close();
        setNotice(kind === "transactions"
          ? `${result.hiddenCount} demo transactions cleared from this view. Your balance and audit records remain.`
          : `${result.hiddenCount} demo deposits cleared from this view. ${formatUsdFromCents(result.clearedCents)} in playable funds reset; audit records remain.`);
        router.refresh();
      } catch { setNotice("The reset could not be confirmed. Refresh your wallet before trying again."); }
    });
  }

  return <>
    <div className={styles.control} data-kind={kind}>
      <button type="button" className={styles.trigger} onClick={open} disabled={pending}>
        {pending && balanceCents === null ? "Checking demo history…" : label}
      </button>
      {notice && balanceCents === null ? <p role="status" className={styles.notice}>{notice}</p> : null}
    </div>
    {balanceCents !== null && typeof document !== "undefined" ? createPortal(
      <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} onCancel={event => { event.preventDefault(); if (!pending) close(); }}
        aria-labelledby={`demo-${kind}-clear-title`} aria-describedby={`demo-${kind}-clear-description`}>
        <h2 id={`demo-${kind}-clear-title`}>{label}?</h2>
        <p id={`demo-${kind}-clear-description`}>{kind === "transactions"
          ? "This clears the current demo transaction list from the wallet display. It does not change your balance or payment deposits."
          : <>This clears the demo deposit list from the wallet display and resets your current <strong>{formatUsdFromCents(balanceCents)}</strong> playable balance to $0. Clear demo transactions separately to empty that list too.</>}</p>
        <p className={styles.caution}>Nothing is physically deleted. Entries, rewards, and the financial audit trail remain available; you can reopen archived demo history below each list.</p>
        {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} disabled={pending} onClick={close}>Cancel</button>
          <button type="button" className={styles.confirm} disabled={pending} onClick={confirm}>{pending ? "Clearing…" : label}</button>
        </div>
      </dialog>, document.body) : null}
  </>;
}
