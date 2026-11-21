"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { restoreDialogTrigger } from "@/components/account/dialog-keyboard";
import { useDialogBack } from "@/components/account/useDialogBack";
import { useRouter } from "next/navigation";
import { checkDemoEntryReset, clearOwnDemoEntries, previewDemoEntryReset } from "@/lib/account/demo-entry-reset-actions";
import styles from "./clear-all-entries-button.module.css";

export function ClearAllEntriesButton() {
  const router = useRouter();
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const revision = useRef("");
  const requestKey = useRef<string | null>(null);

  useEffect(() => {
    if (!pending && entryCount !== null && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (entryCount === null && !pending && restoreFocus.current) {
      restoreFocus.current = false;
      restoreDialogTrigger(trigger.current);
    }
  }, [entryCount, pending]);

  useDialogBack(entryCount !== null, closeDialog, pending, true, false, "clear-demo-entries", openConfirmation);

  function closeDialog() {
    restoreFocus.current = true;
    dialogRef.current?.close();
    setEntryCount(null);
    requestKey.current = null;
    setUncertain(false);
  }

  function openConfirmation() {
    setNotice("");
    startTransition(async () => {
      try {
        const preview = await previewDemoEntryReset();
        if (preview.status === "error") { setNotice(preview.message); return; }
        if (preview.entryCount === 0) { setNotice("There are no current demo entries to clear."); return; }
        requestKey.current = crypto.randomUUID();
        revision.current = preview.revision;
        setEntryCount(preview.entryCount);
      } catch { setNotice("We couldn’t check your entries. Check your connection and try again. No reset was requested."); }
    });
  }

  function confirmClear() {
    if (entryCount === null || !requestKey.current || uncertain) return;
    startTransition(async () => {
      try {
        const result = await clearOwnDemoEntries(entryCount, requestKey.current!, revision.current);
        if (result.status === "error") { setNotice(result.message); if (result.stale) closeDialog(); else setUncertain(true); return; }
        closeDialog();
        setNotice(`${result.clearedCount} demo ${result.clearedCount === 1 ? "entry" : "entries"} cleared from your current activity. Your wallet and transaction history were not changed.`);
        router.refresh();
      } catch {
        setUncertain(true);
        setNotice("The connection was interrupted. Your entries may already have been cleared. Check their saved status before trying again.");
      }
    });
  }

  function checkEntries() {
    const key = requestKey.current;
    if (!key) return;
    startTransition(async () => {
      try {
        const receipt = await checkDemoEntryReset(key);
        if (receipt.status === "error") { setNotice(receipt.message); return; }
        closeDialog();
        const status = receipt.clearedCount === null ? "No saved receipt was found for this reset." : `This reset cleared ${receipt.clearedCount} demo ${receipt.clearedCount === 1 ? "entry" : "entries"}.`;
        const current = receipt.currentCount === null ? "" : ` Your account currently has ${receipt.currentCount} demo ${receipt.currentCount === 1 ? "entry" : "entries"}.`;
        setNotice(status + current);
        router.refresh();
      } catch { setNotice("We still couldn’t check your entries. Reconnect and check again; no additional reset was requested."); }
    });
  }

  return <>
    <div className={styles.control}>
      <button type="button" ref={trigger} className={styles.trigger} onClick={openConfirmation} disabled={pending}>
        {pending && entryCount === null ? "Checking entries…" : "Clear All Entries"}
      </button>
      {notice && entryCount === null ? <span className={styles.notice} role="status">{notice}</span> : null}
    </div>
    {entryCount !== null && typeof document !== "undefined" ? createPortal(
      <dialog ref={dialogRef} className={`${styles.dialog} ${popupStyles.dialog}`} onCancel={event => { event.preventDefault(); if (!pending) closeDialog(); }} aria-labelledby="demo-entry-reset-title" aria-describedby="demo-entry-reset-description">
        <h2 id="demo-entry-reset-title">Clear your demo entries?</h2>
        <p id="demo-entry-reset-description">This clears <strong>{entryCount} {entryCount === 1 ? "entry" : "entries"}</strong> from this signed-in account&apos;s current demo activity, including any sample win or purchase option. Their demo slots become available again across the marketplace, including Ending Soon when an offer qualifies.</p>
        <p className={styles.caution}>Only this account is affected. Your demo balance and transaction records stay intact, but old sample reward and order cards leave the current views. This does not refund an entry or charge a card. This action cannot be undone.</p>
        {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={closeDialog} disabled={pending} className={styles.cancel}>{uncertain ? "Close" : "Keep entries"}</button>
          {uncertain ? <button type="button" onClick={checkEntries} disabled={pending} className={styles.confirm}>{pending ? "Checking…" : "Check entry status"}</button>
            : <button type="button" onClick={confirmClear} disabled={pending} className={styles.confirm}>{pending ? "Clearing…" : "Clear demo entries"}</button>}
        </div>
      </dialog>, document.body) : null}
  </>;
}
