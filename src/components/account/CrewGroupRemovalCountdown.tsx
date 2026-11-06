"use client";

import { useEffect, useRef, useState } from "react";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import styles from "./crew-group-removal-countdown.module.css";

export function CrewGroupRemovalCountdown({ name, busy, onUndo, onConfirm }: {
  name: string; busy: boolean; onUndo: () => void; onConfirm: () => void;
}) {
  const [deadline] = useState(() => Date.now() + 30_000);
  const [seconds, setSeconds] = useState(30);
  const submitting = useRef(false);
  const undoButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    undoButton.current?.focus({ preventScroll: true });
    undoButton.current?.closest("section")?.scrollIntoView?.({ block: "nearest" });
  }, []);
  useEffect(() => { if (!busy) submitting.current = false; }, [busy]);
  useEffect(() => {
    if (busy) return;
    const timer = window.setInterval(() => {
      if (submitting.current) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(left);
      if (!left) { window.clearInterval(timer); onUndo(); }
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, busy, onUndo]);

  return <section className={styles.confirmation} aria-label="Confirm group removal" aria-busy={busy}>
    <div className={styles.header}><div><strong>Remove “{name}”?</strong><p>Removes this group and its saved contact list. Your Crew connections and other groups stay.</p></div><EntryUndoCountdown seconds={seconds} compact /></div>
    <p>Undo keeps this group. Time runs out? We’ll keep it.</p>
    <div className={styles.actions}>
      <button ref={undoButton} type="button" className={styles.undo} disabled={busy} onClick={onUndo}>Undo</button>
      <button type="button" className={styles.confirm} disabled={busy} onClick={() => {
        if (submitting.current) return;
        if (Date.now() >= deadline) { onUndo(); return; }
        submitting.current = true;
        onConfirm();
      }}>{busy ? "Removing…" : "Confirm removal"}</button>
    </div>
  </section>;
}
