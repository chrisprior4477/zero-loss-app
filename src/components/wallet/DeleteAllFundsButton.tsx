"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { clearDemoBalance, previewDemoBalanceClear } from "@/lib/wallet/demo-balance-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./delete-all-funds-button.module.css";

export function DeleteAllFundsButton({ value }: { value: string }) {
  const router = useRouter();
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [uncertain, setUncertain] = useState(false);
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
    setUncertain(false);
  }

  function openConfirmation() {
    setNotice("");
    startTransition(async () => {
      try {
        const preview = await previewDemoBalanceClear();
        if (preview.status === "error") { setNotice(preview.message); return; }
        if (preview.balanceCents === 0) { setNotice("Your demo Playable Balance is already $0."); return; }
        requestKey.current = crypto.randomUUID();
        setBalanceCents(preview.balanceCents);
      } catch { setNotice("We couldn’t check your balance. Check your connection and try Delete Funds again. No reset was requested."); }
    });
  }

  function confirmClear() {
    if (balanceCents === null || !requestKey.current || uncertain) return;
    startTransition(async () => {
      try {
        const result = await clearDemoBalance(balanceCents, requestKey.current!);
        if (result.status === "error") { setNotice(result.message); setUncertain(true); return; }
        closeDialog();
        setNotice(`${formatUsdFromCents(result.clearedCents)} in demo funds cleared. Your entries, rewards, and wallet history remain.`);
        router.refresh();
      } catch {
        setUncertain(true);
        setNotice("The connection was interrupted. Your reset may already be saved. Check your wallet balance before trying again.");
      }
    });
  }

  function checkBalance() {
    startTransition(async () => {
      try {
        const preview = await previewDemoBalanceClear();
        if (preview.status === "error") { setNotice(preview.message); return; }
        closeDialog();
        setNotice(`Your current demo Playable Balance is ${formatUsdFromCents(preview.balanceCents)}. No additional reset was requested. Review your wallet before clearing funds again.`);
        router.refresh();
      } catch { setNotice("We still couldn’t check your balance. Reconnect and check again; no additional reset was requested."); }
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
      <dialog ref={dialogRef} className={`${styles.dialog} ${popupStyles.dialog}`} onCancel={event => { event.preventDefault(); if (!pending) closeDialog(); }} aria-labelledby="demo-balance-clear-title" aria-describedby="demo-balance-clear-description">
        <h2 id="demo-balance-clear-title">Delete demo funds?</h2>
        <p id="demo-balance-clear-description">This will clear <strong>{formatUsdFromCents(balanceCents)}</strong> from your demo Playable Balance. It will not delete your entries, gift cards, rewards, or wallet history. This does not charge or refund a card.</p>
        <p className={styles.caution}>Funds added or returned after this reset will appear in your wallet normally.</p>
        {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={closeDialog} disabled={pending} className={styles.cancel}>{uncertain ? "Close" : "Cancel"}</button>
          {uncertain ? <button type="button" onClick={checkBalance} disabled={pending} className={styles.confirm}>{pending ? "Checking…" : "Check wallet balance"}</button>
            : <button type="button" onClick={confirmClear} disabled={pending} className={styles.confirm}>{pending ? "Clearing…" : "Clear demo funds"}</button>}
        </div>
      </dialog>, document.body) : null}
  </>;
}
