"use client";

import styles from "./entry-page.module.css";

export function EntryCountShortcut({ count }: { count: number }) {
  const entryWord = count === 1 ? "entry" : "entries";

  function showEntries() {
    document.getElementById("saved-entry-rail")?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  return <button type="button" className={styles.entryCountBadge} onClick={showEntries} aria-label={`See my ${count} ${entryWord}`}>
    <span>See my</span>
    <span className={styles.entryCountTicket} aria-hidden="true">{count}</span>
    <span>{entryWord}</span>
  </button>;
}
