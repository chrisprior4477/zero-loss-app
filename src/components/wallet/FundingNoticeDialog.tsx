"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./whole-dollar-toast.module.css";

export function FundingNoticeDialog({ label, description, closeLabel, onClose, children, tone, busy = false }: {
  label: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  tone?: "credited" | "delete";
  busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const source = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { style, clientWidth } = document.documentElement;
    const { overflow, scrollbarGutter } = style;
    if (clientWidth < window.innerWidth && clientWidth > 0) style.scrollbarGutter = "stable";
    style.overflow = "hidden";
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      style.overflow = overflow;
      style.scrollbarGutter = scrollbarGutter;
      if (source?.isConnected) source.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog ref={dialog} className={styles.dialog} aria-label={label} aria-describedby={description}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }}>
      <div className={tone ? `${styles.toast} ${styles[tone]}` : styles.toast}>
        <button ref={closeButton} type="button" className={styles.close} onClick={onClose} aria-label={closeLabel} disabled={busy}>×</button>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
