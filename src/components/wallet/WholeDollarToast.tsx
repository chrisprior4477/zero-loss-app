"use client";

import { createPortal } from "react-dom";
import styles from "./whole-dollar-toast.module.css";

export function WholeDollarToast({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return createPortal(<aside className={styles.toast} aria-label="Whole-dollar deposit notice" onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); }
  }}>
    <button type="button" className={styles.close} onClick={onClose} aria-label="Close whole-dollar notice">×</button>
    <div role="status"><h2>Only whole dollar amounts are accepted for deposits.</h2>
      <p>Choose an amount like $25 or $50, without cents. Your amount won’t be rounded or changed.</p></div>
    <button type="button" className={styles.save} onClick={onSave}>I understand and save</button>
  </aside>, document.body);
}
