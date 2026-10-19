"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./entry-page.module.css";

export type SavedTicket = {
  entryId: string;
  number: number;
  title: string;
  image: string;
  enteredAt: string | null;
  enteredLabel: string;
  amountLabel: string;
};

export function EntryTicketRail({ title, tickets, selectedEntryId, initiallyExpanded }: {
  title: string;
  tickets: SavedTicket[];
  selectedEntryId: string;
  initiallyExpanded: boolean;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initiallyExpanded ? [selectedEntryId] : []));
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const [copyErrorEntryId, setCopyErrorEntryId] = useState<string | null>(null);
  const count = tickets.length;
  const railRef = useRef<HTMLElement>(null);
  const previousCount = useRef(count);

  useEffect(() => {
    const addedEntries = count > previousCount.current;
    previousCount.current = count;
    if (!addedEntries) return;
    // Wait for the confirmed server refresh to render the new numbered tickets.
    const frame = requestAnimationFrame(() => {
      railRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [count]);

  function toggle(entryId: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  async function copyEntryId(entryId: string) {
    try {
      await navigator.clipboard.writeText(entryId);
      setCopiedEntryId(entryId);
      setCopyErrorEntryId(null);
    } catch {
      setCopiedEntryId(null);
      setCopyErrorEntryId(entryId);
    }
  }

  return <section ref={railRef} id="saved-entry-rail" className={styles.entryRail} aria-label={`Your separate entries for ${title}`}>
    <div className={styles.entryRailHeader}>
      <h2>Your <span className={styles.entryRailCount}>{count}</span> {count === 1 ? "entry" : "separate entries"}</h2>
      <p>Tap any numbered ticket to see its own entry details. You can open more than one.</p>
    </div>
    <div className={styles.entryRailCompact} aria-label={`Choose an entry for ${title}`}>
      {tickets.map(ticket => {
        const isSelected = selected.has(ticket.entryId);
        return <button key={ticket.entryId} type="button" className={styles.entryRailSmallTicket} data-selected={isSelected} aria-expanded={isSelected} aria-controls={isSelected ? `saved-entry-${ticket.number}` : undefined} aria-label={`${isSelected ? "Hide" : "Show"} entry ${ticket.number} of ${count}`} onClick={() => toggle(ticket.entryId)}><small>ENTRY</small><strong>{ticket.number}</strong></button>;
      })}
    </div>
    {selected.size > 0 ? <div className={`${styles.entryRailChoices} ${selected.size === 1 ? styles.entryRailSingleChoice : ""}`} aria-label="Selected entry details">
      {tickets.map(ticket => selected.has(ticket.entryId) ? <article key={ticket.entryId} id={`saved-entry-${ticket.number}`} className={styles.entryRailLink} aria-label={`Entry ${ticket.number} of ${count}`}>
        <div className={styles.entryRailImage}><Image src={ticket.image} alt={ticket.title} fill sizes="(max-width: 600px) 75px, 105px" /></div>
        <div className={styles.entryRailDetails}>
          <div className={styles.entryRailTitle}><span className={styles.entryRailNumber}>{ticket.number}</span><div><small>ENTRY {ticket.number} OF {count}</small><h3>{ticket.title}</h3></div></div>
          <p className={styles.entryRailAmount}>{ticket.amountLabel} entered</p>
          <p className={styles.entryRailDate}>{ticket.enteredAt ? <time dateTime={ticket.enteredAt}>{ticket.enteredLabel}</time> : ticket.enteredLabel}</p>
          <div className={styles.entryTileIdRow}><span className={styles.entryTileId}>Entry #{ticket.entryId.slice(-8)}</span><button type="button" className={styles.entryCopyButton} onClick={() => void copyEntryId(ticket.entryId)} aria-label={`${copiedEntryId === ticket.entryId ? "Copied" : copyErrorEntryId === ticket.entryId ? "Could not copy" : "Copy"} full entry number ${ticket.entryId}`} title={copyErrorEntryId === ticket.entryId ? "Could not copy. Please try again." : copiedEntryId === ticket.entryId ? "Copied" : "Copy full entry number"}>{copiedEntryId === ticket.entryId ? <span aria-hidden="true">✓</span> : <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><rect x="6" y="5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M13 5V3.5A1.5 1.5 0 0 0 11.5 2h-8A1.5 1.5 0 0 0 2 3.5v10A1.5 1.5 0 0 0 3.5 15H6" stroke="currentColor" strokeWidth="1.7" /></svg>}</button></div>
          {ticket.entryId !== selectedEntryId ? <Link href={`/account/entries/${encodeURIComponent(ticket.entryId)}?entries=open#saved-entry-rail`} className={styles.entryRailView}>View this entry <span aria-hidden="true">→</span></Link> : null}
        </div>
      </article> : null)}
    </div> : null}
  </section>;
}
