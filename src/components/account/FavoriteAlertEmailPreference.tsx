"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { setFavoriteAlertEmailPreference } from "@/lib/favorites/alert-actions";
import { useVerifiedEmailPreference, type EmailSaveResult } from "./useVerifiedEmailPreference";
import { AccountSettingsLandingScroll } from "./AccountSettingsLandingScroll";
import styles from "./showroom.module.css";

export function FavoriteAlertEmailPreference({ initialEnabled }: { initialEnabled: boolean | null }) {
  const { preference, feedback, action, pending, checkSavedPreference, retryButton } = useVerifiedEmailPreference<EmailSaveResult>("favorites", initialEnabled, async (_previous, data) => {
    try {
      const result = await setFavoriteAlertEmailPreference(data.get("enabled") === "true");
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

  return <section id="favorite-alert-preference" className={styles.outcomeEmail} data-placement="account" aria-labelledby="favorite-alert-heading">
    <AccountSettingsLandingScroll target="favorite-alert-preference" focusTarget="favorite-alert-heading" restrictToTargetHash allScreens />
    <h3 id="favorite-alert-heading" tabIndex={-1}>Favorites watchlist emails</h3>
    <p>Choose which of <Link href="/account/favorites" data-history-return className="font-bold underline">Your Favorites</Link> to watch. Each watched item can send one email when its pool reaches 90% full.</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <label><input type="checkbox" checked={enabled} disabled={initialEnabled === null || pending} onChange={event => { setEnabled(event.target.checked); setShowFeedback(false); }} /> Allow emails for items I watch</label>
      <button ref={retryButton} type="button" onClick={save} disabled={initialEnabled === null || pending} aria-label={pending ? "Saving favorite alert email preference" : "Save preference for favorite alert emails"}>{pending ? "Saving…" : "Save preference"}</button>
    </div>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "This preference is unavailable right now. Your saved items are unchanged." : "Turn this off to pause all Favorites alert emails. It does not remove your saved items."}</p>
    {showFeedback && !pending && feedback.status !== "idle" ? <p role={feedback.status === "error" ? "alert" : "status"} className={styles.outcomeEmailStatus} data-status={feedback.status}>{feedback.message}</p>
      : preference.isDirty && !pending ? <p role="status" className={styles.outcomeEmailStatus}>Unsaved changes. Save preference to keep your choice.</p> : null}
    {showFeedback && feedback.status === "unverified" ? <button type="button" className="font-bold underline" disabled={pending} onClick={checkSavedPreference}>Check saved preference</button> : null}
  </section>;
}
