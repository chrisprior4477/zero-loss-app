"use client";

import { useEffect, useState, useTransition } from "react";
import { setDeclinedOfferEmailReminder } from "@/lib/account/lifecycle-actions";
import styles from "./my-activity.module.css";

const dayMs = 24 * 60 * 60 * 1000;

export function DeclinedOfferDeadline({ optionId, expiresAt, initialReminderStatus, canRequestReminder }: {
  optionId: string;
  expiresAt: string | null;
  initialReminderStatus: string | null;
  canRequestReminder: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [status, setStatus] = useState(initialReminderStatus);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const deadline = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const remaining = now === null || !Number.isFinite(deadline) ? null : deadline - now;
  const days = remaining === null ? null : Math.max(0, Math.ceil(remaining / dayMs) - 1);
  const isExpired = remaining !== null && remaining <= 0;
  const tooLateToSchedule = remaining !== null && remaining <= 2 * dayMs;
  const label = days === null ? "Checking deadline…" : isExpired ? "Offer expired"
    : days === 0 ? "Less than 1 day left" : `${days} ${days === 1 ? "day" : "days"} left`;
  const canChange = canRequestReminder && !pending && !isExpired && status !== "sent" && status !== "processing"
    && (status === "pending" || !tooLateToSchedule);
  const checked = status === "pending" || status === "sent" || status === "processing";
  return <div className={styles.declinedTiming}>
    <p className={styles.declinedCountdown}><strong>{label}</strong>{!isExpired && days !== null ? " until this offer expires" : null}</p>
    <label className={styles.declinedReminder}>
      <input type="checkbox" checked={checked} disabled={!canChange} onChange={event => {
        const enabled = event.target.checked;
        setMessage("");
        startTransition(async () => {
          const result = await setDeclinedOfferEmailReminder(optionId, enabled);
          if (result.status !== "error") setStatus(result.status);
          setMessage(result.message);
        });
      }} />
      <span>Please remind me by email two days before this offer expires.</span>
    </label>
    {status === "sent" ? <small>Two-day reminder sent.</small>
      : status === "processing" ? <small>Reminder is being sent.</small>
      : status === "failed" ? <small>We couldn’t send this reminder.</small>
      : !canRequestReminder ? <small>Email reminders are unavailable for this account right now.</small>
      : tooLateToSchedule && !checked ? <small>Too close to the deadline for a two-day reminder.</small> : null}
    {message ? <small role="status">{message}</small> : null}
  </div>;
}
