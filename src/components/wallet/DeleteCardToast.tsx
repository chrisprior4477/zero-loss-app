"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDialogBack } from "@/components/account/useDialogBack";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import { FundingNoticeDialog } from "./FundingNoticeDialog";
import styles from "./wallet-payments.module.css";

export function DeleteCardToast({ busy, message, onUndo, onDelete, mobileCard }: {
  busy: boolean; message?: string; onUndo: () => void; onDelete: () => void;
  mobileCard?: string;
}) {
  const description = useId();
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (busy || !message) return;
    const error = notice.current;
    const dialog = error?.closest("dialog");
    if (error && (document.activeElement === document.body || document.activeElement === dialog)) error.focus();
  }, [busy, message]);
  const [deadline, setDeadline] = useState(() => Date.now() + 30_000);
  const [reviewedMessage, setReviewedMessage] = useState<string>();
  const needsReview = Boolean(message && message !== reviewedMessage);
  const [seconds, setSeconds] = useState(30);
  useDialogBack(Boolean(mobileCard), onUndo, busy, true);
  useEffect(() => {
    if (busy || needsReview) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) onUndo();
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, busy, needsReview, onUndo]);
  const content = <>
    <div className={styles.deleteToastHeader}>
      <div id={description}>
        <strong>Are you sure you want to delete this card?</strong>
        {mobileCard && <p>{mobileCard}</p>}
        <p>Undo keeps your card. No confirmation? We’ll keep it.</p>
      </div>
      {!needsReview ? <EntryUndoCountdown seconds={seconds} /> : null}
    </div>
    {message ? <p ref={notice} tabIndex={-1} role="alert">{message}</p> : null}
    <div className={styles.deleteToastActions}>{needsReview ? <button type="button" disabled={busy} onClick={() => {
      setReviewedMessage(message);
      setDeadline(Date.now() + 30_000);
      setSeconds(30);
    }}>Review deletion again</button> : <button type="button" disabled={busy} onClick={() => { if (Date.now() >= deadline) onUndo(); else { setReviewedMessage(undefined); onDelete(); } }}>{busy ? "Deleting…" : "Yes, delete"}</button>}<button type="button" disabled={busy} onClick={onUndo}>Undo</button></div>
  </>;
  if (mobileCard) return <FundingNoticeDialog label="Delete saved card" description={description}
    closeLabel="Keep saved card" onClose={onUndo} tone="delete" busy={busy} revealTrigger>
    <div className={styles.deleteDialogContent}>{content}</div>
  </FundingNoticeDialog>;
  return <div className={styles.deleteToast} role="status">{content}</div>;
}
