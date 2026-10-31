"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import styles from "./product-entry-layout.module.css";
import popupStyles from "@/components/layout/responsive-popup.module.css";

/** Keep complete product information one tap away without expanding the entry card. */
export function ProductInfoDialog({ title, label, children, className = "", triggerLabel, variant = "default" }: {
  title: string; label: ReactNode; children: ReactNode; className?: string; triggerLabel?: string; variant?: "default" | "ticket";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  return <>
    <button ref={trigger} type="button" className={className} aria-label={triggerLabel} aria-haspopup="dialog" aria-expanded={open} onClick={() => {
      dialog.current?.showModal(); setOpen(true); close.current?.focus({ preventScroll: true });
    }}>{label}</button>
    <dialog ref={dialog} aria-labelledby={id} className={`${popupStyles.dialog} ${styles.infoDialog} ${variant === "ticket" ? styles.ticketInfoDialog : ""}`} onClose={() => {
      setOpen(false); trigger.current?.focus({ preventScroll: true });
    }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={variant === "ticket" ? styles.infoTicket : undefined}>
        <button ref={close} type="button" aria-label={`Close ${title.toLowerCase()}`} className={styles.dialogClose} onClick={() => dialog.current?.close()}>×</button>
        <h2 id={id} className={styles.infoHeading}>{title}</h2>
        <div className={styles.infoBody} tabIndex={variant === "ticket" ? 0 : undefined}>{children}</div>
      </div>
    </dialog>
  </>;
}
