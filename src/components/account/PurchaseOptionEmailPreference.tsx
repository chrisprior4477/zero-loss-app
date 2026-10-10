"use client";

import { useActionState, useState } from "react";
import { setPurchaseOptionEmailPreference, type PurchaseOptionActionState } from "@/lib/account/lifecycle-actions";
import styles from "./showroom.module.css";

const initialState: PurchaseOptionActionState = { status: "idle" };

export function PurchaseOptionEmailPreference({ initialEnabled }: { initialEnabled: boolean | null }) {
  const [enabled, setEnabled] = useState(initialEnabled ?? false);
  const [state, action, pending] = useActionState(setPurchaseOptionEmailPreference, initialState);
  return <section id="purchase-option-email-preference" className={styles.outcomeEmail} data-placement="account" aria-labelledby="purchase-option-email-heading">
    <h3 id="purchase-option-email-heading">Purchase-option reminders</h3>
    <form action={action}>
      <label><input type="checkbox" name="enabled" value="true" checked={enabled} onChange={event => setEnabled(event.target.checked)} disabled={initialEnabled === null || pending} /> Email me when my open purchase option is nearing its deadline</label>
      <button type="submit" disabled={initialEnabled === null || pending}>{pending ? "Saving…" : "Save preference"}</button>
    </form>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "This preference is unavailable right now. Your purchase options remain in My Activity." : "If this is on, we’ll remind you at 7 days and 24 hours before an open option ends. Turning it off does not change the option or its deadline."}</p>
    {state.status !== "idle" ? <p role="status" className={styles.outcomeEmailStatus} data-status={state.status}>{state.message}</p> : null}
  </section>;
}
