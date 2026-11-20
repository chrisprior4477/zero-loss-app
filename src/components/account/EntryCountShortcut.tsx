"use client";

import styles from "./entry-page.module.css";
import { revealBelowHeader } from "@/lib/account/landing-position";

export function EntryCountShortcut({ count }: { count: number }) {
  const entryWord = count === 1 ? "entry" : "entries";

  function showEntries() {
    const rail = document.getElementById("saved-entry-rail");
    if (!rail) return;
    rail.focus({ preventScroll: true });
    revealBelowHeader(rail);
  }

  return <button type="button" className={styles.entryCountBadge} onClick={showEntries} aria-label={`See my ${count} ${entryWord}`}>
    <span>See my</span>
    <span className={styles.entryCountTicket} aria-hidden="true">{count}</span>
    <span>{entryWord}</span>
  </button>;
}
