"use client";

import { startTransition, useState } from "react";
import { setCrewWinEmailPreference } from "@/lib/crew/actions";
import { useVerifiedEmailPreference, type EmailSaveResult } from "./useVerifiedEmailPreference";
import styles from "./showroom.module.css";

export function CrewWinEmailPreference({ initialEnabled }: { initialEnabled: boolean | null }) {
  const { preference, feedback, action, pending } = useVerifiedEmailPreference<EmailSaveResult>("crew", initialEnabled, async (_previous, data) => {
    try {
      const result = await setCrewWinEmailPreference(data.get("enabled") === "true");
      return { status: result.ok ? "succeeded" : "error", message: result.message };
    } catch {
      return { status: "error", message: "We couldn’t confirm this change. Refresh and try again." };
    }
  }, { status: "idle", message: "" });
  const [showFeedback, setShowFeedback] = useState(false);
  const enabled = preference.value ?? false;
  const setEnabled = preference.setValue;
  function save() {
    const data = new FormData();
    if (enabled) data.set("enabled", "true");
    setShowFeedback(true);
    startTransition(() => action(data));
  }

  return <section id="crew-win-email-preference" className={styles.outcomeEmail} data-placement="account" aria-labelledby="crew-win-email-heading">
    <h3 id="crew-win-email-heading">Crew win updates</h3>
    <p>Choose whether to receive an email when a connected Crew member shares a win with you.</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <label><input type="checkbox" checked={enabled} disabled={initialEnabled === null || pending} onChange={event => { setEnabled(event.target.checked); setShowFeedback(false); }} /> Allow Crew win-update emails</label>
      <button type="button" onClick={save} disabled={initialEnabled === null || pending}>{pending ? "Saving…" : "Save preference"}</button>
    </div>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "This preference is unavailable right now." : "Off by default. Turning it on never shares your own wins; you choose those separately."}</p>
    {showFeedback && !pending && feedback.status !== "idle" ? <p role="status" className={styles.outcomeEmailStatus} data-status={feedback.status}>{feedback.message}</p>
      : preference.isDirty && !pending ? <p role="status" className={styles.outcomeEmailStatus}>Unsaved changes. Save preference to keep your choice.</p> : null}
  </section>;
}
