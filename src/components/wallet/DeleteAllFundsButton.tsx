"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { clearDemoBalance, previewDemoBalanceClear } from "@/lib/wallet/demo-balance-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./delete-all-funds-button.module.css";

export function DeleteAllFundsButton({ value }: { value: string }) {
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestKey = useRef<string | null>(null);

  useEffect(() => {
    if (balanceCents !== null && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [balanceCents]);

  function closeDialog() {
    dialogRef.current?.close();
    setBalanceCents(null);
    requestKey.current = null;
  }

  function openConfirmation() {
    setNotice("");
    startTransition(async () => {
      const preview = await previewDemoBalanceClear();
      if (preview.status === "error") { setNotice(preview.message); return; }
      if (preview.balanceCents === 0) { setNotice("Your demo Playable Balance is already $0."); return; }
      requestKey.current = crypto.randomUUID();
      setBalanceCents(preview.balanceCents);
    });
  }

  function confirmClear() {
    if (balanceCents === null || !requestKey.current) return;
    startTransition(async () => {
      const result = await clearDemoBalance(balanceCents, requestKey.current!);
      if (result.status === "error") { setNotice(result.message); return; }
      closeDialog();
      setNotice(`${formatUsdFromCents(result.clearedCents)} in demo funds cleared. Your entries, rewards, and wallet history remain.`);
    });
  }

  return <>
    <div className={styles.control}>
      <button type="button" className={styles.trigger} onClick={openConfirmation} disabled={pending || value === "Unavailable"}>
        {pending && balanceCents === null ? "Checking balance…" : "Delete Funds"}
      </button>
      {notice && balanceCents === null ? <span className={styles.notice} role="status">{notice}</span> : null}
    </div>
    {balanceCents !== null && typeof document !== "undefined" ? createPortal(
      <dialog ref={dialogRef} className={styles.dialog} onCancel={event => { event.preventDefault(); if (!pending) closeDialog(); }} aria-labelledby="demo-balance-clear-title" aria-describedby="demo-balance-clear-description">
        <h2 id="demo-balance-clear-title">Delete demo funds?</h2>
        <p id="demo-balance-clear-description">This will clear <strong>{formatUsdFromCents(balanceCents)}</strong> from your demo Playable Balance. It will not delete your entries, gift cards, rewards, or wallet history. This does not charge or refund a card.</p>
        <p className={styles.caution}>Funds added or returned after this reset will appear in your wallet normally.</p>
        {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={closeDialog} disabled={pending} className={styles.cancel}>Cancel</button>
          <button type="button" onClick={confirmClear} disabled={pending} className={styles.confirm}>{pending ? "Clearing…" : "Clear demo funds"}</button>
        </div>
      </dialog>, document.body) : null}
  </>;
}
