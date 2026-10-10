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
  const railRef = useRef<HTMLElement>(null);
  const count = tickets.length;

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

  return <section ref={railRef} className={styles.entryRail} aria-label={`Your separate entries for ${title}`}>
    <div className={styles.entryRailTop}>
      <div className={styles.entryRailHeader}>
        <strong>{heading}</strong>
        <span>{count === 1 ? "This is your separate chance at this prize." : "Choose an entry to see its own details. Each is a separate chance."}</span>
      </div>
      <button type="button" className={styles.entryRailToggle} aria-label={`${expanded ? "Hide" : "Show"} details for ${count} ${count === 1 ? "entry" : "entries"}`} aria-expanded={expanded} aria-controls="saved-entry-tickets" onClick={() => setExpanded(open => !open)}>
        <b>{count}</b><span>{count === 1 ? "entry" : "entries"}</span><span className={styles.entryRailChevron} aria-hidden="true">⌄</span>
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
          {tickets.map(ticket => <Link
            key={ticket.entryId}
            href={`/account/entries/${encodeURIComponent(ticket.entryId)}?entries=open`}
            prefetch={false}
            scroll={false}
            aria-current={ticket.entryId === selectedEntryId ? "page" : undefined}
            aria-label={`See full ticket for entry ${ticket.number} of ${count}, entry number ${ticket.entryId}`}
            className={styles.entryRailLink}
          ><span className={styles.entryTileHeading}><small>ENTRY</small><strong>{ticket.number}</strong></span><span className={styles.entryTileDate}>{ticket.enteredAt ? <time dateTime={ticket.enteredAt}>{ticket.enteredLabel}</time> : ticket.enteredLabel}</span><span className={styles.entryTileId}>#{ticket.entryId.slice(-8)}</span><span className={styles.entryTileAmount}>{ticket.amountLabel} entered</span></Link>)}
        </div>
      </div>
    </div>
  </section>;
}
