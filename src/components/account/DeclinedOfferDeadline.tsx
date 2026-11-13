"use client";

import { useEffect, useState, useTransition } from "react";
import { setDeclinedOfferEmailReminder } from "@/lib/account/lifecycle-actions";
import { declinedOfferHref } from "@/lib/account/activity";
import { useServerPreference } from "./useServerPreference";
import styles from "./my-activity.module.css";

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

function useOfferClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function timeLeft(remaining: number) {
  if (remaining < dayMs) {
    const hours = Math.floor(remaining / hourMs);
    return hours === 0 ? "Less than 1 hour left" : `${hours} ${hours === 1 ? "hour" : "hours"} left`;
  }
  const days = Math.max(1, Math.ceil(remaining / dayMs) - 1);
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

export function DeclinedOfferCountdown({ deadlines }: { deadlines: number[] }) {
  const now = useOfferClock();
  const next = now === null ? undefined : deadlines.find(deadline => deadline > now);
  const label = !deadlines.length ? "Deadline unavailable" : now === null ? "Checking deadline…" : next === undefined
    ? deadlines.length === 1 ? "Offer expired" : "Offers expired"
    : timeLeft(next - now);
  return <p className={styles.declinedCountdown}>
    <strong>{label}</strong>{next !== undefined && deadlines.length > 1 && deadlines[0] !== deadlines.at(-1) ? <span>Next offer expires</span> : null}
  </p>;
}

export function DeclinedOfferReminder({ optionId, expiresAt, initialReminderStatus, canRequestReminder }: {
  optionId: string;
  expiresAt: string | null;
  initialReminderStatus: string | null;
  canRequestReminder: boolean;
}) {
  const now = useOfferClock();
  const preference = useServerPreference(initialReminderStatus);
  const status = preference.value;
  const [message, setMessage] = useState("");
  const [needsCheck, setNeedsCheck] = useState(false);
  const [pending, startTransition] = useTransition();
  const deadline = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const remaining = now === null || !Number.isFinite(deadline) ? null : deadline - now;
  const isExpired = remaining !== null && remaining <= 0;
  const tooLateToSchedule = remaining !== null && remaining <= 2 * dayMs;
  const canChange = canRequestReminder && !pending && !needsCheck && !isExpired && status !== "sent" && status !== "processing"
    && (status === "pending" || !tooLateToSchedule);
  const checked = status === "pending" || status === "sent" || status === "processing";
  return <div className={styles.declinedTiming}>
    <label className={styles.declinedReminder}>
      <input type="checkbox" checked={checked} disabled={!canChange} onChange={event => {
        const enabled = event.target.checked;
        const generation = preference.generation;
        setMessage("");
        startTransition(async () => {
          try {
            const result = await setDeclinedOfferEmailReminder(optionId, enabled);
            if (result.status !== "error") preference.confirm(result.status, generation);
            if (result.needsCheck) setNeedsCheck(true);
            setMessage(result.message);
          } catch {
            setNeedsCheck(true);
            setMessage("We couldn’t confirm your reminder choice. Reload its saved status before trying again.");
          }
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
    {needsCheck ? <a href={declinedOfferHref(optionId)} onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      window.history.replaceState(window.history.state, "", declinedOfferHref(optionId));
      window.location.reload();
    }} className="text-sm font-bold text-[#0069b3] underline">Reload reminder status →</a> : null}
  </div>;
}
