"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMenuViewport } from "@/components/layout/useMenuViewport";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { demoCardFixture } from "@/lib/payments/demo-card";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import { getDepositWeeks, formatDepositTotal } from "@/lib/payments/deposit-weeks";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { walletSupportReturnHref } from "@/lib/wallet/ledger-return";
import styles from "./wallet-overview.module.css";

export function DepositReceiptDate({ request, timeZone }: { request: DemoFundingRequest; timeZone?: string }) {
  const card = demoCardFixture(request.sampleCard);
  const timestamp = request.postedAt ?? request.created_at;
  return <span><time dateTime={timestamp}>{formatOfferDeadline(timestamp, timeZone)}</time>{card && <> <span className={styles.receiptCard}>{card.issuer} •••• {card.lastFour}</span></>}</span>;
}

export function DepositCreditLink({ request, restoreLedgerView = false, fromDeposits = false }: { request: DemoFundingRequest; restoreLedgerView?: boolean; fromDeposits?: boolean }) {
  const id = request.ledgerId;
  if (request.reconciliation !== "reconciled" || !id || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return null;
  return <Link href={walletSupportReturnHref(id, restoreLedgerView, fromDeposits)} className="font-bold underline">View wallet credit →</Link>;
}

function ReceiptDetails({ request, timeZone }: { request: DemoFundingRequest; timeZone?: string }) {
  return <details className={styles.weekReceipt}><summary><DepositReceiptDate request={request} timeZone={timeZone} /> · <strong>{formatUsdFromCents(request.amount)}</strong></summary>
    <p>Payment &amp; credit matched</p><p>Request {request.id}</p><DepositCreditLink request={request} /></details>;
}

type ChartProps = { requests: DemoFundingRequest[] | null; hiddenIds?: string[]; asOf: string; timeZone?: string };

export function WeeklyDeposits(props: ChartProps) {
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  return useMenuViewport() === "desktop" ? <DepositChart {...props} openWeek={openWeek} setOpenWeek={setOpenWeek} /> : null;
}

function DepositChart({ requests, hiddenIds, asOf, timeZone, openWeek, setOpenWeek }: ChartProps & {
  openWeek: number | null; setOpenWeek: (week: number | null) => void;
}) {
  const [openReceipt, setOpenReceipt] = useState<string | null>(null);
  const chart = useMemo(() => {
    if (!requests) return null;
    const hidden = new Set(hiddenIds);
    return getDepositWeeks(requests.filter(r => !hidden.has(r.id)), asOf, timeZone);
  }, [requests, hiddenIds, asOf, timeZone]);
  const total = chart?.weeks.reduce((sum, week) => sum + week.cents, BigInt(0)) ?? BigInt(0);
  const largest = Math.max(1, ...(chart?.weeks.map(week => Number(week.cents)) ?? []));
  const displayedReceipt = (openReceipt && requests?.find(request => request.id === openReceipt
    && request.reconciliation === "reconciled" && !hiddenIds?.includes(request.id))) || chart?.latest;
  return <aside className={styles.weeklyPanel} aria-labelledby="weekly-deposit-heading">
    <h2 id="weekly-deposit-heading">Weekly deposits</h2>
    {!chart ? <p role="status">Weekly deposit history is unavailable.</p> : <>
      <div className={styles.weekChart}>
        <p>Posted deposits · Last four weeks</p><strong className={styles.weekTotal}>{formatDepositTotal(total)}</strong>
        {chart.weeks.map(week => <div key={week.start}>
          <button type="button" className={styles.weekBar} disabled={!week.receipts.length} aria-expanded={openWeek === week.start}
            aria-label={`${week.label}, ${formatDepositTotal(week.cents)} in posted deposits`}
            onClick={() => setOpenWeek(openWeek === week.start ? null : week.start)}>
            <span>{week.label}</span><span className={styles.barTrack} aria-hidden="true"><i style={{ width: `${100 * Number(week.cents) / largest}%` }} /></span><b>{formatDepositTotal(week.cents)}</b>
          </button>
          {openWeek === week.start && <div className={styles.weekDetails}>{week.receipts.map(request => <ReceiptDetails key={request.id} request={request} timeZone={timeZone} />)}</div>}
        </div>)}
      </div>
      <p className={styles.weekHint}>{total ? "Select a week to see its deposits." : "No posted deposits in the last four weeks."}</p>
      {displayedReceipt && <div className={styles.latestDeposit}><strong>{displayedReceipt.id === chart.latest?.id ? "Latest posted deposit" : "Deposit receipt"}</strong><details key={displayedReceipt.id} className={styles.weekReceipt}
        onToggle={event => { setOpenReceipt(event.currentTarget.open ? displayedReceipt.id : null); }}>
        <summary><DepositReceiptDate request={displayedReceipt} timeZone={timeZone} /><b>View {formatUsdFromCents(displayedReceipt.amount)} receipt</b></summary>
        <p>Payment &amp; credit matched</p><p>Request {displayedReceipt.id}</p><DepositCreditLink request={displayedReceipt} />
      </details></div>}
    </>}
  </aside>;
}
