"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./entry-page.module.css";

export type SavedTicket = {
  entryId: string;
  number: number;
  enteredAt: string | null;
  enteredLabel: string;
  amountLabel: string;
};

export function EntryTicketRail({ title, tickets, selectedEntryId, initiallyExpanded, heading }: {
  title: string;
  tickets: SavedTicket[];
  selectedEntryId: string;
  initiallyExpanded: boolean;
  heading: string;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const [copyErrorEntryId, setCopyErrorEntryId] = useState<string | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const count = tickets.length;

  const copyEntryId = async (entryId: string) => {
    try {
      await navigator.clipboard.writeText(entryId);
      setCopiedEntryId(entryId);
      setCopyErrorEntryId(null);
    } catch {
      setCopiedEntryId(null);
      setCopyErrorEntryId(entryId);
    }
  };

  const closeFromBottom = () => {
    setExpanded(false);
    toggleRef.current?.focus({ preventScroll: true });
    railRef.current?.scrollIntoView?.({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !railRef.current?.contains(event.target)) setExpanded(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded]);

  return <section id="saved-entry-rail" ref={railRef} className={styles.entryRail} aria-label={`Your separate entries for ${title}`}>
    <div className={styles.entryRailTop}>
      <div className={styles.entryRailHeader}>
        <strong>{heading}</strong>
        <span>{count === 1 ? "This is your separate chance at this prize." : "Choose an entry to see its own details. Each is a separate chance."}</span>
      </div>
      <button ref={toggleRef} type="button" className={styles.entryRailToggle} aria-expanded={expanded} aria-controls="saved-entry-tickets" onClick={() => setExpanded(open => !open)}>
        {expanded ? "Hide" : "See"} {count} {count === 1 ? "entry" : "entries"}
      </button>
    </div>
    <nav className={styles.entryRailCompact} aria-label={`Choose an entry for ${title}`}>
      {tickets.map(ticket => <Link
        key={ticket.entryId}
        href={`/account/entries/${encodeURIComponent(ticket.entryId)}?entries=open`}
        prefetch={false}
        scroll={false}
        aria-current={ticket.entryId === selectedEntryId ? "page" : undefined}
        aria-label={`See entry ${ticket.number} of ${count}, entry number ${ticket.entryId}`}
        className={styles.entryRailSmallTicket}
      ><small>ENTRY</small><strong>{ticket.number}</strong></Link>)}
    </nav>
    <div id="saved-entry-tickets" className={styles.entryRailExpansion} data-expanded={expanded} aria-hidden={!expanded} inert={!expanded}>
      <div className={styles.entryRailExpansionInner}>
        <div className={styles.entryRailChoices} data-count={count === 1 ? "single" : "multiple"}>
          {tickets.map(ticket => <div
            key={ticket.entryId}
            data-current={ticket.entryId === selectedEntryId ? "true" : undefined}
            className={styles.entryRailLink}
          >
            <Link
              href={`/account/entries/${encodeURIComponent(ticket.entryId)}?entries=open`}
              prefetch={false}
              scroll={false}
              aria-current={ticket.entryId === selectedEntryId ? "page" : undefined}
              aria-label={`See full ticket for entry ${ticket.number} of ${count}, entry number ${ticket.entryId}`}
              className={styles.entryRailCardLink}
            />
            <span className={styles.entryTileHeading} aria-hidden="true"><small>ENTRY</small><strong>{ticket.number}</strong></span>
            <span className={styles.entryTileDate} aria-hidden="true">{ticket.enteredAt ? <time dateTime={ticket.enteredAt}>{ticket.enteredLabel}</time> : ticket.enteredLabel}</span>
            <span className={styles.entryTileIdRow}>
              <span className={styles.entryTileId} aria-hidden="true">#{ticket.entryId.slice(-8)}</span>
              <button type="button" className={styles.entryCopyButton} onClick={() => void copyEntryId(ticket.entryId)} aria-label={`${copiedEntryId === ticket.entryId ? "Copied" : copyErrorEntryId === ticket.entryId ? "Could not copy" : "Copy"} full entry number ${ticket.entryId}`} title={copyErrorEntryId === ticket.entryId ? "Could not copy. Please try again." : copiedEntryId === ticket.entryId ? "Copied" : "Copy full entry number"}>
                {copiedEntryId === ticket.entryId ? <span aria-hidden="true">✓</span> : <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><rect x="6" y="5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M13 5V3.5A1.5 1.5 0 0 0 11.5 2h-8A1.5 1.5 0 0 0 2 3.5v10A1.5 1.5 0 0 0 3.5 15H6" stroke="currentColor" strokeWidth="1.7" /></svg>}
              </button>
            </span>
            <span className={styles.entryTileAmount} aria-hidden="true">{ticket.amountLabel} entered</span>
          </div>)}
        </div>
        <div className={styles.entryRailCloseRow}><button type="button" className={styles.entryRailClose} onClick={closeFromBottom}>Close</button></div>
      </div>
    </div>
  </section>;
}
