"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LedgerEntryRow } from "@/lib/wallet/snapshot";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon, type AccountIconName } from "@/components/account/AccountIcon";
import styles from "./wallet-overview.module.css";
import { DemoHistoryClearButton } from "./DemoHistoryClearButton";
import type { ActivityItem } from "@/lib/account/activity";
import { transactionLinks } from "@/lib/wallet/transaction-links";
import { useTicketBatches } from "@/components/account/useTicketBatches";
import { TicketBatchControls } from "@/components/account/TicketBatchControls";
import batchStyles from "@/components/account/ticket-batches.module.css";

type LedgerFilter = "all" | "funding" | "entries" | "refunds";
const filters: readonly [LedgerFilter, string][] = [["all", "All"], ["funding", "Funding"], ["entries", "Entries"], ["refunds", "Refunds"]];

function category(entry: LedgerEntryRow): LedgerFilter {
  if (entry.entry_type === "DEPOSIT") return "funding";
  if (["ENTRY_DEBIT", "ENTRY_HOLD", "ENTRY_HOLD_RELEASE"].includes(entry.entry_type)) return "entries";
  if (entry.entry_type === "REFUND") return "refunds";
  return "all";
}

function description(entry: LedgerEntryRow) {
  if (entry.entry_type === "ENTRY_HOLD") return ["Entry reservation", entry.product?.title ?? "Held during the 30-second Undo window"];
  if (entry.entry_type === "ENTRY_HOLD_RELEASE") return ["Entry reservation released", entry.product?.title ?? "Hold released on Undo or replaced by the confirmed entry purchase"];
  if (entry.entry_type === "ENTRY_DEBIT") return ["Entry purchase", entry.product?.title ?? "Product entry"];
  if (entry.entry_type === "PURCHASE_DEBIT" && entry.product) return ["Wallet transaction", entry.product.title];
  return ({ DEPOSIT: ["Funds added", "Playable wallet funding"], REFUND: ["Refund", "Returned to playable wallet"], CORRECTION: ["Adjustment", "Wallet correction"] } as Record<string, [string, string]>)[entry.entry_type] ?? ["Wallet transaction", "Posted ledger activity"];
}

function dateLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }).format(new Date(value));
}

function icon(entry: LedgerEntryRow): { name: AccountIconName; tone: string } {
  if (entry.entry_type === "DEPOSIT") return { name: "wallet", tone: "funding" };
  if (entry.entry_type === "ENTRY_HOLD_RELEASE" || (entry.entry_type === "REFUND" && entry.amount > 0)) return { name: "arrow", tone: "credit" };
  if (entry.entry_type === "ENTRY_DEBIT" || entry.entry_type === "ENTRY_HOLD") return { name: "completion", tone: "entry" };
  return { name: "layers", tone: "adjustment" };
}

export function WalletLedger({ entries, activity = [], selectedId, compact = false, totalCount, hiddenIds = [], canResetDemoHistory = false, hideArchived = false, timeZone = "America/New_York" }: { entries: LedgerEntryRow[]; activity?: readonly ActivityItem[]; selectedId?: string; compact?: boolean; totalCount?: number; hiddenIds?: string[]; canResetDemoHistory?: boolean; hideArchived?: boolean; timeZone?: string }) {
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [showArchived, setShowArchived] = useState(() => !hideArchived && Boolean(selectedId && hiddenIds.includes(selectedId)));
  function close() {
    batches.reset();
    document.getElementById("transactions-heading")?.focus({ preventScroll: true });
    document.getElementById("transactions")?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }
  const archived = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const displayEntries = useMemo(() => compact || (showArchived && !hideArchived) ? entries : entries.filter(entry => !archived.has(entry.id)), [compact, showArchived, hideArchived, entries, archived]);
  const dated = useMemo(() => {
    if (compact || (!from && !through)) return displayEntries;
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    return displayEntries.filter(entry => {
      const parts = formatter.formatToParts(new Date(entry.created_at));
      const part = (type: string) => parts.find(value => value.type === type)?.value ?? "";
      const day = `${part("year")}-${part("month")}-${part("day")}`;
      return (!from || day >= from) && (!through || day <= through);
    });
  }, [displayEntries, from, through, compact, timeZone]);
  const matching = useMemo(() => filter === "all" ? dated : dated.filter(entry => category(entry) === filter), [dated, filter]);
  const { list: listRef, ...batches } = useTicketBatches<HTMLUListElement>(matching.length, 5, matching.findIndex(entry => entry.id === selectedId));
  const visible = compact ? matching : matching.slice(batches.origin, batches.end);
  const controls = { ...batches, close, listId: "wallet-transaction-list", noun: "transactions" };
  const selectedRow = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const row = selectedRow.current;
    if (row && (!window.location.hash || window.location.hash === `#${row.id}`)) row.focus({ preventScroll: true });
  }, [selectedId]);
  return <>
    {!compact ? <div className={styles.historyControls}>
      <div className={styles.dateRange} role="group" aria-label="Transaction date range">
        <label>From date<input aria-label="From date" type="date" value={from} max={through || undefined} onChange={event => { setFrom(event.target.value); batches.reset(); }} /></label>
        <label>To date<input aria-label="To date" type="date" value={through} min={from || undefined} onChange={event => { setThrough(event.target.value); batches.reset(); }} /></label>
        {(from || through) ? <button type="button" onClick={() => { setFrom(""); setThrough(""); batches.reset(); }}>Clear dates</button> : null}
      </div>
      <p>Showing {visible.length} of {matching.length}{totalCount && totalCount > entries.length ? ` available (${totalCount - (showArchived ? 0 : hiddenIds.length)} total)` : ""} transactions</p>
    </div> : null}
    {!compact ? <nav id="wallet-transaction-list-filters" aria-label="Transaction filters" className={styles.ledgerFilters}>{filters.map(([key, label]) => <button key={key} type="button" aria-label={label} aria-pressed={filter === key} onClick={() => { setFilter(key); batches.reset(); }}><AccountIcon name={key === "funding" ? "wallet" : key === "entries" ? "completion" : key === "refunds" ? "gift" : "all"} /><span>{label}</span><b>{key === "all" ? dated.length : dated.filter(entry => category(entry) === key).length}</b></button>)}</nav> : null}
    {visible.length === 0 ? <div className={styles.empty}><h3>{displayEntries.length === 0 ? hiddenIds.length ? "No transactions in this demo view" : "No transactions yet" : `No ${filters.find(([key]) => key === filter)?.[1].toLowerCase()} transactions`}</h3><p>{displayEntries.length === 0 ? hiddenIds.length ? hideArchived ? "Your demo transaction history has been reset." : "Earlier demo transactions are archived below and can be viewed again." : "Nothing has been added or spent. Your first posted transaction will appear here." : "No posted ledger activity matches this filter."}</p></div> : <div className={styles.ledger}>
      <div className={styles.ledgerHeader} aria-hidden="true"><span>Date</span><span>Description</span><span>Status</span><span>Amount</span></div>
      {!compact && <TicketBatchControls {...controls} top />}
      <ul id={compact ? undefined : controls.listId} ref={compact ? undefined : listRef} className={compact ? undefined : batchStyles.rows} tabIndex={-1}>{visible.map(entry => { const [title, detail] = description(entry); const artwork = icon(entry);
        const links = transactionLinks(entry, activity);
        const productHref = entry.product?.slug ? `/items/${encodeURIComponent(entry.product.slug)}` : undefined;
          const supportHref = `/support?transaction=${encodeURIComponent(entry.id)}`;
        const selected = entry.id === selectedId;
        return <li key={entry.id} id={`transaction-${entry.id}`} data-selected={selected}
          ref={selected ? selectedRow : undefined} tabIndex={selected ? -1 : undefined} aria-current={selected || undefined}>
        <span className={styles.ledgerVisuals}>
          {entry.product ? <span className={styles.ledgerProduct}><Image src={entry.product.image} alt={entry.product.title} width={43} height={43} sizes="43px" /></span> : null}
          <span className={styles.ledgerIcon} data-tone={artwork.tone}><AccountIcon name={artwork.name} /></span>
        </span>
        <span className={styles.ledgerDivider} aria-hidden="true" />
        <div className={styles.ledgerDescription}><strong>{title}</strong><span>{detail}</span></div>
        <span className={styles.ledgerDivider} aria-hidden="true" />
        <time dateTime={entry.created_at}>{dateLabel(entry.created_at, timeZone)}</time>
        <span className={styles.ledgerDivider} aria-hidden="true" />
        <strong className={entry.amount > 0 ? styles.positive : styles.amount}>{entry.amount > 0 ? "+" : ""}{formatUsdFromCents(entry.amount)}</strong>
        <span className={styles.posted}>Posted</span>
        {links.length === 1 ? <Link href={links[0].href} className={styles.reportLink} aria-label={`${links[0].label} for ${detail}`} title={links[0].label}><AccountIcon name="chevron" /></Link> : null}
        <div className={styles.transactionActions}>
          {links.length === 1 ? <Link href={links[0].href}>{links[0].label}<AccountIcon name="arrow" /></Link> : null}
          {links.length > 1 ? <details className={styles.relatedEntries}><summary>View {links.length} entries and results</summary><div>{links.map((link, index) => <Link key={link.id} href={link.href}>Entry {index + 1} · {link.label}<AccountIcon name="arrow" /></Link>)}</div></details> : null}
          {productHref ? <Link href={productHref}>View product</Link> : null}
          <Link href={supportHref} className={styles.supportAction} aria-label="Report a problem">Report a problem</Link>
        </div>
      </li>; })}</ul>
    </div>}
    {!compact && <TicketBatchControls {...controls} />}
    {!compact && canResetDemoHistory && entries.some(entry => !archived.has(entry.id)) ? <DemoHistoryClearButton kind="transactions" /> : null}
    {!compact && !hideArchived && hiddenIds.length > 0 ? <button type="button" className={styles.archiveToggle} onClick={() => { setShowArchived(value => !value); batches.reset(); }} aria-expanded={showArchived}>{showArchived ? "Hide archived demo transactions" : `View archived demo transactions (${hiddenIds.length})`}</button> : null}
  </>;
}
