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

export function WalletLedger({ entries, selectedId }: { entries: LedgerEntryRow[]; selectedId?: string }) {
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const visible = useMemo(() => filter === "all" ? entries : entries.filter(entry => category(entry) === filter), [entries, filter]);
  return <>
    <nav aria-label="Transaction filters" className={styles.ledgerFilters}>{filters.map(([key, label]) => <button key={key} type="button" aria-label={label} aria-pressed={filter === key} onClick={() => setFilter(key)}><AccountIcon name={key === "funding" ? "wallet" : key === "entries" ? "completion" : key === "refunds" ? "gift" : "all"} /><span>{label}</span><b>{key === "all" ? entries.length : entries.filter(entry => category(entry) === key).length}</b></button>)}</nav>
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
  </>;
}
