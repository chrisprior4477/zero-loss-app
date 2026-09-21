"use client";

import { useMemo, useState } from "react";
import type { LedgerEntryRow } from "@/lib/wallet/snapshot";
import { formatUsdFromCents } from "@/lib/wallet/money";
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
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function WalletLedger({ entries }: { entries: LedgerEntryRow[] }) {
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const visible = useMemo(() => filter === "all" ? entries : entries.filter(entry => category(entry) === filter), [entries, filter]);
  return <>
    <nav aria-label="Transaction filters" className={styles.ledgerFilters}>{filters.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</nav>
    {visible.length === 0 ? <div className={styles.empty}><h3>{entries.length === 0 ? "No transactions yet" : `No ${filters.find(([key]) => key === filter)?.[1].toLowerCase()} transactions`}</h3><p>{entries.length === 0 ? "Nothing has been added or spent. Your first posted transaction will appear here." : "No posted ledger activity matches this filter."}</p></div> : <div className={styles.ledger}>
      <div className={styles.ledgerHeader} aria-hidden="true"><span>Date</span><span>Description</span><span>Status</span><span>Amount</span></div>
      <ul>{visible.map(entry => { const [title, detail] = description(entry); return <li key={entry.id}>
        <time dateTime={entry.created_at}>{dateLabel(entry.created_at)}</time>
        <div><strong>{title}</strong><span>{detail}</span></div>
        <span className={styles.posted}>Posted</span>
        <strong className={entry.amount > 0 ? styles.positive : styles.amount}>{entry.amount > 0 ? "+" : ""}{formatUsdFromCents(entry.amount)}</strong>
      </li>; })}</ul>
    </div>}
  </>;
}
