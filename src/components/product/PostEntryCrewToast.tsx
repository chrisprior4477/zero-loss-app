"use client";

import Link from "next/link";
import { useState } from "react";
import { getCrewShareOptions, shareConfirmedEntryWithCrew, type CrewShareOptions } from "@/lib/crew/actions";
import type { EntryRequest } from "@/lib/entries/request";
import styles from "./post-entry-crew-toast.module.css";

export function PostEntryCrewToast({ request, onClose }: { request: EntryRequest; onClose: () => void }) {
  const [options, setOptions] = useState<CrewShareOptions | null>(null);
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [shared, setShared] = useState(false);
  const recipientCount = audience ? options?.groups.find(group => group.id === audience)?.memberCount ?? 0 : options?.memberCount ?? 0;

  async function showAudiences() {
    setBusy(true);
    setMessage("");
    try {
      const result = await getCrewShareOptions();
      if (result.ok) setOptions(result);
      else setMessage(result.message);
    } catch { setMessage("We couldn’t load your Crew. Please try again."); }
    finally { setBusy(false); }
  }

  async function share() {
    setBusy(true);
    setMessage("");
    try {
      const result = await shareConfirmedEntryWithCrew(request.requestId, audience || null);
      setMessage(result.message);
      setShared(result.ok);
    } catch { setMessage("Sharing wasn’t confirmed. Please try again. Your entry is already saved."); }
    finally { setBusy(false); }
  }

  return <section className={styles.toast} aria-labelledby="post-entry-crew-title" aria-label="Entry confirmed">
    <button type="button" className={styles.close} aria-label="Dismiss sharing suggestion" onClick={onClose}>×</button>
    <p className={styles.eyebrow} role="status">Entry confirmed · {request.title}</p>
    <h2 id="post-entry-crew-title">Would you like this pool to end quicker?</h2>
    <p>Share with your Crew, or add new friends from your phone contacts.</p>
    {!shared ? <>
      {options ? <div className={styles.audience}>
        <label htmlFor="post-entry-audience">Who would you like to share with?</label>
        <select id="post-entry-audience" value={audience} disabled={busy} onChange={event => { setAudience(event.target.value); setMessage(""); }}>
          <option value="">Everyone in my Crew ({options.memberCount})</option>
          {options.groups.map(group => <option key={group.id} value={group.id}>{group.name} ({group.memberCount} approved)</option>)}
        </select>
        {!recipientCount ? <p>No approved members in this audience yet. Add people to your group and have them accept your Crew request first.</p> : null}
        <button type="button" disabled={busy || !recipientCount} onClick={() => void share()}>{busy ? "Sharing…" : "Share this pick"}</button>
        <Link href="/account/crew#crew-groups" onClick={onClose}>Create or manage groups →</Link>
      </div> : <button type="button" disabled={busy} onClick={() => void showAudiences()}>{busy ? "Loading Crew…" : "Share with Crew"}</button>}
      <Link className={styles.contacts} href="/account/crew#crew-search" onClick={onClose}>Add friends from phone contacts</Link>
      <small>Optional. Sharing doesn’t change your odds or guarantee a faster finish. Nothing is shared until you choose.</small>
    </> : null}
    {message ? <p role="status" className={styles.message}>{message}</p> : null}
    <button type="button" className={styles.later} onClick={onClose}>{shared ? "Done" : "Not now · keep private"}</button>
  </section>;
}
