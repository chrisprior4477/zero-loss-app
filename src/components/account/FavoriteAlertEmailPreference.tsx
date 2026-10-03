"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setFavoriteAlertEmailPreference } from "@/lib/favorites/alert-actions";
import styles from "./showroom.module.css";

export function FavoriteAlertEmailPreference({ initialEnabled }: { initialEnabled: boolean | null }) {
  const [enabled, setEnabled] = useState(initialEnabled ?? false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function save() {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await setFavoriteAlertEmailPreference(enabled);
        setError(!result.ok);
        setMessage(result.message);
      } catch {
        setError(true);
        setMessage("We couldn't confirm this change. Refresh and try again.");
      }
    });
  }

  return <section id="favorite-alert-preference" className={styles.outcomeEmail} data-placement="account" aria-labelledby="favorite-alert-heading">
    <h3 id="favorite-alert-heading">Favorites watchlist emails</h3>
    <p>Choose which saved items to watch in <Link href="/account/favorites" className="font-bold underline">Favorites</Link>. Each watched item can send one email when its pool reaches 90% full.</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <label><input type="checkbox" checked={enabled} disabled={initialEnabled === null || pending} onChange={event => setEnabled(event.target.checked)} /> Allow emails for items I watch</label>
      <button type="button" onClick={save} disabled={initialEnabled === null || pending}>{pending ? "Saving…" : "Save preference"}</button>
    </div>
    <p className={styles.outcomeEmailNote}>{initialEnabled === null ? "This preference is unavailable right now. Your saved items are unchanged." : "Turn this off to pause all Favorites alert emails. It does not remove your saved items."}</p>
    {message ? <p role="status" className={styles.outcomeEmailStatus} data-status={error ? "error" : "succeeded"}>{message}</p> : null}
  </section>;
}
