"use client";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./crew-shared-picks.module.css";

export function CrewSharingDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    dialog?.showModal();
    const header = document.querySelector("header.sticky");
    const resize = () => {
      const top = Math.max(12, (header?.getBoundingClientRect().height ?? 0) + 8);
      dialog?.style.setProperty("--crew-dialog-top", `${top}px`);
    };
    resize();
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      dialog?.close();
      document.documentElement.style.overflow = overflow;
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  useLayoutEffect(() => {
    // A review replaces the choices in the same dialog. Do not carry the old
    // scroll position or its confirmation-button focus into the new step.
    heading.current?.focus({ preventScroll: true });
    if (ref.current) ref.current.scrollTop = 0;
  }, [title]);
  return createPortal(<dialog ref={ref} className={styles.dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <section className={styles.dialogBody}>
      <div className={styles.dialogTitle}><h2 ref={heading} tabIndex={-1} id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button></div>
      {children}
    </section>
  </dialog>, document.body);
}
