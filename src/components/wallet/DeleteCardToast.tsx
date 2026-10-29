"use client";

import { useEffect, useState } from "react";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import styles from "./wallet-payments.module.css";

export function DeleteCardToast({ busy, message, onUndo, onDelete }: { busy: boolean; message?: string; onUndo: () => void; onDelete: () => void }) {
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
  return <div className={styles.deleteToast} role="status">
    <div className={styles.deleteToastHeader}><div><strong>Are you sure you want to delete this card?</strong><p>Undo keeps your card. No confirmation? We’ll keep it.</p></div><EntryUndoCountdown seconds={seconds} /></div>
    {message ? <p role="alert">{message}</p> : null}
    <div className={styles.deleteToastActions}><button type="button" disabled={busy} onClick={() => { if (Date.now() >= deadline) onUndo(); else onDelete(); }}>{busy ? "Deleting…" : "Yes, delete"}</button><button type="button" disabled={busy} onClick={onUndo}>Undo</button></div>
  </div>;
}
