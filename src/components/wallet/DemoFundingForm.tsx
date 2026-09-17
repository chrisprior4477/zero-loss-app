"use client";
import { useActionState, useEffect, useState } from "react";
import { completeDemoFunding, reconcileDemoFunding } from "@/lib/payments/actions";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { DEMO_CARD_TOKEN, type DemoCard } from "@/lib/payments/demo-card";

function FundingAttempt({ requestKey, blocked, onNew, storageKey, initialAmount = "2500", recovered = false, savedCard = null, initialDefault, recoveryOnly = false, cardUnavailable = false }: { requestKey: string; blocked: boolean; onNew: () => void; storageKey: string; initialAmount?: string; recovered?: boolean; savedCard?: DemoCard | null; initialDefault?: boolean; recoveryOnly?: boolean; cardUnavailable?: boolean }) {
  const [state, action, pending] = useActionState(completeDemoFunding, { status: "idle" });
  const [amount, setAmount] = useState(initialAmount);
  const [makeDefault, setMakeDefault] = useState(initialDefault ?? savedCard?.isDefault ?? false);
  const locked = pending || recovered || state.status !== "idle";
  useEffect(() => {
    if (state.status === "succeeded") {
      try { sessionStorage.removeItem(storageKey); } catch { /* DB recovery remains available. */ }
    }
  }, [state.status, storageKey]);
  if (state.status === "succeeded") return <div className="mt-5 space-y-3"><p role="status" className="text-sm leading-6 text-[#72ff9f]">{state.message}</p><button onClick={onNew} className="min-h-11 rounded-xl border border-cyan-300/40 px-4 text-sm font-bold text-cyan-300">Add more funds</button></div>;
  return <form action={action} onSubmit={() => {
    // Save BEFORE sending. A reload/lost reply must reuse this logical payment.
    try { sessionStorage.setItem(storageKey, JSON.stringify({ key: requestKey, amount,
      ...(recoveryOnly ? {} : { paymentMethod: DEMO_CARD_TOKEN, makeDefault }) })); } catch { /* Owner-scoped pending requests remain in the database. */ }
  }} className="mt-5 space-y-3" aria-label="Add funds">
    <input type="hidden" name="idempotencyKey" value={requestKey} />
    <input type="hidden" name="amountCents" value={amount} />
    <input type="hidden" name="currency" value="USD" />
    <input type="hidden" name="paymentMethod" value={recoveryOnly ? "" : DEMO_CARD_TOKEN} />
    <input type="hidden" name="makeDefault" value={String(makeDefault)} />
    <input type="hidden" name="recoveryOnly" value={String(recoveryOnly)} />
    {!recoveryOnly ? <section aria-label="Add Credit Card" className="rounded-2xl border border-cyan-300/25 bg-[#06223d]/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-white">Add Credit Card</h3><span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[10px] font-black tracking-wider text-cyan-200">TEST CARD</span></div>
      <p className="mt-2 text-xs leading-5 text-[#b5cce4]">Use this sample card. Real card details are not accepted.</p>
      <details open={!savedCard?.isDefault} className="mt-3">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-bold text-white">Test card •••• 4242{savedCard?.isDefault ? " · Default" : ""}</summary>
        <div className="mt-2 space-y-3">
          <label className="block text-xs text-[#b5cce4]">Card number<input aria-label="Test card number" readOnly value="4242 4242 4242 4242" className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#031b32] px-3 text-sm tracking-wide text-white" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-[#b5cce4]">Expiry<input aria-label="Test card expiry" readOnly value="12/30" className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#031b32] px-3 text-sm text-white" /></label>
            <label className="block text-xs text-[#b5cce4]">Security code<input aria-label="Test card security code" readOnly value="123" className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-[#031b32] px-3 text-sm text-white" /></label>
          </div>
        </div>
      </details>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold leading-5 text-white"><input type="checkbox" checked={makeDefault} onChange={event => setMakeDefault(event.target.checked)} disabled={locked || cardUnavailable} className="h-5 w-5 shrink-0 accent-[#31e800]" />Use as my default payment method</label>
      <p className="mt-1 text-xs leading-5 text-[#b5cce4]">Saved when you add funds. You’ll still confirm every payment.</p>
      {cardUnavailable ? <p role="alert" className="mt-2 text-xs leading-5 text-amber-100">Your saved payment method couldn’t be loaded. Refresh before adding funds.</p> : null}
    </section> : null}
    <label className="block text-sm font-bold text-white">Amount (USD)
      <select aria-label="Amount (USD)" value={amount} onChange={event => setAmount(event.target.value)} disabled={locked} className="mt-2 block min-h-11 w-full rounded-xl border border-cyan-300/30 bg-[#06223d] px-3 text-white">
        <option value="100">$1.00</option><option value="1000">$10.00</option><option value="2500">$25.00</option><option value="10000">$100.00</option>
      </select>
    </label>
    <button disabled={pending || (cardUnavailable && !recovered) || (blocked && state.status === "idle")} className="min-h-12 w-full rounded-xl bg-[#31e800] px-4 text-sm font-black text-[#002719] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Checking payment…" : recovered || state.status !== "idle" ? "Retry same request" : "Add funds"}</button>
    {recovered ? <p className="text-xs leading-5 text-amber-100">An earlier request was saved on this device. Retrying checks that payment; it does not create another one.</p> : null}
    {state.status !== "idle" ? <p role="status" className="text-sm leading-6 text-amber-100">{state.message}</p> : blocked ? <p className="text-xs leading-5 text-amber-100">Finish / check your existing request below before adding more.</p> : null}
    <p className="text-xs font-bold leading-5 text-[#b5cce4]">Simulation only — no payment will be processed.</p>
    <p className="text-xs leading-5 text-[#b5cce4]">Only a test-card reference and your preference are saved—not a card number or security code. Limits: 3 requests/minute, 20/day and $1,000 total per account.</p>
  </form>;
}

export function DemoFundingForm({ requestKey, blocked, walletId = "test", savedCard = null, cardUnavailable = false }: { requestKey: string; blocked: boolean; walletId?: string; savedCard?: DemoCard | null; cardUnavailable?: boolean }) {
  const storageKey = `zero-loss-demo-request:${walletId}`;
  const [attempt, setAttempt] = useState<{ key: string; amount: string; recovered: boolean; ready: boolean; initialDefault?: boolean; recoveryOnly?: boolean }>({ key: requestKey, amount: "2500", recovered: false, ready: false });
  useEffect(() => {
    let saved: { key: string; amount: string; initialDefault?: boolean; recoveryOnly: boolean } | null = null;
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (value && typeof value.key === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value.key)
        && ["100", "1000", "2500", "10000"].includes(value.amount)) saved = {
          key: value.key, amount: value.amount,
          initialDefault: typeof value.makeDefault === "boolean" ? value.makeDefault : undefined,
          recoveryOnly: value.paymentMethod !== DEMO_CARD_TOKEN || typeof value.makeDefault !== "boolean",
        };
    } catch { /* Storage unavailable: database request recovery is still supported. */ }
    // Hydrate a browser-only retry record after SSR, without exposing wallet authority to storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempt(current => saved ? { ...saved, recovered: true, ready: true } : { ...current, ready: true });
  }, [storageKey]);
  return <FundingAttempt key={`${attempt.key}:${attempt.ready}`} requestKey={attempt.key} initialAmount={attempt.amount} recovered={attempt.recovered} storageKey={storageKey}
    savedCard={savedCard} initialDefault={attempt.initialDefault} recoveryOnly={attempt.recoveryOnly} cardUnavailable={cardUnavailable}
    blocked={!attempt.ready || blocked} onNew={() => setAttempt({ key: crypto.randomUUID(), amount: "2500", recovered: false, ready: true })} />;
}

function CheckFundingRequest({ id }: { id: string }) {
  const [state, action, pending] = useActionState(reconcileDemoFunding, { status: "idle" });
  return <form action={action} className="mt-2">
    <input type="hidden" name="sessionId" value={id} />
    <button disabled={pending} className="min-h-11 rounded-lg border border-cyan-300/30 px-3 text-sm font-bold text-cyan-300 disabled:opacity-60">{pending ? "Checking…" : "Finish / check"}</button>
    {state.status !== "idle" ? <p role="status" className="mt-2 text-xs leading-5 text-[#b5cce4]">{state.message}</p> : null}
  </form>;
}

export function DemoFundingRequests({ requests, fundingEnabled }: { requests: DemoFundingRequest[] | null; fundingEnabled: boolean }) {
  return <section className="mt-6" aria-label="Payment requests"><h2 className="text-xl font-bold text-white">Payment requests</h2>
    <p className="mt-2 text-sm text-[#b5cce4]">Payment requests are separate from posted ledger credits. Check an interrupted request here.</p>
    {requests === null ? <p role="alert" className="mt-3 text-sm text-amber-100">Payment status unavailable. Don’t start another payment until this can be checked.</p>
      : requests.length === 0 ? <p className="mt-3 text-sm text-[#b5cce4]">No funding requests yet.</p>
      : <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#06223d]">{requests.map(request => <li key={request.id} className="p-4">
        <p className="flex flex-wrap justify-between gap-2 text-sm font-bold text-white"><span>{formatUsdFromCents(request.amount)} USD</span><span className={request.reconciliation === "reconciled" ? "text-[#72ff9f]" : "text-amber-100"}>{({ reconciled: "Payment & credit matched", credit_pending: "Payment received · credit pending", not_processed: "Request saved · not processed", discrepancy: "Needs review" })[request.reconciliation]}</span></p>
        <p className="mt-2 break-all text-[10px] text-[#b5cce4]">Request {request.id}</p>
        {request.reconciliation === "discrepancy" ? <p role="alert" className="mt-2 text-xs text-amber-100">This payment needs operator review. Do not make another payment to correct it.</p> : fundingEnabled && request.reconciliation !== "reconciled" ? <CheckFundingRequest id={request.id} /> : null}
      </li>)}</ul>}
  </section>;
}
