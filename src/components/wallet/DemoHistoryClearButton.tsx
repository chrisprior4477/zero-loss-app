"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useDialogBack } from "@/components/account/useDialogBack";
import { checkDemoHistoryReset, clearDemoWalletHistory, previewDemoHistoryClear, type DemoHistoryKind } from "@/lib/wallet/demo-history-actions";
import { restoreDialogTrigger } from "@/components/account/dialog-keyboard";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { readWalletReset, saveWalletReset } from "@/lib/wallet/reset-recovery";
import styles from "./demo-history-clear-button.module.css";

export function DemoHistoryClearButton({ kind, walletId }: { kind: DemoHistoryKind; walletId?: string }) {
  const router = useRouter();
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [checkingReset, setCheckingReset] = useState(false);
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const revision = useRef<string | undefined>(undefined);
  const requestKey = useRef<string | null>(null);
  const storageKey = `zero-loss:wallet-reset:${walletId ?? "demo"}:${kind}`;
  const label = kind === "transactions" ? "Clear All Demo Transactions" : "Delete All Demo Deposits";
  useDialogBack(balanceCents !== null, close, pending, true, false, `clear-demo-${kind}`, open);

  useEffect(() => {
    if (!pending && balanceCents !== null && !dialog.current?.open) dialog.current?.showModal();
    if (balanceCents === null && !pending && restoreFocus.current) {
      restoreFocus.current = false;
      if (document.activeElement === document.body || document.activeElement === trigger.current) restoreDialogTrigger(trigger.current, true);
    }
  }, [balanceCents, pending]);

  function close() {
    restoreFocus.current = true;
    dialog.current?.close();
    setBalanceCents(null);
    setCheckingReset(false);
    if (!checkingReset) requestKey.current = null;
  }

  useEffect(() => {
    if (balanceCents === null || pending || checkingReset) return;
    const origin = window.location.href;
    const leaveHistory = () => {
      if (window.location.href === origin) return;
      dialog.current?.close();
      setBalanceCents(null);
      requestKey.current = null;
    };
    window.addEventListener("popstate", leaveHistory);
    window.addEventListener("hashchange", leaveHistory);
    return () => {
      window.removeEventListener("popstate", leaveHistory);
      window.removeEventListener("hashchange", leaveHistory);
    };
  }, [balanceCents, checkingReset, pending]);

  function open() {
    const origin = window.location.href;
    setNotice("");
    const pendingReset = requestKey.current ?? readWalletReset(storageKey);
    if (pendingReset) {
      requestKey.current = pendingReset;
      setCheckingReset(true);
      setBalanceCents(0);
      return;
    }
    startTransition(async () => {
      try {
        const preview = await previewDemoHistoryClear(kind);
        if (window.location.href !== origin) return;
        if (preview.status === "error") { restoreFocus.current = true; setNotice(preview.message); return; }
        requestKey.current = crypto.randomUUID();
        revision.current = preview.revision;
        setBalanceCents(preview.balanceCents);
      } catch {
        if (window.location.href !== origin) return;
        restoreFocus.current = true;
        setNotice("Unable to check demo history. Reconnect and try again.");
      }
    });
  }

  function confirm() {
    if (balanceCents === null || !requestKey.current) return;
    if (!checkingReset) saveWalletReset(storageKey, requestKey.current);
    startTransition(async () => {
      try {
        const result = checkingReset ? await checkDemoHistoryReset(kind, requestKey.current!)
          : await clearDemoWalletHistory(kind, balanceCents, requestKey.current!, revision.current);
        if (result.status === "not_found") {
          saveWalletReset(storageKey, null);
          requestKey.current = null;
          close();
          setNotice("No completed reset was found. Review the current wallet before starting another reset.");
          return;
        }
        if (result.status === "error") {
          if (!result.uncertain && !checkingReset) { saveWalletReset(storageKey, null); if (result.stale) close(); }
          if (result.uncertain) setCheckingReset(true);
          setNotice(result.message);
          return;
        }
        saveWalletReset(storageKey, null);
        requestKey.current = null;
        close();
        setNotice(kind === "transactions"
          ? `${result.hiddenCount} demo transactions cleared from this view. Your balance and audit records remain.`
          : `${result.hiddenCount} demo deposits cleared from this view. ${formatUsdFromCents(result.clearedCents)} in playable funds reset; audit records remain.`);
        router.refresh();
      } catch {
        setCheckingReset(true);
        setNotice("We couldn’t confirm the reset. Check its status before trying again.");
      }
    });
  }

  return <>
    <div className={styles.control} data-kind={kind}>
      <button type="button" ref={trigger} className={styles.trigger} onClick={open} disabled={pending}>
        {pending && balanceCents === null ? "Checking demo history…" : label}
      </button>
      {notice && balanceCents === null ? <p role="status" className={styles.notice}>{notice}</p> : null}
    </div>
    {balanceCents !== null && typeof document !== "undefined" ? createPortal(
      <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} onCancel={event => { event.preventDefault(); if (!pending) close(); }}
        aria-labelledby={`demo-${kind}-clear-title`} aria-describedby={`demo-${kind}-clear-description`}>
        <h2 id={`demo-${kind}-clear-title`}>{label}?</h2>
        <p id={`demo-${kind}-clear-description`}>{checkingReset ? "Check whether your previous reset completed." : kind === "transactions"
          ? "This clears the current demo transaction list from the wallet display. It does not change your balance or payment deposits."
          : <>This clears the demo deposit list from the wallet display and resets your current <strong>{formatUsdFromCents(balanceCents)}</strong> playable balance to $0. Clear demo transactions separately to empty that list too.</>}</p>
        <p className={styles.caution}>Nothing is physically deleted. Entries, rewards, and the financial audit trail remain available; you can reopen archived demo history below each list.</p>
        {notice ? <p role="alert" className={styles.error}>{notice}</p> : null}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} disabled={pending} onClick={close}>{checkingReset ? "Close" : "Cancel"}</button>
          <button type="button" className={styles.confirm} disabled={pending} onClick={confirm}>{checkingReset ? pending ? "Checking…" : "Check reset status" : pending ? "Clearing…" : label}</button>
        </div>
      </dialog>, document.body) : null}
  </>;
}
