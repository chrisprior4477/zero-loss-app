"use client";

import { startTransition, useActionState, useState } from "react";
import { setPurchaseOptionEmailPreference, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";
import { useServerPreference } from "./useServerPreference";
import styles from "./showroom.module.css";

const initialState: PurchaseOptionActionState = { status: "idle" };

async function savePreference(previous: PurchaseOptionActionState, formData: FormData): Promise<PurchaseOptionActionState> {
  try {
    return await setPurchaseOptionEmailPreference(previous, formData);
  } catch {
    return { status: "error", message: "We couldn’t confirm your reminder preference. Your choice is still here. Please try again." };
  }
}

export function PurchaseOptionEmailPreference({ initialEnabled }: { initialEnabled: boolean | null }) {
  const preference = useServerPreference(initialEnabled);
  const enabled = preference.value ?? false;
  const setEnabled = preference.setValue;
  const [state, action, pending] = useActionState(async (previous: typeof initialState, data: FormData) => {
    const generation = preference.generation;
    const result = await savePreference(previous, data);
    if (result.status === "succeeded") preference.confirm(data.get("enabled") === "true", generation);
    return result;
  }, initialState);
  const [showFeedback, setShowFeedback] = useState(false);
  return <section id="purchase-option-email-preference" className={styles.outcomeEmail} data-placement="account" aria-labelledby="purchase-option-email-heading">
    <h3 id="purchase-option-email-heading">Purchase-option reminders</h3>
    <form onSubmit={event => {
      event.preventDefault();
      if (pending || initialEnabled === null) return;
      const data = new FormData(event.currentTarget);
      setShowFeedback(true);
      startTransition(() => action(data));
    }}>
      <label><input type="checkbox" name="enabled" value="true" checked={enabled} onChange={event => { setEnabled(event.target.checked); setShowFeedback(false); }} disabled={initialEnabled === null || pending} /> Email me when my open purchase option is nearing its deadline</label>
      <button type="submit" disabled={initialEnabled === null || pending}>{pending ? "Saving…" : "Save preference"}</button>
    </form>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "This preference is unavailable right now. Your purchase options remain in My Activity." : "If this is on, we’ll remind you at 7 days and 24 hours before an open option ends. Turning it off does not change the option or its deadline."}</p>
    {showFeedback && !pending && state.status !== "idle" ? <p role="status" className={styles.outcomeEmailStatus} data-status={state.status}>{state.message}</p> : null}
  </section>;
}
