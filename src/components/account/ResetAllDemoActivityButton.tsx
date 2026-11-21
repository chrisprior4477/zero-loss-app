"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { checkOwnDemoActivityReset, previewAllDemoActivityReset, resetAllDemoActivity, type DemoActivityRevision } from "@/lib/account/demo-activity-reset-actions";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./reset-all-demo-activity-button.module.css";
import { useDialogBack } from "./useDialogBack";

type Preview = { entryCount: number; balanceCents: number; revision?: DemoActivityRevision };

export function ResetAllDemoActivityButton({ ownerId }: { ownerId?: string } = {}) {
  const router = useRouter();
  const notifications = useNotifications();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const requestKey = useRef<string | null>(null);
  const storageKey = ownerId ? `zero-loss-demo-reset:${ownerId}` : null;
  const [savedResetPending, setSavedResetPending] = useState(false);
  useDialogBack(Boolean(preview), close, pending, true, true, "reset-demo-activity", () => { if (!savedResetPending) open(); });

  useEffect(() => {
    if (!storageKey) return;
    const frame = requestAnimationFrame(() => {
      try {
        const key = sessionStorage.getItem(storageKey);
        if (key && /^[A-Za-z0-9_-]{16,108}$/.test(key)) {
          requestKey.current = key;
          setSavedResetPending(true);
        }
      } catch { /* The open review can still check its own request. */ }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey]);

  useEffect(() => {
    if (preview && !dialog.current?.open) dialog.current?.showModal();
  }, [preview]);

  function clearRecovery() {
    requestKey.current = null;
    setSavedResetPending(false);
    if (storageKey) try { sessionStorage.removeItem(storageKey); } catch { /* Recovery is cleared in memory. */ }
  }
  function close() {
    dialog.current?.close();
    setPreview(null);
    if (!savedResetPending) requestKey.current = null;
    setUncertain(false);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }

  function open() {
    setNotice("");
    startTransition(async () => {
      try {
        const result = await previewAllDemoActivityReset();
        if (result.status === "error") { setNotice(result.message); return; }
        requestKey.current = crypto.randomUUID();
        setPreview(result);
      } catch { setNotice("We couldn’t check your demo activity. Check your connection and try again. No reset was requested."); }
    });
  }

  function confirm() {
    const key = requestKey.current;
    if (!preview || !key || uncertain) return;
    setSavedResetPending(true);
    if (storageKey) try { sessionStorage.setItem(storageKey, key); } catch { /* Check is still available in this view. */ }
    startTransition(async () => {
      try {
        const result = await resetAllDemoActivity(preview.entryCount, preview.balanceCents, key, preview.revision);
        if (result.status === "error" && result.stale) { clearRecovery(); close(); setNotice(result.message); return; }
        if (result.status === "error") { setNotice(result.message); setUncertain(true); return; }
        notifications?.clearAfterDemoReset();
        clearRecovery();
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
    const key = requestKey.current;
    if (!key) return;
    startTransition(async () => {
      try {
        const result = await checkOwnDemoActivityReset(key);
        if (result.status === "error") { setNotice(result.message); return; }
        clearRecovery();
        close();
        const summary = result.receipt
          ? `This reset cleared ${result.receipt.clearedCount} demo ${result.receipt.clearedCount === 1 ? "entry" : "entries"} and ${formatUsdFromCents(result.receipt.clearedCents)} in playable funds.`
          : "No saved receipt was found for this reset.";
        const current = result.current
          ? ` Your current demo activity has ${result.current.entryCount} ${result.current.entryCount === 1 ? "entry" : "entries"} and ${formatUsdFromCents(result.current.balanceCents)} in playable funds.`
          : "";
        setNotice(summary + current);
        router.refresh();
      } catch { setNotice("We still couldn’t check your demo activity. Reconnect and check again; no additional reset was requested."); }
    });
  }

  return <>
    <button ref={trigger} type="button" className={styles.trigger} onClick={savedResetPending ? checkActivity : open} disabled={pending}>
      {pending && !preview ? "Checking demo activity…" : savedResetPending && !preview ? "Check saved demo reset" : "Reset All Demo Activity"}
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
