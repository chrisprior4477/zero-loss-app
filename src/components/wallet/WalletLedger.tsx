"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LedgerEntryRow } from "@/lib/wallet/snapshot";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon, type AccountIconName } from "@/components/account/AccountIcon";
import styles from "./wallet-overview.module.css";

type LedgerFilter = "all" | "funding" | "entries" | "refunds";
const filters: readonly [LedgerFilter, string][] = [["all", "All"], ["funding", "Funding"], ["entries", "Entries"], ["refunds", "Refunds"]];

function category(entry: LedgerEntryRow): LedgerFilter {
  if (entry.entry_type === "DEPOSIT") return "funding";
  if (["ENTRY_DEBIT", "ENTRY_HOLD", "ENTRY_HOLD_RELEASE"].includes(entry.entry_type)) return "entries";
  if (entry.entry_type === "REFUND") return "refunds";
  return "all";
}

function description(entry: LedgerEntryRow) {
  if (entry.entry_type === "ENTRY_HOLD") return ["Entry reservation", "Held during the 30-second Undo window"];
  if (entry.entry_type === "ENTRY_HOLD_RELEASE") return ["Entry reservation released", "Hold released on Undo or replaced by the confirmed entry purchase"];
  return ({ DEPOSIT: ["Funds added", "Playable wallet funding"], ENTRY_DEBIT: ["Entry purchase", "Product entry"], REFUND: ["Refund", "Returned to playable wallet"], CORRECTION: ["Adjustment", "Wallet correction"] } as Record<string, [string, string]>)[entry.entry_type] ?? ["Wallet transaction", "Posted ledger activity"];
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(value));
}

function icon(entry: LedgerEntryRow): { name: AccountIconName; tone: string } {
  if (entry.entry_type === "DEPOSIT") return { name: "wallet", tone: "funding" };
  if (entry.entry_type === "ENTRY_HOLD_RELEASE" || (entry.entry_type === "REFUND" && entry.amount > 0)) return { name: "arrow", tone: "credit" };
  if (entry.entry_type === "ENTRY_DEBIT" || entry.entry_type === "ENTRY_HOLD") return { name: "completion", tone: "entry" };
  return { name: "layers", tone: "adjustment" };
}

export function WalletLedger({ entries, selectedId, compact = false, totalCount }: { entries: LedgerEntryRow[]; selectedId?: string; compact?: boolean; totalCount?: number }) {
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [showAll, setShowAll] = useState(false);
  const dated = useMemo(() => compact ? entries : entries.filter(entry => {
    const day = entry.created_at.slice(0, 10);
    return (!from || day >= from) && (!through || day <= through);
  }), [entries, from, through, compact]);
  const matching = useMemo(() => filter === "all" ? dated : dated.filter(entry => category(entry) === filter), [dated, filter]);
  const visible = compact || showAll ? matching : matching.slice(0, 5);
  return <>
    {!compact ? <div className={styles.historyControls}>
      <div className={styles.dateRange} role="group" aria-label="Transaction date range">
        <label>From date<input aria-label="From date" type="date" value={from} max={through || undefined} onChange={event => { setFrom(event.target.value); setShowAll(false); }} /></label>
        <label>To date<input aria-label="To date" type="date" value={through} min={from || undefined} onChange={event => { setThrough(event.target.value); setShowAll(false); }} /></label>
        {(from || through) ? <button type="button" onClick={() => { setFrom(""); setThrough(""); setShowAll(false); }}>Clear dates</button> : null}
      </div>
      <p>Showing {visible.length} of {matching.length}{totalCount && totalCount > entries.length ? ` available (${totalCount} total)` : ""} transactions</p>
    </div> : null}
    {!compact ? <nav aria-label="Transaction filters" className={styles.ledgerFilters}>{filters.map(([key, label]) => <button key={key} type="button" aria-label={label} aria-pressed={filter === key} onClick={() => { setFilter(key); setShowAll(false); }}><AccountIcon name={key === "funding" ? "wallet" : key === "entries" ? "completion" : key === "refunds" ? "gift" : "all"} /><span>{label}</span><b>{key === "all" ? dated.length : dated.filter(entry => category(entry) === key).length}</b></button>)}</nav> : null}
    {visible.length === 0 ? <div className={styles.empty}><h3>{entries.length === 0 ? "No transactions yet" : `No ${filters.find(([key]) => key === filter)?.[1].toLowerCase()} transactions`}</h3><p>{entries.length === 0 ? "Nothing has been added or spent. Your first posted transaction will appear here." : "No posted ledger activity matches this filter."}</p></div> : <div className={styles.ledger}>
      <div className={styles.ledgerHeader} aria-hidden="true"><span>Date</span><span>Description</span><span>Status</span><span>Amount</span></div>
      <ul>{visible.map(entry => { const [title, detail] = description(entry); const artwork = icon(entry); return <li key={entry.id} id={`transaction-${entry.id}`} data-selected={entry.id === selectedId}>
        <span className={styles.ledgerIcon} data-tone={artwork.tone}><AccountIcon name={artwork.name} /></span>
        <span className={styles.ledgerDivider} aria-hidden="true" />
        <div className={styles.ledgerDescription}><strong>{title}</strong><span>{detail}</span></div>
        <span className={styles.ledgerDivider} aria-hidden="true" />
        <time dateTime={entry.created_at}>{dateLabel(entry.created_at)}</time>
        <span className={styles.ledgerDivider} aria-hidden="true" />
        <strong className={entry.amount > 0 ? styles.positive : styles.amount}>{entry.amount > 0 ? "+" : ""}{formatUsdFromCents(entry.amount)}</strong>
        <span className={styles.posted}>Posted</span>
        <Link href={`/support?transaction=${encodeURIComponent(entry.id)}`} className={styles.reportLink} aria-label="Report a problem" title="Report a problem"><AccountIcon name="chevron" /></Link>
      </li>; })}</ul>
    </div>}
    {!compact && matching.length > 5 ? <button type="button" className={styles.showAllTicket} onClick={() => setShowAll(value => !value)} aria-expanded={showAll}>{showAll ? "Show just the first five transactions" : `See all ${matching.length} transactions in your history`}<AccountIcon name="arrow" /></button> : null}
  </>;
}
