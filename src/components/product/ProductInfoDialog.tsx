"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import styles from "./product-entry-layout.module.css";
import popupStyles from "@/components/layout/responsive-popup.module.css";
import { useDialogBack } from "@/components/account/useDialogBack";

/** Keep complete product information one tap away without expanding the entry card. */
export function ProductInfoDialog({ title, label, children, className = "", triggerLabel, variant = "default" }: {
  title: string; label: ReactNode; children: ReactNode; className?: string; triggerLabel?: string; variant?: "default" | "ticket";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  function openInfo() {
    const element = dialog.current;
    if (!element || element.open) return;
    element.showModal();
    setOpen(true);
    close.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const restore = () => {
      const saved = history.state?.zeroLossProductInfoReturn;
      if (!saved || saved.page !== location.pathname + location.search || saved.title !== title) return;
      const element = dialog.current;
      if (!element) return;
      if (!element.open) element.showModal();
      setOpen(true);
      requestAnimationFrame(() => {
        const link = Array.from(element.querySelectorAll<HTMLAnchorElement>("a[href]")).find(item => item.getAttribute("href") === saved.link);
        link?.focus();
      });
    };
    restore();
    window.addEventListener("pageshow", restore);
    window.addEventListener("popstate", restore);
    return () => { window.removeEventListener("pageshow", restore); window.removeEventListener("popstate", restore); };
  }, [title]);
  const endDialogHistory = useDialogBack(open, () => {
    dialog.current?.close();
    // Native close can be delivered after Forward has already reopened the dialog.
    flushSync(() => setOpen(false));
  }, false, false, false, id, openInfo);
  useLayoutEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, [open]);
  return <>
    <button ref={trigger} type="button" className={className} aria-label={triggerLabel} aria-haspopup="dialog" aria-expanded={open} onClick={openInfo}>{label}</button>
    <dialog ref={dialog} aria-labelledby={id} className={`${popupStyles.dialog} ${styles.infoDialog} ${variant === "ticket" ? styles.ticketInfoDialog : ""}`} onClose={event => {
      if (event.currentTarget.open) return;
      const state = { ...history.state };
      const restored = state.zeroLossProductInfoReturn?.title === title;
      if (restored) {
        delete state.zeroLossProductInfoReturn;
        history.replaceState(state, "");
      }
      endDialogHistory(restored);
      setOpen(false); trigger.current?.focus({ preventScroll: true });
    }} onClick={event => {
      if (event.target === event.currentTarget) { dialog.current?.close(); return; }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.origin !== location.origin) return;
      history.replaceState({ ...history.state, zeroLossProductInfoReturn: { title, link: link.getAttribute("href"), page: location.pathname + location.search } }, "");
    }}>
      <div className={variant === "ticket" ? styles.infoTicket : undefined}>
        <button ref={close} type="button" aria-label={`Close ${title.toLowerCase()}`} className={styles.dialogClose} onClick={() => dialog.current?.close()}>×</button>
        <h2 id={id} className={styles.infoHeading}>{title}</h2>
        <div className={styles.infoBody} tabIndex={variant === "ticket" ? 0 : undefined}>{children}</div>
      </div>
    </dialog>
  </>;
}
