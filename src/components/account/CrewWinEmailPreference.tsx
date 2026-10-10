"use client";

import { useState, useTransition } from "react";
import { setCrewWinEmailPreference } from "@/lib/crew/actions";
import styles from "./showroom.module.css";

export function CrewWinEmailPreference({ initialEnabled }: { initialEnabled: boolean | null }) {
  const [enabled, setEnabled] = useState(initialEnabled ?? false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await setCrewWinEmailPreference(enabled);
        setError(!result.ok);
        setMessage(result.message);
      } catch {
        setError(true);
        setMessage("We couldn’t confirm this change. Refresh and try again.");
      }
    });
  }
  return <section id="crew-win-email-preference" className={styles.outcomeEmail} data-placement="account" aria-labelledby="crew-win-email-heading">
    <h3 id="crew-win-email-heading">Crew win updates</h3>
    <p>Choose whether to receive an email when an approved Crew member explicitly shares a win with you.</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <label><input type="checkbox" checked={enabled} disabled={initialEnabled === null || pending} onChange={event => setEnabled(event.target.checked)} /> Allow Crew win-update emails</label>
      <button type="button" onClick={save} disabled={initialEnabled === null || pending}>{pending ? "Saving…" : "Save preference"}</button>
    </div>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "This preference is unavailable right now." : "Off by default. Turning it on never shares your own wins; you choose those separately."}</p>
    {message ? <p role="status" className={styles.outcomeEmailStatus} data-status={error ? "error" : "succeeded"}>{message}</p> : null}
  </section>;
}
