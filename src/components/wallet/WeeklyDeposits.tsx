"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAccountLocale } from "@/components/account/TimeZoneProvider";
import { useMenuViewport } from "@/components/layout/useMenuViewport";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { demoCardFixture } from "@/lib/payments/demo-card";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import { getDepositWeeks, formatDepositTotal } from "@/lib/payments/deposit-weeks";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { walletSupportReturnHref } from "@/lib/wallet/ledger-return";
import styles from "./wallet-overview.module.css";

export function DepositReceiptDate({ request, timeZone }: { request: DemoFundingRequest; timeZone?: string }) {
  const locale = useAccountLocale();
  const card = demoCardFixture(request.sampleCard);
  const timestamp = request.postedAt ?? request.created_at;
  return <span><time dateTime={timestamp}>{formatOfferDeadline(timestamp, timeZone, locale)}</time>{card && <> <span className={styles.receiptCard}>{card.issuer} •••• {card.lastFour}</span></>}</span>;
}

export function depositReceiptLabel(request: DemoFundingRequest, timeZone?: string, locale?: string) {
  return formatUsdFromCents(request.amount) + ", " + formatOfferDeadline(request.postedAt ?? request.created_at, timeZone, locale) + ", reference ending " + request.id.slice(-8).toUpperCase();
}

export function DepositCreditLink({ request, restoreLedgerView = false, fromDeposits = false, fromWeek = false, timeZone }: { request: DemoFundingRequest; timeZone?: string; restoreLedgerView?: boolean; fromDeposits?: boolean | "receipt"; fromWeek?: boolean }) {
  const locale = useAccountLocale();
  const id = request.ledgerId;
  if (request.reconciliation !== "reconciled" || !id || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return null;
  const transaction = walletSupportReturnHref(id, restoreLedgerView, fromDeposits);
  const href = fromWeek ? transaction.replace("#", `&weeklyDeposit=${encodeURIComponent(request.idempotencyKey)}#`) : transaction;
  return <Link href={href} data-deposit-credit={Boolean(fromDeposits) || undefined} onNavigate={fromWeek ? () => {
    window.history.replaceState({ ...window.history.state, weeklyDepositReceipt: request.idempotencyKey }, "");
  } : undefined} aria-label={"View wallet credit for " + depositReceiptLabel(request, timeZone, locale)} className="font-bold underline">View wallet credit →</Link>;
}

function ReceiptDetails({ request, timeZone, open, onClose }: { request: DemoFundingRequest; timeZone?: string; open?: boolean; onClose?: () => void }) {
  return <details open={open} className={styles.weekReceipt} onToggle={event => { if (!event.currentTarget.open) onClose?.(); }}><summary><DepositReceiptDate request={request} timeZone={timeZone} /> · <strong>{formatUsdFromCents(request.amount)}</strong></summary>
    <p>Payment &amp; credit matched</p><p>Request {request.id}</p><DepositCreditLink request={request} fromWeek timeZone={timeZone} /></details>;
}

type ChartProps = { requests: DemoFundingRequest[] | null; hiddenIds?: string[]; hideArchived?: boolean; asOf: string; timeZone?: string; restoreReceipt?: string };

export function WeeklyDeposits(props: ChartProps) {
  const viewport = useMenuViewport();
  return viewport === "desktop" ? <DepositChart {...props} /> : viewport ? <MobileReceiptReturn requestKey={props.restoreReceipt} /> : null;
}

function MobileReceiptReturn({ requestKey }: { requestKey?: string }) {
  const router = useRouter();
  const href = requestKey ? depositListReceiptHref(requestKey) : null;
  useEffect(() => {
    function restore() {
      if (location.pathname !== "/account/wallet") return;
      const stored = window.history.state?.weeklyDepositReceipt;
      const destination = href ?? (typeof stored === "string" && location.hash === "#weekly-deposit-heading" ? depositListReceiptHref(stored) : null);
      if (destination) router.replace(destination, { scroll: false });
    }
    restore();
    window.addEventListener("popstate", restore);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("pageshow", restore);
    };
  }, [href, router]);
  return href ? <p id="weekly-deposit-heading"><Link href={href}>Open this receipt in Payment deposits</Link></p> : null;
}

function depositListReceiptHref(key: string) {
  return `/account/wallet?view=history&panel=deposits&depositRow=${encodeURIComponent(key)}#payment-deposits`;
}

function DepositChart({ requests, hiddenIds, hideArchived, asOf, timeZone, restoreReceipt }: ChartProps) {
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const chart = useMemo(() => {
    if (!requests) return null;
    const hidden = new Set(hiddenIds);
    return getDepositWeeks(requests.filter(r => !hidden.has(r.id)), asOf, timeZone);
  }, [requests, hiddenIds, asOf, timeZone]);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [restoredReceipt, setRestoredReceipt] = useState<string | null>(null);
  const dismissedReceipt = useRef<string | null>(null);
  function dismissRestoredReceipt() {
    dismissedReceipt.current = restoredReceipt;
    setRestoredReceipt(null);
  }
  useEffect(() => {
    function restore() {
      const key = restoreReceipt ?? window.history.state?.weeklyDepositReceipt;
      if (!key || !chart || key === dismissedReceipt.current) return;
      const week = chart.weeks.find(week => week.receipts.some(receipt => receipt.idempotencyKey === key));
      setOpenWeek(week?.start ?? null);
      setRestoredReceipt(key);
      if (restoreReceipt) document.getElementById("weekly-deposit-heading")?.focus();
    }
    const frame = requestAnimationFrame(restore);
    window.addEventListener("pageshow", restore);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pageshow", restore); };
  }, [chart, restoreReceipt]);
  const total = chart?.weeks.reduce((sum, week) => sum + week.cents, BigInt(0)) ?? BigInt(0);
  const largest = Math.max(1, ...(chart?.weeks.map(week => Number(week.cents)) ?? []));
  const requestedReceipt = restoreReceipt ? requests?.find(request => request.idempotencyKey === restoreReceipt
    && request.reconciliation === "reconciled" && (!hideArchived || !hiddenIds?.includes(request.id))) : undefined;
  const requestedArchived = requestedReceipt && hiddenIds?.includes(requestedReceipt.id);
  const displayedReceipt = (openReceipt && requests?.find(request => request.id === openReceipt
    && request.reconciliation === "reconciled" && !hiddenIds?.includes(request.id))) ||
    (openWeek === null && restoredReceipt ? requests?.find(request => request.idempotencyKey === restoredReceipt
      && request.reconciliation === "reconciled" && !hiddenIds?.includes(request.id)) : undefined) || (restoreReceipt ? openWeek === null ? requestedReceipt : undefined : chart?.latest);
  const showDisplayedReceipt = displayedReceipt && !chart?.weeks.some(week => week.start === openWeek
    && week.receipts.some(receipt => receipt.id === displayedReceipt.id));
  return <aside className={styles.weeklyPanel} aria-labelledby="weekly-deposit-heading">
    <h2 id="weekly-deposit-heading" tabIndex={-1}>Weekly deposits</h2>
    {!chart ? <p role="status">Weekly deposit history is unavailable.</p> : <>
      {chart.partial ? <p role="status">Some deposits are missing a posting date. These totals include dated deposits only.</p> : null}
      <div className={styles.weekChart}>
        <p>Posted deposits · Last four weeks</p><strong className={styles.weekTotal}>{formatDepositTotal(total)}</strong>
        {chart.weeks.map(week => <div key={week.start}>
          <button type="button" className={styles.weekBar} disabled={!week.receipts.length} aria-expanded={openWeek === week.start}
            aria-label={`${week.label}, ${formatDepositTotal(week.cents)} in posted deposits`}
            onClick={() => setOpenWeek(openWeek === week.start ? null : week.start)}>
            <span>{week.label}</span><span className={styles.barTrack} aria-hidden="true"><i style={{ width: `${100 * Number(week.cents) / largest}%` }} /></span><b>{formatDepositTotal(week.cents)}</b>
          </button>
          {openWeek === week.start && <div className={styles.weekDetails}>{week.receipts.map(request => <ReceiptDetails key={request.id} request={request} timeZone={timeZone} open={restoredReceipt === request.idempotencyKey ? true : undefined} onClose={restoredReceipt === request.idempotencyKey ? dismissRestoredReceipt : undefined} />)}</div>}
        </div>)}
      </div>
      <p className={styles.weekHint}>{total ? "Select a week to see its deposits." : "No posted deposits in the last four weeks."}</p>
      {restoreReceipt && !requestedReceipt ? <p role="status">This deposit receipt is unavailable.</p> : null}
      {showDisplayedReceipt && displayedReceipt && <div className={styles.latestDeposit}><strong>{requestedArchived && displayedReceipt.id === requestedReceipt.id ? "Archived deposit receipt" : displayedReceipt.id === chart.latest?.id ? "Latest posted deposit" : "Deposit receipt"}</strong><details key={displayedReceipt.id} open={openWeek === null && restoredReceipt === displayedReceipt.idempotencyKey ? true : undefined} className={styles.weekReceipt}
        onToggle={event => {
          const open = event.currentTarget.open;
          setOpenReceipt(open ? displayedReceipt.id : null);
          if (!open && restoredReceipt === displayedReceipt.idempotencyKey) dismissRestoredReceipt();
        }}>
        <summary><DepositReceiptDate request={displayedReceipt} timeZone={timeZone} /><b>View {formatUsdFromCents(displayedReceipt.amount)} receipt</b></summary>
        <p>Payment &amp; credit matched</p><p>Request {displayedReceipt.id}</p><DepositCreditLink request={displayedReceipt} fromWeek timeZone={timeZone} />
      </details></div>}
    </>}
  </aside>;
}
