"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import styles from "./crew-group-removal-countdown.module.css";

export function CrewGroupRemovalCountdown({ name, busy, retry, onUndo, onConfirm, onCheck }: {
  name: string; busy: boolean; retry?: number; onUndo: () => void; onConfirm: () => void; onCheck?: () => Promise<boolean>;
}) {
  const [deadline, setDeadline] = useState(() => Date.now() + 30_000);
  const [reviewedAttempt, setReviewedAttempt] = useState(retry);
  const needsReview = retry !== reviewedAttempt;
  const [seconds, setSeconds] = useState(30);
  const submitting = useRef(false);
  const undoButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    undoButton.current?.focus({ preventScroll: true });
    undoButton.current?.closest("section")?.scrollIntoView?.({ block: "nearest" });
  }, []);
  useLayoutEffect(() => { if (!busy) submitting.current = false; }, [busy, retry]);
  useEffect(() => {
    if (busy || needsReview) return;
    const timer = window.setInterval(() => {
      if (submitting.current) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left);
      if (!left) { window.clearInterval(timer); onUndo(); }
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, busy, needsReview, onUndo]);

  return <section className={styles.confirmation} aria-label="Confirm group removal" aria-busy={busy}>
    <div className={styles.header}><div><strong>Remove “{name}”?</strong><p>Removes this group and its saved contact list. Your Crew connections and other groups stay.</p></div>{!needsReview ? <EntryUndoCountdown seconds={seconds} compact /> : null}</div>
    <p>{needsReview ? "Check the saved groups before trying again." : "Undo keeps this group. Time runs out? We’ll keep it."}</p>
    <div className={styles.actions}>
      <button ref={undoButton} type="button" className={styles.undo} disabled={busy} onClick={onUndo}>{needsReview ? "Close" : "Undo"}</button>
      {needsReview ? <button type="button" className={styles.confirm} disabled={busy} onClick={async () => {
        if (onCheck && !await onCheck()) return;
        setSeconds(30);
        setDeadline(Date.now() + 30_000);
        setReviewedAttempt(retry);
      }}>Check group status</button> : <button type="button" className={styles.confirm} disabled={busy} onClick={() => {
        if (submitting.current) return;
        if (Date.now() >= deadline) { onUndo(); return; }
        submitting.current = true;
        onConfirm();
      }}>{busy ? "Removing…" : "Confirm removal"}</button>}
    </div>
  </section>;
}
