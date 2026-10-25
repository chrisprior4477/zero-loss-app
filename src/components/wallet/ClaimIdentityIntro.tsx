"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";

import { useEffect, useRef } from "react";
import styles from "./claim-identity-intro.module.css";

export function ClaimIdentityIntro({ onContinue, onClose, onSkipDemo, busy = false, error }: { onContinue: () => void; onClose: () => void; onSkipDemo?: () => void; busy?: boolean; error?: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const modal = dialog.current;
    if (modal && !modal.open) modal.showModal();
    return () => { if (modal?.open) modal.close(); };
  }, []);

  return <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} aria-labelledby="claim-identity-intro-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.handle} aria-hidden="true" />
    <div className={styles.content}>
      <span className={styles.eyebrow}>BEFORE YOU CLAIM</span>
      <h2 id="claim-identity-intro-title">Before you claim your reward</h2>
      <p className={styles.copy}>Congratulations! Before claiming this reward, we ask you to complete an identity check. This helps protect your account and keeps prize records accurate. You never need to pay to claim a prize you won.</p>
      <div className={styles.steps} aria-label="What happens next">
        <strong>What happens next</strong>
        <ol>
          <li>Review the sample identity details.</li>
          <li>Walk through the sample ID and headshot steps.</li>
          <li>Return here to claim your reward.</li>
        </ol>
      </div>
      <p className={styles.demoNote}>In this MVP preview, the check uses only fictional sample details. Do not provide a real ID or turn on your camera. No actual identity verification takes place.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={busy} onClick={onContinue}>Continue to identity check</button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={onSkipDemo ?? onClose}>{busy ? "Opening your demo reward…" : onSkipDemo ? "Skip check & claim demo reward" : "Not now"}</button>
      </div>
      {error ? <p role="alert" className={styles.footnote}>{error}</p> : null}
      <p className={styles.footnote}>{onSkipDemo ? "For this MVP, you can skip the sample check and claim your demo reward. This does not complete a real identity check." : "Follow the next steps to claim your reward. You can come back later if you need to."}</p>
    </div>
  </dialog>;
}
