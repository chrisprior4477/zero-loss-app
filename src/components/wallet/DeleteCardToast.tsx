"use client";

import { useEffect, useId, useState } from "react";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { FundingNoticeDialog } from "./FundingNoticeDialog";
import styles from "./wallet-payments.module.css";

export function DeleteCardToast({ busy, message, onUndo, onDelete, mobileCard }: {
  busy: boolean; message?: string; onUndo: () => void; onDelete: () => void;
  mobileCard?: string;
}) {
  const description = useId();
  const [deadline] = useState(() => Date.now() + 30_000);
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    if (busy) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) onUndo();
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, busy, onUndo]);
  const content = <>
    <div className={styles.deleteToastHeader}>
      <div id={description}>
        <strong>Are you sure you want to delete this card?</strong>
        {mobileCard && <p>{mobileCard}</p>}
        <p>Undo keeps your card. No confirmation? We’ll keep it.</p>
      </div>
      <EntryUndoCountdown seconds={seconds} />
    </div>
    {message ? <p role="alert">{message}</p> : null}
    <div className={styles.deleteToastActions}><button type="button" disabled={busy} onClick={() => { if (Date.now() >= deadline) onUndo(); else onDelete(); }}>{busy ? "Deleting…" : "Yes, delete"}</button><button type="button" disabled={busy} onClick={onUndo}>Undo</button></div>
  </>;
  if (mobileCard) return <FundingNoticeDialog label="Delete saved card" description={description}
    closeLabel="Keep saved card" onClose={onUndo} tone="delete" busy={busy}>
    <div className={styles.deleteDialogContent}>{content}</div>
  </FundingNoticeDialog>;
  return <div className={styles.deleteToast} role="status">{content}</div>;
}
