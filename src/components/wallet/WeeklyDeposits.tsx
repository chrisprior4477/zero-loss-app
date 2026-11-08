"use client";

import { useMemo, useState } from "react";
import { useMenuViewport } from "@/components/layout/useMenuViewport";
import { formatOfferDeadline } from "@/lib/account/timezone";
import { demoCardFixture } from "@/lib/payments/demo-card";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import { getDepositWeeks, formatDepositTotal } from "@/lib/payments/deposit-weeks";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./wallet-overview.module.css";

export function DepositReceiptDate({ request, timeZone }: { request: DemoFundingRequest; timeZone?: string }) {
  const card = demoCardFixture(request.sampleCard);
  return <span>{formatOfferDeadline(request.postedAt ?? request.created_at, timeZone)}{card && <> · {card.issuer} •••• {card.lastFour}</>}</span>;
}

function ReceiptDetails({ request, timeZone }: { request: DemoFundingRequest; timeZone?: string }) {
  return <details className={styles.weekReceipt}><summary>{formatUsdFromCents(request.amount)} · <DepositReceiptDate request={request} timeZone={timeZone} /></summary>
    <p>Payment &amp; credit matched</p><p>Request {request.id}</p></details>;
}

type ChartProps = { requests: DemoFundingRequest[] | null; hiddenIds?: string[]; asOf: string; timeZone?: string };

export function WeeklyDeposits(props: ChartProps) {
  return useMenuViewport() === "desktop" ? <DepositChart {...props} /> : null;
}

function DepositChart({ requests, hiddenIds, asOf, timeZone }: ChartProps) {
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const chart = useMemo(() => {
    if (!requests) return null;
    const hidden = new Set(hiddenIds);
    return getDepositWeeks(requests.filter(r => !hidden.has(r.id)), asOf, timeZone);
  }, [requests, hiddenIds, asOf, timeZone]);
  const total = chart?.weeks.reduce((sum, week) => sum + week.cents, BigInt(0)) ?? BigInt(0);
  const largest = Math.max(1, ...(chart?.weeks.map(week => Number(week.cents)) ?? []));
  return <aside className={styles.weeklyPanel} aria-labelledby="weekly-deposit-heading">
    <h2 id="weekly-deposit-heading">Weekly deposits</h2>
    {!chart ? <p role="status">Weekly deposit history is unavailable.</p> : <>
      <div className={styles.weekChart}>
        <p>Posted deposits · Last four weeks</p><strong className={styles.weekTotal}>{formatDepositTotal(total)}</strong>
        {chart.weeks.map(week => <div key={week.label}>
          <button type="button" className={styles.weekBar} disabled={!week.receipts.length} aria-expanded={openWeek === week.label}
            aria-label={`${week.label}, ${formatDepositTotal(week.cents)} in posted deposits`}
            onClick={() => setOpenWeek(openWeek === week.label ? null : week.label)}>
            <span>{week.label}</span><span className={styles.barTrack} aria-hidden="true"><i style={{ width: `${100 * Number(week.cents) / largest}%` }} /></span><b>{formatDepositTotal(week.cents)}</b>
          </button>
          {openWeek === week.label && <div className={styles.weekDetails}>{week.receipts.map(request => <ReceiptDetails key={request.id} request={request} timeZone={timeZone} />)}</div>}
        </div>)}
      </div>
      <p className={styles.weekHint}>{total ? "Select a week to see its deposits." : "No posted deposits in the last four weeks."}</p>
      {chart.latest && <div className={styles.latestDeposit}><strong>Latest posted deposit</strong><details className={styles.weekReceipt}>
        <summary><DepositReceiptDate request={chart.latest} timeZone={timeZone} /><b>View {formatUsdFromCents(chart.latest.amount)} receipt</b></summary>
        <p>Payment &amp; credit matched</p><p>Request {chart.latest.id}</p>
      </details></div>}
    </>}
  </aside>;
}
