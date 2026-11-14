"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./whole-dollar-toast.module.css";

export function WholeDollarToast({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const description = useId();
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

  return createPortal(<dialog ref={dialog} className={styles.warning} aria-label="Whole-dollar deposit notice" aria-describedby={description}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.toast}>
      <button ref={closeButton} type="button" className={styles.close} onClick={onClose} aria-label="Close whole-dollar notice">×</button>
      <div id={description}><h2>Only whole dollar amounts are accepted for deposits.</h2>
        <p>Choose an amount like $25 or $50, without cents. Your amount won’t be rounded or changed.</p></div>
      <button type="button" className={styles.save} onClick={onSave}>I understand and save</button>
    </div>
  </dialog>, document.body);
}
