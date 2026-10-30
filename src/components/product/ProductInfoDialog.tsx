"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import styles from "./product-entry-layout.module.css";
import popupStyles from "@/components/layout/responsive-popup.module.css";

/** Keep complete product information one tap away without expanding the entry card. */
export function ProductInfoDialog({ title, label, children, className = "" }: {
  title: string; label: ReactNode; children: ReactNode; className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  return <>
    <button ref={trigger} type="button" className={className} aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      dialog.current?.showModal(); setOpen(true); close.current?.focus({ preventScroll: true });
    }}>{label}</button>
    <dialog ref={dialog} aria-labelledby={id} className={`${popupStyles.dialog} ${styles.infoDialog}`} onClose={() => {
      setOpen(false); trigger.current?.focus({ preventScroll: true });
    }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button ref={close} type="button" aria-label={`Close ${title.toLowerCase()}`} className={styles.dialogClose} onClick={() => dialog.current?.close()}>×</button>
      <h2 id={id}>{title}</h2>
      <div className={styles.infoBody}>{children}</div>
    </dialog>
  </>;
}
