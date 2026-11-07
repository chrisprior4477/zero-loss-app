"use client";

import { startTransition, useActionState, useState } from "react";
import { saveEntryOutcomeEmailPreference, type EntryOutcomeEmailState } from "@/lib/account/entry-outcome-email-actions";
import { useServerPreference } from "./useServerPreference";
import styles from "./showroom.module.css";
import entryStyles from "./entry-page.module.css";

const initialState: EntryOutcomeEmailState = { status: "idle", message: "" };

async function savePreference(previous: EntryOutcomeEmailState, formData: FormData): Promise<EntryOutcomeEmailState> {
  try {
    return await saveEntryOutcomeEmailPreference(previous, formData);
  } catch {
    // Transport failures happen outside the server action's own error handling.
    return { status: "error", message: "We couldn’t confirm your email preference. Your choice is still here. Please try again." };
  }
}

export function EntryOutcomeEmailPreference({ initialEnabled, placement = "entry" }: { initialEnabled: boolean | null; placement?: "entry" | "account" | "entry-page" }) {
  const preference = useServerPreference(initialEnabled);
  const enabled = preference.value ?? false;
  const setEnabled = preference.setValue;
  const [showFeedback, setShowFeedback] = useState(false);
  const [state, action, pending] = useActionState(async (previous: typeof initialState, data: FormData) => {
    const generation = preference.generation;
    const result = await savePreference(previous, data);
    if (result.status === "succeeded") preference.confirm(data.get("enabled") === "true", generation);
    return result;
  }, initialState);
  return <section id={placement === "account" ? "email-preferences" : undefined} className={placement === "entry-page" ? entryStyles.emailPreference : styles.outcomeEmail} data-placement={placement} aria-labelledby="outcome-email-heading">
    <h3 id="outcome-email-heading">{placement === "account" ? "Email preferences" : placement === "entry-page" ? "Outcome updates" : "How would you like updates?"}</h3>
    <form onSubmit={event => {
      event.preventDefault();
      if (pending || initialEnabled === null) return;
      // Keep the controlled draft; form actions otherwise reset the checkbox.
      const formData = new FormData(event.currentTarget);
      setShowFeedback(true);
      startTransition(() => action(formData));
    }}>
      <label><input type="checkbox" name="enabled" value="true" checked={enabled} onChange={event => { setEnabled(event.target.checked); setShowFeedback(false); }} disabled={initialEnabled === null || pending} /> Email me when any of my entry outcomes posts</label>
      <button type="submit" disabled={initialEnabled === null || pending}>{pending ? "Saving…" : "Save preference"}</button>
    </form>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "Email preference is unavailable right now. Your in-app updates remain available." : "If this is on, we'll email you when an entered prize pool closes and its result is ready. You'll also find the result in Notifications."}</p>
    {showFeedback && !pending && state.status !== "idle" ? <p role="status" className={styles.outcomeEmailStatus} data-status={state.status}>{state.message}</p>
      : preference.isDirty && !pending ? <p role="status" className={styles.outcomeEmailStatus}>Unsaved changes. Save preference to keep your choice.</p> : null}
  </section>;
}
