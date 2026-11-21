"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { entryTicketReturnKey, readEntryTicketReturn, type EntryTicketReturn } from "@/lib/account/entry-ticket-return";
import { revealBelowHeader } from "@/lib/account/landing-position";
import styles from "./entry-ticket-browser.module.css";

export type SavedTicket = {
  entryId: string;
  number: number;
  title: string;
  image: string;
  enteredAt: string | null;
  enteredLabel: string;
  amountLabel: string;
};

const EntryTicketSelection = createContext<{ selected: string; select: (id: string) => void } | null>(null);

export function EntryTicketSelectionProvider({ initial, children }: { initial: string; children: ReactNode }) {
  const [selected, select] = useState(initial);
  const context = useMemo(() => ({ selected, select }), [selected]);
  return <EntryTicketSelection.Provider value={context}>{children}</EntryTicketSelection.Provider>;
}

export function useSelectedEntryTicket() {
  return useContext(EntryTicketSelection);
}

export function EntryTicketRail({ ownerId, title, tickets, selectedEntryId, returnFilter, walletOrigin, alerts, notice }:  {
  returnFilter?: "active";
  walletOrigin?: Record<string, string>;
  alerts?: string;
  notice?: string;
  ownerId: string;
  title: string;
  tickets: SavedTicket[];
  selectedEntryId: string;
}) {
  const id = useId();
  const [localSelection, setLocalSelection] = useState(selectedEntryId);
  const selection = useSelectedEntryTicket();
  const selected = selection?.selected ?? localSelection;
  const setSelected = selection?.select ?? setLocalSelection;
  const [showAll, setShowAll] = useState(false);
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const [copyErrorEntryId, setCopyErrorEntryId] = useState<string | null>(null);
  const count = tickets.length;
  const railRef = useRef<HTMLElement>(null);
  const previousCount = useRef(count);
  const wheelRef = useRef<HTMLDivElement>(null);
  const lastWheelIndex = useRef<number | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const index = Math.max(0, tickets.findIndex(ticket => ticket.entryId === selected));
  const ticket = tickets[index];
  const windowStart = Math.max(0, Math.min(index - 4, count - 9));
  const visibleTickets = tickets.slice(windowStart, windowStart + 9);

  useLayoutEffect(() => {
    function restore() {
      const saved = readEntryTicketReturn(window.history.state, ownerId, window.location.pathname + window.location.search, selectedEntryId, tickets.map(item => item.entryId));
      if (!saved) return;
      lastWheelIndex.current = null;
      setSelected(saved.selectedEntryId);
      setShowAll(saved.showAll);
    }
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
    };
  }, [ownerId, selectedEntryId, setSelected, tickets]);

  function remember(entryId: string, expanded = showAll) {
    const saved: EntryTicketReturn = {
      ownerId, href: window.location.pathname + window.location.search,
      initialEntryId: selectedEntryId, selectedEntryId: entryId, showAll: expanded,
    };
    // Keep Next's routing state and URL intact, without adding a Back-button step.
    try { window.history.replaceState({ ...window.history.state, [entryTicketReturnKey]: saved }, ""); }
    catch { /* The viewer still works if history storage is unavailable. */ }
  }

  function expand(expanded: boolean) {
    setShowAll(expanded);
    remember(ticket.entryId, expanded);
  }

  useEffect(() => {
    if (wheelRef.current && lastWheelIndex.current !== index) wheelRef.current.scrollTop = index * 44;
    lastWheelIndex.current = index;
  }, [index, count]);

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

  function choose(nextIndex: number) {
    const next = Math.max(0, Math.min(count - 1, nextIndex));
    lastWheelIndex.current = null;
    if (wheelRef.current) wheelRef.current.scrollTop = next * 44;
    setSelected(tickets[next].entryId);
    remember(tickets[next].entryId);
  }

  const fallback = useRef<HTMLInputElement | null>(null);
  const latestCopy = useRef(0);
  async function copyEntryId(entryId: string) {
    const attempt = ++latestCopy.current;
    try {
      await navigator.clipboard.writeText(entryId);
      if (attempt !== latestCopy.current) return;
      setCopiedEntryId(entryId);
      setCopyErrorEntryId(null);
    } catch {
      if (attempt !== latestCopy.current) return;
      if (fallback.current?.value === entryId) { fallback.current.focus(); fallback.current.select(); }
      setCopiedEntryId(null);
      setCopyErrorEntryId(entryId);
    }
  }

  if (!ticket) return null;

  function ticketButton(item: SavedTicket, itemIndex: number, fromAll = false) {
    return <button key={item.entryId} type="button" className={styles.smallTicket}
      aria-pressed={item.entryId === ticket.entryId} aria-label={`View entry ${item.number} of ${count}`}
      onClick={() => {
        choose(itemIndex);
        if (fromAll) {
          cardRef.current?.focus({ preventScroll: true });
          cardRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
        }
      }}><small>ENTRY</small><strong style={String(item.number).length > 3 ? { fontSize: 13 } : undefined}>{item.number}</strong></button>;
  }

  return <>
  <section ref={railRef} id="saved-entry-rail" tabIndex={-1} className={styles.rail} aria-label={`Your separate entries for ${title}`}>
    <div className={styles.header}>
      <h2>Your <span className={styles.entryRailCount}>{count}</span> {count === 1 ? "entry" : "separate entries"}</h2>
      {count > 1 ? <p>Scroll the number or tap a ticket to view an entry.</p> : null}
    </div>
    {count > 1 ? <div className={styles.browser}>
      <div className={styles.wheelWrap}>
        <span id={`${id}-wheel-label`} className={styles.wheelLabel}>View entry</span>
        <div ref={wheelRef} className={styles.wheel} role="listbox" aria-labelledby={`${id}-wheel-label`}
          aria-activedescendant={`${id}-entry-${ticket.number}`} tabIndex={0}
          onScroll={event => {
            if (!event.currentTarget.clientHeight) return;
            const next = Math.max(0, Math.min(count - 1, Math.round(event.currentTarget.scrollTop / 44)));
            lastWheelIndex.current = next;
            if (next !== index) {
              setSelected(tickets[next].entryId);
              remember(tickets[next].entryId);
            }
          }}
          onKeyDown={event => {
            if (!["ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) return;
            event.preventDefault();
            choose(event.key === "Home" ? 0 : event.key === "End" ? count - 1 : index + ({ ArrowUp: -1, ArrowDown: 1, PageUp: -3, PageDown: 3 }[event.key] ?? 0));
          }}>
          {tickets.map((item, itemIndex) => <button key={item.entryId} id={`${id}-entry-${item.number}`} type="button"
            role="option" aria-selected={itemIndex === index} tabIndex={-1} className={styles.wheelNumber}
            onClick={() => choose(itemIndex)}>{item.number}</button>)}
        </div>
        <span className={styles.wheelLabel}>Swipe ↕</span>
      </div>
      <div className={styles.nearby}>
        <p className={styles.current} aria-live="polite" aria-atomic="true">Entry {ticket.number} of {count}</p>
        <div className={styles.navigator}>
          <button type="button" className={styles.arrow} aria-label="Previous entry" aria-disabled={index === 0} onClick={() => { if (index > 0) choose(index - 1); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
          <div className={styles.ticketWindow} role="group" aria-label="Nearby entry tickets">
            {visibleTickets.map((item, itemIndex) => ticketButton(item, windowStart + itemIndex))}
          </div>
          <button type="button" className={styles.arrow} aria-label="Next entry" aria-disabled={index === count - 1} onClick={() => { if (index < count - 1) choose(index + 1); }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
        </div>
      </div>
    </div> : null}
    <article ref={cardRef} tabIndex={-1} id={`saved-entry-${ticket.number}`} className={`${styles.entryCard} ${count === 1 ? styles.singleCard : ""}`} aria-label={`Entry ${ticket.number} of ${count}`}>
      <div className={styles.image}><Image src={ticket.image} alt={ticket.title} fill sizes="(max-width: 600px) 60px, 80px" /></div>
      <div className={styles.details}>
        <div className={styles.kicker}><span className={styles.number}>{ticket.number}</span><span>ENTRY {ticket.number} OF {count}</span></div>
        <h3>{ticket.title}</h3>
        <p className={styles.amount}>{ticket.amountLabel} entered</p>
        <p className={styles.date}>{ticket.enteredAt ? <time dateTime={ticket.enteredAt}>{ticket.enteredLabel}</time> : ticket.enteredLabel}</p>
      </div>
      <div className={styles.cardFooter}>
        <div className={styles.entryIdRow}><strong>Entry #{ticket.entryId.slice(-8)}</strong><button type="button" className={styles.copyButton} onClick={() => void copyEntryId(ticket.entryId)} aria-label={`${copiedEntryId === ticket.entryId ? "Copied" : copyErrorEntryId === ticket.entryId ? "Could not copy" : "Copy"} full entry number ${ticket.entryId}`} title={copyErrorEntryId === ticket.entryId ? "Clipboard unavailable. Copy the number from the field below." : copiedEntryId === ticket.entryId ? "Copied" : "Copy full entry number"}>{copiedEntryId === ticket.entryId ? <span aria-hidden="true">✓</span> : <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><rect x="6" y="5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><path d="M13 5V3.5A1.5 1.5 0 0 0 11.5 2h-8A1.5 1.5 0 0 0 2 3.5v10A1.5 1.5 0 0 0 3.5 15H6" stroke="currentColor" strokeWidth="1.7" /></svg>}</button></div>
        <span className={styles.status}>◷ Still open</span>
        {copyErrorEntryId === ticket.entryId ? <label className="block w-full min-w-0 text-sm">
          <span role="status">Copy this entry number manually.</span>
          <input className="mt-1 block w-full min-w-0 rounded border border-[#89b8ce] bg-white px-2 py-1 text-sm" aria-label="Full entry number" value={ticket.entryId} readOnly
            ref={element => { fallback.current = element; if (element) { element.focus(); element.select(); } }} />
        </label> : null}
        {ticket.entryId !== selectedEntryId ? <Link href={`/account/entries/${encodeURIComponent(ticket.entryId)}?entries=open${returnFilter ? "&filter=active" : ""}${walletOrigin ? `&${new URLSearchParams(walletOrigin)}` : ""}${notice ? `&alerts=${encodeURIComponent(alerts ?? "all")}&notice=${encodeURIComponent(notice)}` : ""}#saved-entry-rail`} className={styles.entryLink}>View this entry <span aria-hidden="true">→</span></Link> : null}
      </div>
    </article>
    {count > 1 ? <>
      <button ref={expandRef} type="button" className={showAll ? styles.expand : `${styles.expand} zl-see-all`} aria-expanded={showAll} aria-controls={`${id}-all`} onClick={() => expand(!showAll)}>
        {showAll ? "Hide all" : "See all"} <span className={styles.countTicket}>{count}</span> entries <span aria-hidden="true" className={styles.expandArrow}>{showAll ? "⌃" : "⌄"}</span>
      </button>
      {showAll ? <div className={styles.allEntries} id={`${id}-all`}>
        <p>All {count} entries · Tap a ticket to view its details.</p>
        <div className={styles.allGrid} role="group" aria-label={`All ${count} saved entries`}>{tickets.map((item, itemIndex) => ticketButton(item, itemIndex, true))}</div>
        <button type="button" className={styles.collapse} onClick={() => {
          expand(false);
          expandRef.current?.focus({ preventScroll: true });
          requestAnimationFrame(() => { if (expandRef.current) revealBelowHeader(expandRef.current); });
        }}>Hide all entries <span aria-hidden="true">⌃</span></button>
      </div> : null}
    </> : null}
  </section>
  <div className={styles.bottom}><Link href="/" className={styles.shopping}>Continue shopping</Link></div>
  </>;
}
