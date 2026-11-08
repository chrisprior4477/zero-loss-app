"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { previewAllDemoActivityReset, resetAllDemoActivity } from "@/lib/account/demo-activity-reset-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./reset-all-demo-activity-button.module.css";

type Preview = { entryCount: number; balanceCents: number };

export function ResetAllDemoActivityButton() {
  const router = useRouter();
  const notifications = useNotifications();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const requestKey = useRef<string | null>(null);

  useEffect(() => {
    if (preview && !dialog.current?.open) dialog.current?.showModal();
  }, [preview]);

  function close() {
    dialog.current?.close();
    setPreview(null);
    requestKey.current = null;
    setUncertain(false);
  }

  function open() {
    setNotice("");
    startTransition(async () => {
      try {
        const result = await previewAllDemoActivityReset();
        if (result.status === "error") { setNotice(result.message); return; }
        requestKey.current = crypto.randomUUID();
        setPreview({ entryCount: result.entryCount, balanceCents: result.balanceCents });
      } catch { setNotice("We couldn’t check your demo activity. Check your connection and try again. No reset was requested."); }
    });
  }

  function confirm() {
    if (!preview || !requestKey.current || uncertain) return;
    startTransition(async () => {
      try {
        const result = await resetAllDemoActivity(preview.entryCount, preview.balanceCents, requestKey.current!);
        if (result.status === "error") { setNotice(result.message); setUncertain(true); return; }
        notifications?.clearAfterDemoReset();
        close();
        setNotice("Demo activity and notifications reset. Your account and sign-in are unchanged.");
        router.refresh();
      } catch {
        setUncertain(true);
        setNotice("The connection was interrupted. Your reset may already be saved. Check your demo activity before trying again.");
      }
    });
  }

  function checkActivity() {
    startTransition(async () => {
      try {
        const result = await previewAllDemoActivityReset();
        if (result.status === "error") { setNotice(result.message); return; }
        close();
        setNotice(`Your current demo activity has ${result.entryCount} ${result.entryCount === 1 ? "entry" : "entries"} and ${formatUsdFromCents(result.balanceCents)} in playable funds. No additional reset was requested. Review your account before resetting again.`);
        router.refresh();
      } catch { setNotice("We still couldn’t check your demo activity. Reconnect and check again; no additional reset was requested."); }
    });
  }

  return <>
    <button type="button" className={styles.trigger} onClick={open} disabled={pending}>
      {pending && !preview ? "Checking demo activity…" : "Reset All Demo Activity"}
    </button>
    {notice && !preview ? <p role="status" className={styles.notice}>{notice}</p> : null}
    {preview && typeof document !== "undefined" ? createPortal(
      <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} onCancel={event => { event.preventDefault(); if (!pending) close(); }}
        aria-labelledby="reset-all-demo-title" aria-describedby="reset-all-demo-description">
        <h2 id="reset-all-demo-title">Reset all demo activity?</h2>
        <p id="reset-all-demo-description">This clears your <strong>{preview.entryCount} current demo {preview.entryCount === 1 ? "entry" : "entries"}</strong>, including demo wins, purchase options and orders. Your notifications will reset to zero. Your transaction and payment-deposit lists will look empty, and your <strong>{formatUsdFromCents(preview.balanceCents)}</strong> playable balance will become $0.</p>
        <p className={styles.caution}>Only this signed-in demo account is affected. Your login, profile and account settings stay. Original financial records remain safely in the back-end audit history. This cannot be undone from the normal account view.</p>
        {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} disabled={pending} onClick={close}>{uncertain ? "Close" : "Keep my demo activity"}</button>
          {uncertain ? <button type="button" className={styles.confirm} disabled={pending} onClick={checkActivity}>{pending ? "Checking…" : "Check demo activity"}</button>
            : <button type="button" className={styles.confirm} disabled={pending} onClick={confirm}>{pending ? "Resetting…" : "Reset All Demo Activity"}</button>}
        </div>
      </dialog>, document.body) : null}
  </>;
}
