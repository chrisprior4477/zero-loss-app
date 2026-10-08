"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { clearOwnDemoEntries, previewDemoEntryReset } from "@/lib/account/demo-entry-reset-actions";
import styles from "./clear-all-entries-button.module.css";

export function ClearAllEntriesButton() {
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestKey = useRef<string | null>(null);

  useEffect(() => {
    if (entryCount !== null && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [entryCount]);

  function closeDialog() {
    dialogRef.current?.close();
    setEntryCount(null);
    requestKey.current = null;
  }

  function openConfirmation() {
    setNotice("");
    startTransition(async () => {
      const preview = await previewDemoEntryReset();
      if (preview.status === "error") { setNotice(preview.message); return; }
      if (preview.entryCount === 0) { setNotice("There are no current demo entries to clear."); return; }
      requestKey.current = crypto.randomUUID();
      setEntryCount(preview.entryCount);
    });
  }

  function confirmClear() {
    if (entryCount === null || !requestKey.current) return;
    startTransition(async () => {
      const result = await clearOwnDemoEntries(entryCount, requestKey.current!);
      if (result.status === "error") { setNotice(result.message); return; }
      closeDialog();
      setNotice(`${result.clearedCount} demo ${result.clearedCount === 1 ? "entry" : "entries"} cleared from your current activity. Your wallet and transaction history were not changed.`);
    });
  }

  return <>
    <div className={styles.control}>
      <button type="button" className={styles.trigger} onClick={openConfirmation} disabled={pending}>
        {pending && entryCount === null ? "Checking entries…" : "Clear All Entries"}
      </button>
      {notice && entryCount === null ? <span className={styles.notice} role="status">{notice}</span> : null}
    </div>
    {entryCount !== null && typeof document !== "undefined" ? createPortal(
      <dialog ref={dialogRef} className={styles.dialog} onCancel={event => { event.preventDefault(); if (!pending) closeDialog(); }} aria-labelledby="demo-entry-reset-title" aria-describedby="demo-entry-reset-description">
        <h2 id="demo-entry-reset-title">Clear your demo entries?</h2>
        <p id="demo-entry-reset-description">This clears <strong>{entryCount} {entryCount === 1 ? "entry" : "entries"}</strong> from this signed-in account&apos;s current demo activity, including any sample win or purchase option. The TV, sneakers, and baby bundle remain ready for another one-ticket demonstration.</p>
        <p className={styles.caution}>Only this account is affected. Your demo balance and transaction records stay intact, but old sample reward and order cards leave the current views. This does not refund an entry or charge a card. This action cannot be undone.</p>
        {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={closeDialog} disabled={pending} className={styles.cancel}>Keep entries</button>
          <button type="button" onClick={confirmClear} disabled={pending} className={styles.confirm}>{pending ? "Clearing…" : "Clear demo entries"}</button>
        </div>
      </dialog>, document.body) : null}
  </>;
}
