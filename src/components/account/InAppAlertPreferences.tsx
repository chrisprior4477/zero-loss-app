"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { setInAppAlertPreference } from "@/lib/account/notification-preference-actions";
import type { NotificationPreferenceKey, NotificationPreferences } from "@/lib/account/notifications";
import styles from "./notifications.module.css";

const choices: readonly { key: NotificationPreferenceKey; label: string; description: string }[] = [
  { key: "purchase_options", label: "Purchase options", description: "New choices, declined offers, and available deadlines." },
  { key: "reward_ready", label: "Rewards ready", description: "A winning or purchased reward is ready to view." },
  { key: "reward_deadline", label: "Reward claim deadlines", description: "A reward claim is due within seven days." },
  { key: "order_updates", label: "Orders and fulfillment", description: "Payment, issuance, and order-status changes." },
  { key: "wallet_updates", label: "Wallet activity", description: "Funds, purchases, refunds, and adjustments." },
  { key: "crew_updates", label: "Your Crew", description: "Requests to join and shared activity." },
  { key: "support_replies", label: "Support replies", description: "Updates to your support conversations." },
  { key: "pool_progress", label: "Open entries and pools", description: "Your active entries and pool progress." },
];

export function InAppAlertPreferences({ initialPreferences, onSaved, supportEnabled = true }: { supportEnabled?: boolean; initialPreferences: NotificationPreferences | null; onSaved: (key: NotificationPreferenceKey, enabled: boolean) => void }) {
  const [pendingChoice, setPendingChoice] = useState<{ key: NotificationPreferenceKey; enabled: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [saving, startTransition] = useTransition();
  const [failedChoice, setFailedChoice] = useState<NotificationPreferenceKey | null>(null);
  const errorId = useId();
  const changedControl = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!saving && failedChoice && document.activeElement === document.body) changedControl.current?.focus();
  }, [saving, failedChoice]);

  function change(key: NotificationPreferenceKey, control: HTMLInputElement) {
    const enabled = control.checked;
    changedControl.current = control;
    setFailedChoice(null);
    setPendingChoice({ key, enabled });
    setMessage("");
    startTransition(async () => {
      try {
        const result = await setInAppAlertPreference(key, enabled);
        if (result.ok) onSaved(key, enabled);
        else setFailedChoice(key);
        setMessage(result.message);
      } catch {
        setFailedChoice(key);
        setMessage("We couldn’t confirm your alert choice. Please try again.");
      } finally {
        setPendingChoice(null);
      }
    });
  }

  return <section className={styles.preferenceSection} aria-labelledby="in-app-alert-heading">
    <h2 id="in-app-alert-heading">In-app alert choices</h2>
    <p>Choose which optional updates appear here. Your records remain in their account sections. Account and security notices stay on.</p>
    <div className={styles.preferenceGrid}>
      {choices.filter(choice => supportEnabled || choice.key !== "support_replies").map(choice => <label key={choice.key} className={styles.preferenceChoice}>
        <span><strong>{choice.label}</strong><small>{choice.description}</small></span>
        <input type="checkbox" checked={pendingChoice?.key === choice.key ? pendingChoice.enabled : initialPreferences?.[choice.key] !== false} onChange={event => change(choice.key, event.currentTarget)} aria-describedby={failedChoice === choice.key ? errorId : undefined} disabled={initialPreferences === null || saving} aria-label={`${choice.label} in-app alerts`} />
      </label>)}
    </div>
    {initialPreferences === null ? <p role="status">Alert settings are temporarily unavailable; all verified updates remain visible.</p> : null}
    {message ? <p id={errorId} role={failedChoice ? "alert" : "status"} data-saving={pendingChoice !== null}>{message}</p> : null}
  </section>;
}
