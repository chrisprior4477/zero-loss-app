"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LedgerEntryRow } from "@/lib/wallet/snapshot";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon, type AccountIconName } from "@/components/account/AccountIcon";
import styles from "./wallet-overview.module.css";
import { DemoHistoryClearButton } from "./DemoHistoryClearButton";
import type { ActivityItem } from "@/lib/account/activity";
import { ledgerDescription, transactionLinks } from "@/lib/wallet/transaction-links";
import { useTicketBatches } from "@/components/account/useTicketBatches";
import { TicketBatchControls } from "@/components/account/TicketBatchControls";
import { useMenuViewport } from "@/components/layout/useMenuViewport";
import { WalletColumnHeadings } from "./WalletColumnHeadings";
import { ledgerReturnKey, readLedgerReturn, readLedgerSupportReturn, rememberLedgerSupportReturn, type LedgerFilter, type LedgerReturn } from "@/lib/wallet/ledger-return";
import { searchLedger } from "@/lib/wallet/ledger-search";
import { VoiceSearchControl } from "@/components/home/VoiceSearchButton";
import { useVoiceSearch } from "@/components/search/useVoiceSearch";
import { transactionDateRange } from "@/lib/wallet/date-presets";

const filters: readonly [LedgerFilter, string][] = [["all", "All"], ["funding", "Funding"], ["entries", "Entries"], ["purchases", "Purchases"], ["refunds", "Refunds"]];
const noHiddenIds: string[] = [];

function category(entry: LedgerEntryRow): LedgerFilter {
  if (entry.entry_type === "DEPOSIT") return "funding";
  if (["ENTRY_DEBIT", "ENTRY_HOLD", "ENTRY_HOLD_RELEASE"].includes(entry.entry_type)) return "entries";
  if (entry.entry_type === "PURCHASE_DEBIT") return "purchases";
  if (entry.entry_type === "REFUND") return "refunds";
  return "all";
}

function description(entry: LedgerEntryRow) {
  return ledgerDescription(entry.entry_type, entry.product?.title);
}

function dateLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone, timeZoneName: "short" }).format(new Date(value));
}

function inDateRange(entries: LedgerEntryRow[], from: string, through: string, timeZone: string) {
  if ((!from && !through) || (from && through && from > through)) return entries;
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return entries.filter(entry => {
    const parts = formatter.formatToParts(new Date(entry.created_at));
    const part = (type: string) => parts.find(value => value.type === type)?.value ?? "";
    const day = `${part("year")}-${part("month")}-${part("day")}`;
    return (!from || day >= from) && (!through || day <= through);
  });
}

function reversedDates(from: string, through: string) {
  return Boolean(from && through && from > through);
}

function icon(entry: LedgerEntryRow): { name: AccountIconName; tone: string } {
  if (entry.entry_type === "DEPOSIT") return { name: "wallet", tone: "funding" };
  if (entry.entry_type === "ENTRY_HOLD_RELEASE" || (entry.entry_type === "REFUND" && entry.amount > 0)) return { name: "arrow", tone: "credit" };
  if (entry.entry_type === "ENTRY_DEBIT" || entry.entry_type === "ENTRY_HOLD") return { name: "completion", tone: "entry" };
  return { name: "layers", tone: "adjustment" };
}

export function WalletLedger({ entries, activity = [], selectedId, compact = false, totalCount, hiddenIds = noHiddenIds, canResetDemoHistory = false, hideArchived = false, timeZone = "America/New_York", walletId }: { entries: LedgerEntryRow[]; activity?: readonly ActivityItem[]; selectedId?: string; compact?: boolean; totalCount?: number; hiddenIds?: string[]; canResetDemoHistory?: boolean; hideArchived?: boolean; timeZone?: string; walletId?: string }) {
  const desktop = useMenuViewport() === "desktop";
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [searchSubmissions, setSearchSubmissions] = useState(0);
  const voice = useVoiceSearch(setDraft);
  const cancelVoice = voice.cancel;
  const searchInput = useRef<HTMLInputElement>(null);
  const emptyResults = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [appliedDates, setAppliedDates] = useState({ from: "", through: "" });
  const dateErrorId = useId();
  const invalidDateRange = reversedDates(from, through);
  const [showArchived, setShowArchived] = useState(() => !hideArchived && Boolean(selectedId && hiddenIds.includes(selectedId)));
  function close() {
    updateBookmark({ offset: 0 });
    batches.reset();
    document.getElementById("transactions-heading")?.focus({ preventScroll: true });
    document.getElementById("transactions")?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }
  const archived = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const displayEntries = useMemo(() => compact || (showArchived && !hideArchived) ? entries : entries.filter(entry => !archived.has(entry.id)), [compact, showArchived, hideArchived, entries, archived]);
  const dated = useMemo(() => compact ? displayEntries : inDateRange(displayEntries, appliedDates.from, appliedDates.through, timeZone), [displayEntries, appliedDates, compact, timeZone]);
  const searched = useMemo(() => searchLedger(dated, query, description), [dated, query]);
  const matching = useMemo(() => filter === "all" ? searched : searched.filter(entry => category(entry) === filter), [searched, filter]);
  const { list: listRef, ...batches } = useTicketBatches<HTMLUListElement>(matching.length, desktop ? 6 : 5, matching.findIndex(entry => entry.id === selectedId), "pages");
  const visible = compact ? matching : matching.slice(batches.origin, batches.end);
  const twoColumns = !compact && desktop && visible.length > 3;
  const controls = { ...batches, close, listId: "wallet-transaction-list", noun: "transactions",
    more: () => { updateBookmark({ offset: batches.end }); batches.more(); },
    previousPage: batches.previousPage ? () => { updateBookmark({ offset: Math.max(0, batches.start - batches.size) }); batches.previousPage?.(); } : undefined };
  const restoreBatch = batches.restore;
  const restoredView = useRef<string | null>(null);
  const bookmarkKey = walletId ? `zero-loss-wallet-view:${walletId}` : null;
  useLayoutEffect(() => {
    if (!searchSubmissions) return;
    const target = listRef.current ?? emptyResults.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [searchSubmissions, listRef]);
  useLayoutEffect(() => {
    if (compact || !walletId) return;
    let firstFrame = 0;
    let secondFrame = 0;
    let interrupted = false;
    const settlingTimers: number[] = [];
    function cancelScroll() {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      settlingTimers.splice(0).forEach(timer => window.clearTimeout(timer));
    }
    function interrupt() { interrupted = true; cancelScroll(); }
    function restoreView(event?: Event) {
      const viewKey = JSON.stringify([walletId, window.location.href, selectedId]);
      // Server refreshes keep this mounted view. Only navigation may replay its bookmark.
      if (!event && restoredView.current === viewKey) return;
      restoredView.current = viewKey;
      let saved = readLedgerReturn(window.history.state, walletId!, window.location.href, selectedId);
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (!saved && bookmarkKey && navigation?.type === "reload") try {
        saved = readLedgerReturn(JSON.parse(sessionStorage.getItem(bookmarkKey) ?? "null"), walletId!, window.location.href, selectedId);
      } catch { /* The list remains available. */ }
      const supportReturn = !saved && readLedgerSupportReturn(walletId!, window.location.href, selectedId);
      if (supportReturn) {
        saved = supportReturn;
        window.history.replaceState({ ...window.history.state, [ledgerReturnKey]: saved }, "");
      }
      if (!saved) return;
      // Restore the whole view before painting the returned wallet, then let
      // Next/browser navigation settle before restoring the transaction's position.
      cancelVoice();
      setEditing(false);
      setFilter(saved.filter);
      setQuery(saved.query ?? "");
      setDraft(saved.query ?? "");
      setFrom(saved.from);
      setThrough(saved.through);
      setAppliedDates({ from: saved.from, through: saved.through });
      setShowArchived(saved.showArchived);
      const savedEntries = entries.filter(entry => ((!hideArchived && saved.showArchived) || !archived.has(entry.id)) && (saved.filter === "all" || category(entry) === saved.filter));
      const savedMatches = searchLedger(inDateRange(savedEntries, saved.from, saved.through, timeZone), saved.query ?? "", description);
      const rowIndex = savedMatches.findIndex(entry => `transaction-${entry.id}` === saved.rowId);
      restoreBatch(rowIndex === -1 ? saved.offset : rowIndex);
      cancelScroll();
      interrupted = false;
      const align = () => {
        if (interrupted || window.location.href !== saved.href) return;
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
        firstFrame = requestAnimationFrame(() => {
          secondFrame = requestAnimationFrame(() => {
            if (interrupted || window.location.href !== saved.href) return;
            const list = listRef.current;
            for (const detail of list?.querySelectorAll("details") ?? []) {
              detail.open = saved.expandedRows.includes(detail.closest("li")?.id ?? "");
            }
            const row = document.getElementById(saved.rowId);
            const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
            const top = row && (list?.contains(row) || supportReturn)
              ? window.scrollY + row.getBoundingClientRect().top - (supportReturn ? Math.max(headerBottom + 12, saved.rowTop) : saved.rowTop)
              : saved.scrollY;
            window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
          });
        });
      };
      align();
      // Browser Back and the collapsing mobile header may settle after the
      // initial render. Stop all corrections as soon as the customer interacts.
      for (const delay of [150, 400, 900]) settlingTimers.push(window.setTimeout(align, delay));
    }
    restoreView();
    window.addEventListener("popstate", restoreView);
    window.addEventListener("pageshow", restoreView);
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt);
    return () => {
      cancelScroll();
      window.removeEventListener("popstate", restoreView);
      window.removeEventListener("pageshow", restoreView);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("keydown", interrupt);
    };
  }, [compact, walletId, selectedId, restoreBatch, listRef, entries, archived, hideArchived, timeZone, cancelVoice, bookmarkKey]);

  function updateBookmark(changes: Partial<LedgerReturn>) {
    if (compact || !walletId) return;
    const bookmark = { [ledgerReturnKey]: {
      walletId, href: window.location.href, selectedId, filter, query, ...appliedDates, showArchived, offset: batches.origin,
      scrollY: window.scrollY, rowId: "", rowTop: 0,
      expandedRows: Array.from(listRef.current?.querySelectorAll("details[open]") ?? []).map(detail => detail.closest("li")?.id ?? ""),
      ...changes,
    } };
    window.history.replaceState({ ...window.history.state, ...bookmark }, "");
    if (bookmarkKey) try { sessionStorage.setItem(bookmarkKey, JSON.stringify(bookmark)); } catch { /* History remains usable. */ }
  }

  function rememberView(event: MouseEvent<HTMLUListElement>) {
    if (compact || !walletId || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.target && anchor.target !== "_self") return;
    const row = anchor.closest("li");
    const saved: LedgerReturn = {
      walletId, href: window.location.href, selectedId, filter, query, ...appliedDates, showArchived,
      offset: batches.origin, scrollY: window.scrollY, rowId: row?.id ?? "", rowTop: row?.getBoundingClientRect().top ?? 0,
      expandedRows: Array.from(listRef.current?.querySelectorAll("details[open]") ?? []).map(detail => detail.closest("li")?.id ?? ""),
    };
    // Merge, rather than replace, Next's own navigation state. Keep the URL and
    // outgoing transaction link unchanged and don't add a Back-button step.
    window.history.replaceState({ ...window.history.state, [ledgerReturnKey]: saved }, "");
    const transactionId = new URL(anchor.href).searchParams.get("transaction");
    if (anchor.hasAttribute("data-wallet-support") && transactionId) rememberLedgerSupportReturn(saved, transactionId);
  }
  function applySearch(next: string) {
    cancelVoice();
    updateBookmark({ query: next, offset: 0 });
    setQuery(next);
    setDraft(next);
    batches.reset();
  }
  function closeSearch() {
    cancelVoice();
    setDraft(query);
    setEditing(false);
    searchInput.current?.blur();
  }
  function resetFilters() {
    cancelVoice();
    updateBookmark({ query: "", filter: "all", from: "", through: "", offset: 0 });
    setQuery("");
    setDraft("");
    setFilter("all");
    setFrom("");
    setThrough("");
    setAppliedDates({ from: "", through: "" });
    batches.reset();
    searchInput.current?.focus({ preventScroll: true });
  }
  function changeDates(nextFrom: string, nextThrough: string) {
    setFrom(nextFrom);
    setThrough(nextThrough);
    if (reversedDates(nextFrom, nextThrough)) return;
    const dates = { from: nextFrom, through: nextThrough };
    setAppliedDates(dates);
    updateBookmark({ ...dates, offset: 0 });
    batches.reset();
  }
  const selectedRow = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const row = selectedRow.current;
    if (row && (!window.location.hash || window.location.hash === `#${row.id}`)) row.focus({ preventScroll: true });
  }, [selectedId]);
  return <>
    {!compact ? <div className={styles.historyControls}>
      <form role="search" aria-label="Search wallet transactions" className={styles.ledgerSearch}
        onSubmit={event => {
          event.preventDefault();
          if (!draft.trim() || voice.listening) return;
          searchInput.current?.blur();
          setEditing(false);
          applySearch(draft.trim());
          setSearchSubmissions(count => count + 1);
        }}
        onKeyDown={event => { if (event.key === "Escape" && editing) { event.preventDefault(); closeSearch(); } }}>
        <label htmlFor={`${dateErrorId}-search`}>Search transactions</label>
        <div className={styles.ledgerSearchField}>
          <input ref={searchInput} id={`${dateErrorId}-search`} type="search" autoComplete="off" enterKeyHint="search" placeholder="Product, retailer, or amount" value={draft}
            onFocus={() => setEditing(true)} onChange={event => { cancelVoice(); setEditing(true); setDraft(event.target.value); }} />
          {draft || query ? <button className={styles.ledgerSearchClear} type="button" aria-label="Clear transaction search" title="Clear search" onClick={() => { applySearch(""); searchInput.current?.focus({ preventScroll: true }); }}>×</button> : null}
          {draft.trim() && !voice.listening ? <button className={styles.ledgerSearchGo} type="submit" aria-label="Go to transaction search results">Go</button> : null}
          <VoiceSearchControl listening={voice.listening} error={editing ? voice.error : ""} toggle={() => { searchInput.current?.blur(); setEditing(true); voice.toggle(); }} />
          {editing ? <button className={`${styles.ledgerSearchClear} ${styles.ledgerSearchClose}`} type="button" aria-label="Close transaction search" title="Close search" onClick={closeSearch}>×</button> : null}
        </div>
      </form>
      <div className={styles.dateRange} role="group" aria-label="Transaction date range">
        <div className={styles.quickDates} role="group" aria-label="Quick date ranges">
          {([[0, "All time"], [1, "Today"], [7, "Last 7 days"], [30, "Last 30 days"]] as const).map(([days, label]) => {
            const range = days ? transactionDateRange(days, timeZone) : { from: "", through: "" };
            return <button key={days} type="button" aria-pressed={from === range.from && through === range.through}
              onClick={() => { const next = days ? transactionDateRange(days, timeZone) : { from: "", through: "" }; changeDates(next.from, next.through); }}>{label}</button>;
          })}
        </div>
        <label>From date<input aria-label="From date" aria-invalid={invalidDateRange || undefined} aria-describedby={invalidDateRange ? dateErrorId : undefined} type="date" value={from} max={through || undefined} onChange={event => changeDates(event.target.value, through)} /></label>
        <label>To date<input aria-label="To date" aria-invalid={invalidDateRange || undefined} aria-describedby={invalidDateRange ? dateErrorId : undefined} type="date" value={through} min={from || undefined} onChange={event => changeDates(from, event.target.value)} /></label>
        {(from || through) ? <button type="button" onClick={() => changeDates("", "")}>Clear dates</button> : null}
        {invalidDateRange ? <p id={dateErrorId} role="alert" className={styles.dateRangeError}>From date must be on or before To date. Showing results from the last valid range.</p> : null}
      </div>
      <div className={styles.historyResultCount}>
        {query || from || through || filter !== "all" ? <button type="button" onClick={resetFilters}>Reset filters</button> : null}
        <p aria-live="polite">Showing {matching.length > visible.length ? `${batches.origin + 1}–${batches.end}` : visible.length} of {matching.length}{totalCount && totalCount > entries.length ? ` available (${totalCount - (showArchived ? 0 : hiddenIds.length)} total)` : ""} transactions</p>
      </div>
    </div> : null}
    {!compact ? <nav id="wallet-transaction-list-filters" aria-label="Transaction filters" className={styles.ledgerFilters}>{filters.map(([key, label]) => <button key={key} type="button" aria-label={label} aria-pressed={filter === key} onClick={() => { updateBookmark({ filter: key, offset: 0 }); setFilter(key); batches.reset(); }}><AccountIcon name={key === "funding" ? "wallet" : key === "entries" ? "completion" : key === "purchases" ? "orders" : key === "refunds" ? "gift" : "all"} /><span>{label}</span><b>{key === "all" ? searched.length : searched.filter(entry => category(entry) === key).length}</b></button>)}</nav> : null}
    {visible.length === 0 ? <div ref={emptyResults} tabIndex={-1} className={`${styles.empty} ${styles.transactionPage}`}><h3>{displayEntries.length === 0 ? hiddenIds.length ? "No transactions in this demo view" : "No transactions yet" : query.trim() || filter === "all" ? "No matching transactions" : filter === "purchases" ? "No gift-card purchases" : `No ${filters.find(([key]) => key === filter)?.[1].toLowerCase()} transactions`}</h3><p>{displayEntries.length === 0 ? hiddenIds.length ? hideArchived ? "Your demo transaction history has been reset." : "Earlier demo transactions are archived below and can be viewed again." : "Nothing has been added or spent. Your first posted transaction will appear here." : query.trim() ? "Try a different product, retailer, or amount, or reset your filters." : "No posted ledger activity matches this filter."}</p></div> : <div className={styles.ledger}>
      {!compact && <TicketBatchControls {...controls} top />}
      {twoColumns && <WalletColumnHeadings />}
      <ul id={compact ? undefined : controls.listId} ref={compact ? undefined : listRef} className={compact ? undefined : styles.transactionPage} data-columns={twoColumns ? 2 : 1} style={twoColumns ? { gridTemplateRows: `repeat(${Math.ceil(visible.length / 2)}, auto)` } : undefined} aria-label={compact ? undefined : "Transaction tickets"} tabIndex={-1} onClickCapture={rememberView}>{visible.map(entry => { const [title, detail] = description(entry); const artwork = icon(entry);
        const links = transactionLinks(entry, activity);
        const productHref = entry.product?.slug ? `/items/${encodeURIComponent(entry.product.slug)}` : undefined;
        const preserveView = !compact && Boolean(walletId);
        const supportHref = `/support?transaction=${encodeURIComponent(entry.id)}${entry.entry_type === "PURCHASE_DEBIT" ? "&from=wallet" : ""}${preserveView ? "&walletView=1" : ""}`;
        const selected = entry.id === selectedId;
        return <li key={entry.id} id={`transaction-${entry.id}`} data-selected={selected}
          ref={selected ? selectedRow : undefined} tabIndex={selected ? -1 : undefined} aria-current={selected || undefined}>
        <time dateTime={entry.created_at}>{dateLabel(entry.created_at, timeZone)}</time>
        <span className={styles.ledgerVisuals}>
          {entry.product ? <span className={styles.ledgerProduct}><Image src={entry.product.image} alt={entry.product.title} width={43} height={43} sizes="43px" /></span> : null}
          <span className={styles.ledgerIcon} data-tone={artwork.tone}><AccountIcon name={artwork.name} /></span>
        </span>
        <div className={styles.ledgerDescription}><strong>{title}</strong>{productHref && !compact ? <Link className={styles.productTitle} href={productHref} title={detail}>{detail}</Link> : <span>{detail}</span>}{!compact && entry.product?.retailer ? <span>{entry.product.retailer}</span> : null}</div>
        <div className={styles.transactionValue}>
        <strong className={entry.amount > 0 ? styles.positive : styles.amount}>{entry.amount > 0 ? "+" : ""}{formatUsdFromCents(entry.amount)}</strong>
        {links.length === 1 ? <Link href={links[0].href} className={styles.reportLink} aria-label={`${links[0].label} for ${detail}`} title={links[0].label}><AccountIcon name="chevron" /></Link> : null}
        </div>
        <span className={styles.posted}>Posted</span>
        <div className={styles.transactionActions}>
          {links.length === 1 ? <Link href={links[0].href}>{links[0].label}<AccountIcon name="arrow" /></Link> : null}
          {links.length > 1 ? <details className={styles.relatedEntries}>
            <summary aria-label={`View ${links.length} entries and results`}><span className={styles.relatedFull}>View {links.length} entries and results</span><span className={styles.relatedShort}>Entries &amp; results ({links.length})</span></summary>
            <div>{links.map((link, index) => <Link key={link.id} href={link.href}>Entry {index + 1} · {link.label}<AccountIcon name="arrow" /></Link>)}</div>
          </details> : null}
          {productHref ? <Link href={productHref} className={styles.productAction}>View product</Link> : null}
          <Link href={supportHref} data-wallet-support={preserveView || undefined} className={styles.supportAction} aria-label="Report a problem">Report a problem</Link>
        </div>
      </li>; })}</ul>
    </div>}
    {!compact && <TicketBatchControls {...controls} />}
    {!compact && canResetDemoHistory && entries.some(entry => !archived.has(entry.id)) ? <DemoHistoryClearButton kind="transactions" /> : null}
    {!compact && !hideArchived && hiddenIds.length > 0 ? <button type="button" className={styles.archiveToggle} onClick={() => { updateBookmark({ showArchived: !showArchived, offset: 0 }); setShowArchived(value => !value); batches.reset(); }} aria-expanded={showArchived}>{showArchived ? "Hide archived demo transactions" : `View archived demo transactions (${hiddenIds.length})`}</button> : null}
  </>;
}
