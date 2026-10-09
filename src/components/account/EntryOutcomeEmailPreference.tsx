"use client";

import { useActionState, useState } from "react";
import { saveEntryOutcomeEmailPreference, type EntryOutcomeEmailState } from "@/lib/account/entry-outcome-email-actions";
import styles from "./showroom.module.css";
import entryStyles from "./entry-page.module.css";

const initialState: EntryOutcomeEmailState = { status: "idle", message: "" };

export function EntryOutcomeEmailPreference({ initialEnabled, placement = "entry" }: { initialEnabled: boolean | null; placement?: "entry" | "account" | "entry-page" }) {
  const [enabled, setEnabled] = useState(initialEnabled ?? false);
  const [state, action, pending] = useActionState(saveEntryOutcomeEmailPreference, initialState);
  return <section id={placement === "account" ? "email-preferences" : undefined} className={placement === "entry-page" ? entryStyles.emailPreference : styles.outcomeEmail} data-placement={placement} aria-labelledby="outcome-email-heading">
    <h3 id="outcome-email-heading">{placement === "account" ? "Email preferences" : placement === "entry-page" ? "Outcome updates" : "How would you like updates?"}</h3>
    <form action={action}>
      <label><input type="checkbox" name="enabled" value="true" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={initialEnabled === null || pending} /> Email me when any of my entry outcomes posts</label>
      <button type="submit" disabled={initialEnabled === null || pending}>{pending ? "Saving…" : "Save preference"}</button>
    </form>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "Email preference is unavailable right now. Your in-app updates remain available." : "Email delivery for entry outcomes is not active in this preview yet. Saving this choice records your preference; check Notifications for the result."}</p>
    {state.status !== "idle" ? <p role="status" className={styles.outcomeEmailStatus} data-status={state.status}>{state.message}</p> : null}
  </section>;
}
