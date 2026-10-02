"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeDemoFunding, reconcileDemoFunding } from "@/lib/payments/actions";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { saveDemoPaymentMethod } from "@/lib/payments/actions";
import { DEMO_CARD_FIXTURES, DEMO_CARD_TOKEN, demoCardFixture, type DemoCard, type DemoCardToken } from "@/lib/payments/demo-card";
import styles from "./wallet-overview.module.css";

type ContinueDestination = { title: string; href: string; label?: "Back to purchase option" };

function FundingAttempt({ requestKey, blocked, onNew, storageKey, initialAmount = "2500", recovered = false, savedCard = null, savedCards, initialDefault, initialToken, recoveryOnly = false, cardUnavailable = false, continueTo }: { requestKey: string; blocked: boolean; onNew: () => void; storageKey: string; initialAmount?: string; recovered?: boolean; savedCard?: DemoCard | null; savedCards?: DemoCard[]; initialDefault?: boolean; initialToken?: DemoCardToken; recoveryOnly?: boolean; cardUnavailable?: boolean; continueTo?: ContinueDestination }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(completeDemoFunding, { status: "idle" });
  const [amount, setAmount] = useState(initialAmount);
  const [cards, setCards] = useState<DemoCard[]>(savedCards ?? (savedCard ? [savedCard] : []));
  const [visibleTokens, setVisibleTokens] = useState<DemoCardToken[]>(() => cards.length ? cards.map(card => card.token) : [DEMO_CARD_TOKEN]);
  const [selectedToken, setSelectedToken] = useState<DemoCardToken>(initialToken ?? cards.find(card => card.isDefault)?.token ?? cards[0]?.token ?? DEMO_CARD_TOKEN);
  const [defaultToken, setDefaultToken] = useState<DemoCardToken | null>(() => initialDefault === false ? null : initialDefault === true ? (initialToken ?? cards.find(card => card.isDefault)?.token ?? DEMO_CARD_TOKEN) : cards.find(card => card.isDefault)?.token ?? null);
  const [savingCard, setSavingCard] = useState<DemoCardToken | null>(null);
  const [cardMessage, setCardMessage] = useState("");
  const makeDefault = initialDefault ?? selectedToken === defaultToken;
  const confirmation = useRef<HTMLDialogElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const policyInput = useRef<HTMLInputElement>(null);
  function clearConfirmation() {
    if (passwordInput.current) passwordInput.current.value = "";
    if (policyInput.current) policyInput.current.checked = false;
  }
  function openConfirmation() {
    clearConfirmation();
    confirmation.current?.showModal();
    passwordInput.current?.focus();
  }
  const beforePaymentError = state.status === "error" && state.beforePayment === true;
  const locked = pending || (!beforePaymentError && (recovered || state.status !== "idle"));
  async function persistCard(token: DemoCardToken, asDefault: boolean) {
    setSavingCard(token);
    setCardMessage("");
    const data = new FormData();
    data.set("paymentMethod", token);
    data.set("makeDefault", String(asDefault));
    try {
      const result = await saveDemoPaymentMethod({ status: "idle" }, data);
      setCardMessage(result.status === "idle" ? "The sample card was not saved." : result.message);
      if (result.status === "succeeded") {
        const fixture = demoCardFixture(token)!;
        const effectiveDefault = asDefault;
        setCards(previous => [...previous.filter(card => card.token !== token).map(card => ({ ...card, isDefault: effectiveDefault ? false : card.isDefault })),
          { token, lastFour: fixture.lastFour, isDefault: effectiveDefault }]);
        if (effectiveDefault) setDefaultToken(token);
        else if (defaultToken === token) setDefaultToken(null);
      }
    } catch { setCardMessage("The sample card could not be saved. Please try again."); }
    finally { setSavingCard(null); }
  }
  useEffect(() => {
    // React has captured FormData before the action becomes pending. Do not
    // retain a credential in the page during a request, after failure, or close.
    if (pending) clearConfirmation();
  }, [pending]);
  useEffect(() => {
    if (state.status === "succeeded" || (state.status === "error" && state.beforePayment)) {
      try { sessionStorage.removeItem(storageKey); } catch { /* DB recovery remains available. */ }
    }
  }, [state, storageKey]);
  useEffect(() => {
    if (state.status === "succeeded" && continueTo?.href) router.replace(continueTo.href);
  }, [state.status, continueTo?.href, router]);
  if (state.status === "succeeded") return <div className="mt-5 space-y-3"><p role="status" className="text-sm leading-6 text-[#72ff9f]">{state.message}</p><div className="flex flex-wrap gap-3">{continueTo ? <Link href={continueTo.href} className="flex min-h-11 items-center justify-center rounded-xl bg-[#31e800] px-4 text-sm font-extrabold text-[#002719]">{continueTo.label ?? "Continue your entry"} <span aria-hidden="true" className="ml-2">→</span></Link> : null}<button onClick={onNew} className="min-h-11 rounded-xl border border-cyan-300/40 px-4 text-sm font-bold text-cyan-300">Add more funds</button></div></div>;
  return <form action={action} onSubmit={() => {
    // Save BEFORE sending. A reload/lost reply must reuse this logical payment.
    try { sessionStorage.setItem(storageKey, JSON.stringify({ key: requestKey, amount,
      ...(recoveryOnly ? {} : { paymentMethod: selectedToken, makeDefault }) })); } catch { /* Owner-scoped pending requests remain in the database. */ }
  }} className={styles.fundingForm} aria-label="Add funds">
    <input type="hidden" name="idempotencyKey" value={requestKey} />
    <input type="hidden" name="amountCents" value={amount} />
    <input type="hidden" name="currency" value="USD" />
    <input type="hidden" name="paymentMethod" value={recoveryOnly ? "" : selectedToken} />
    <input type="hidden" name="makeDefault" value={String(makeDefault)} />
    <input type="hidden" name="recoveryOnly" value={String(recoveryOnly)} />
    {!recoveryOnly ? <section aria-label="Add Credit Card" className={styles.demoCardsPanel}>
      <div className={styles.demoCardsHeading}><div><h3>Add a card</h3><p>Choose a supplied sample card. No real card details are accepted.</p></div>
        <button type="button" disabled={locked || cardUnavailable || visibleTokens.length === DEMO_CARD_FIXTURES.length} onClick={() => {
          const next = DEMO_CARD_FIXTURES.find(card => !visibleTokens.includes(card.token));
          if (next) setVisibleTokens(current => [...current, next.token]);
        }}>+ Add another card</button></div>
      <div className={styles.demoCardsGrid}>{visibleTokens.map(token => {
        const fixture = demoCardFixture(token)!;
        const saved = cards.some(card => card.token === token);
        return <article key={token} className={styles.demoCard} data-selected={selectedToken === token}>
          <div className={styles.demoCardTop}><strong>Test card •••• {fixture.lastFour}</strong><span>{saved ? "SAVED" : "NEW SAMPLE"}</span></div>
          <p className={styles.demoCardNumber}>{fixture.number}</p>
          <p className={styles.demoCardMeta}>Expires {fixture.expiry} · Sample security code {fixture.code}</p>
          <label className={styles.cardChoice}><input type="radio" name="cardChoice" checked={selectedToken === token} onChange={() => setSelectedToken(token)} disabled={locked || cardUnavailable} />Use for this deposit</label>
          <label className={styles.cardChoice}><input type="checkbox" checked={defaultToken === token} onChange={() => {
            if (defaultToken === token) { if (saved) void persistCard(token, false); else setDefaultToken(null); }
            else { if (saved) void persistCard(token, true); else setDefaultToken(token); }
          }} disabled={locked || cardUnavailable || savingCard !== null} />Use as my default payment method</label>
          {!saved ? <button type="button" className={styles.saveSampleCard} disabled={locked || cardUnavailable || savingCard !== null} onClick={() => void persistCard(token, defaultToken === token)}>{savingCard === token ? "Saving…" : "Save this card"}</button> : null}
        </article>;
      })}</div>
      {cardMessage ? <p role="status" className={styles.cardMessage}>{cardMessage}</p> : null}
      {cardUnavailable ? <p role="alert" className={styles.cardMessage}>Your saved payment methods couldn’t be loaded. Refresh before adding funds.</p> : null}
      <p className={styles.cardMessage}>Only safe sample-card references are saved. You’ll confirm each deposit separately.</p>
    </section> : null}
    <label className="block text-sm font-bold text-white">Amount (USD)
      <select aria-label="Amount (USD)" value={amount} onChange={event => setAmount(event.target.value)} disabled={locked} className="mt-2 block min-h-11 w-full rounded-xl border border-cyan-300/30 bg-[#06223d] px-3 text-white">
        <option value="100">$1.00</option><option value="1000">$10.00</option><option value="2500">$25.00</option><option value="10000">$100.00</option>
      </select>
    </label>
    <button type={recoveryOnly ? "submit" : "button"} onClick={recoveryOnly ? undefined : openConfirmation} disabled={pending || (cardUnavailable && !recovered) || (blocked && state.status === "idle")} className={styles.fundingSubmit}>{pending ? "Checking payment…" : beforePaymentError ? "Try password again" : recovered || state.status !== "idle" ? "Retry same request" : "Add funds"}</button>
    {!recoveryOnly ? <dialog ref={confirmation} aria-labelledby="confirm-funding-title" onClose={clearConfirmation} onCancel={event => { if (pending) event.preventDefault(); else clearConfirmation(); }} className={`${styles.confirmationTicket} m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto p-6 text-white shadow-2xl backdrop:bg-[#001027]/80`}>
      <p className="text-xs font-black uppercase tracking-widest text-cyan-300">Secure deposit confirmation</p>
      <h2 id="confirm-funding-title" className="mt-3 text-2xl font-extrabold">Add {formatUsdFromCents(Number(amount))} to your balance?</h2>
      <p className="mt-2 text-sm text-[#b5cce4]">Test card •••• {demoCardFixture(selectedToken)?.lastFour} · USD · Simulation only</p>
      <p className="mt-4 text-sm leading-6">Deposits stay in your Zero Loss balance and cannot normally be withdrawn. Exceptional refund requests are reviewed separately. This does not limit your rights for unauthorized charges or payment errors.</p>
      <label className="mt-4 block text-sm font-bold">Account password<input ref={passwordInput} name="password" type="password" autoComplete="current-password" required disabled={pending} maxLength={1024} className="mt-2 min-h-12 w-full rounded-xl border border-cyan-300/40 bg-[#031b32] px-3 text-white" /></label>
      <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input ref={policyInput} name="fundingPolicy" type="checkbox" value="funding-confirmation-v1" required disabled={pending} className="mt-1 h-5 w-5 shrink-0 accent-[#31e800]" />I confirm this amount and understand how deposited funds can be used.</label>
      {state.status !== "idle" ? <p role="alert" className="mt-3 text-sm leading-6 text-amber-100">{state.message}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => { clearConfirmation(); confirmation.current?.close(); }} className="min-h-12 flex-1 rounded-xl border border-cyan-300/40 px-4 font-bold disabled:opacity-60">Cancel</button><button disabled={pending} className="min-h-12 flex-[2] rounded-xl bg-[#31e800] px-4 font-extrabold text-[#002719] disabled:opacity-60">{pending ? "Verifying deposit…" : `Confirm ${formatUsdFromCents(Number(amount))} deposit`}</button></div>
      <Link href="/forgot-password" className="mt-4 block text-sm font-bold text-cyan-300 underline">Forgot your password?</Link>
      <p className="mt-3 text-xs leading-5 text-[#b5cce4]">No real money is charged. Your password is checked securely and is not saved with this deposit.</p>
    </dialog> : null}
    {recovered && !beforePaymentError ? <p className="text-xs leading-5 text-amber-100">An earlier request was saved on this device. Retrying checks that payment; it does not create another one.</p> : null}
    {state.status !== "idle" ? <p role="status" className="text-sm leading-6 text-amber-100">{state.message}</p> : blocked ? <p className="text-xs leading-5 text-amber-100">Finish / check your existing request below before adding more.</p> : null}
    <p className="text-xs font-bold leading-5 text-[#b5cce4]">Simulation only — no payment will be processed.</p>
    <p className="text-xs leading-5 text-[#b5cce4]">Only a test-card reference and your preference are saved—not a card number or security code. Limits: 3 requests/minute, 20/day and $1,000 total per account.</p>
  </form>;
}

export function DemoFundingForm({ requestKey, blocked, walletId = "test", savedCard = null, savedCards, cardUnavailable = false, continueTo }: { requestKey: string; blocked: boolean; walletId?: string; savedCard?: DemoCard | null; savedCards?: DemoCard[]; cardUnavailable?: boolean; continueTo?: ContinueDestination }) {
  const storageKey = `zero-loss-demo-request:${walletId}`;
  const [attempt, setAttempt] = useState<{ key: string; amount: string; recovered: boolean; ready: boolean; initialDefault?: boolean; initialToken?: DemoCardToken; recoveryOnly?: boolean }>({ key: requestKey, amount: "2500", recovered: false, ready: false });
  useEffect(() => {
    let saved: { key: string; amount: string; initialDefault?: boolean; initialToken?: DemoCardToken; recoveryOnly: boolean } | null = null;
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (value && typeof value.key === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value.key)
        && ["100", "1000", "2500", "10000"].includes(value.amount)) saved = {
          key: value.key, amount: value.amount,
          initialDefault: typeof value.makeDefault === "boolean" ? value.makeDefault : undefined,
          initialToken: demoCardFixture(value.paymentMethod)?.token,
          recoveryOnly: !demoCardFixture(value.paymentMethod) || typeof value.makeDefault !== "boolean",
        };
    } catch { /* Storage unavailable: database request recovery is still supported. */ }
    // Hydrate a browser-only retry record after SSR, without exposing wallet authority to storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempt(current => saved ? { ...saved, recovered: true, ready: true } : { ...current, ready: true });
  }, [storageKey]);
  return <FundingAttempt key={`${attempt.key}:${attempt.ready}`} requestKey={attempt.key} initialAmount={attempt.amount} recovered={attempt.recovered} storageKey={storageKey}
    savedCard={savedCard} savedCards={savedCards} initialDefault={attempt.initialDefault} initialToken={attempt.initialToken} recoveryOnly={attempt.recoveryOnly} cardUnavailable={cardUnavailable}
    blocked={!attempt.ready || blocked} continueTo={continueTo} onNew={() => setAttempt({ key: crypto.randomUUID(), amount: "2500", recovered: false, ready: true })} />;
}

function CheckFundingRequest({ id, continueTo }: { id: string; continueTo?: ContinueDestination }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(reconcileDemoFunding, { status: "idle" });
  useEffect(() => {
    if (state.status === "succeeded" && continueTo?.href) router.replace(continueTo.href);
  }, [state.status, continueTo?.href, router]);
  return <form action={action} className="mt-2">
    <input type="hidden" name="sessionId" value={id} />
    <button disabled={pending} className="min-h-11 rounded-lg border border-cyan-300/30 px-3 text-sm font-bold text-cyan-300 disabled:opacity-60">{pending ? "Checking…" : "Finish / check"}</button>
    {state.status !== "idle" ? <p role="status" className="mt-2 text-xs leading-5 text-[#b5cce4]">{state.message}</p> : null}
  </form>;
}

export function DemoFundingRequests({ requests, fundingEnabled, continueTo }: { requests: DemoFundingRequest[] | null; fundingEnabled: boolean; continueTo?: ContinueDestination }) {
  const [showAll, setShowAll] = useState(false);
  return <section className={styles.fundingRequests} aria-label="Payment deposits"><h2 className="text-xl font-bold text-white">Payment deposits</h2>
    <p className="mt-2 text-sm text-[#b5cce4]">Deposits are separate from posted ledger credits. Check an interrupted deposit here.</p>
    {requests === null ? <p role="alert" className="mt-3 text-sm text-amber-100">Payment status unavailable. Don’t start another payment until this can be checked.</p>
      : requests.length === 0 ? <p className="mt-3 text-sm text-[#b5cce4]">No payment deposits yet.</p>
      : <><ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#06223d]">{(showAll ? requests : requests.slice(0, 5)).map(request => <li key={request.id} className="p-4">
        <p className="flex flex-wrap justify-between gap-2 text-sm font-bold text-white"><span>{formatUsdFromCents(request.amount)} USD</span><span data-reconciliation={request.reconciliation}>{({ reconciled: "Payment & credit matched", credit_pending: "Payment received · credit pending", not_processed: "Request saved · not processed", discrepancy: "Needs review" })[request.reconciliation]}</span></p>
        <p className="mt-2 break-all text-[10px] text-[#b5cce4]">Request {request.id}</p>
        {request.reconciliation === "discrepancy" ? <p role="alert" className="mt-2 text-xs text-amber-100">This payment needs operator review. Do not make another payment to correct it.</p> : fundingEnabled && request.reconciliation !== "reconciled" ? <CheckFundingRequest id={request.id} continueTo={continueTo} /> : null}
      </li>)}</ul>{requests.length > 5 ? <button type="button" className={styles.showAllTicket} onClick={() => setShowAll(value => !value)} aria-expanded={showAll}>{showAll ? "Show just the first five payment deposits" : `See all ${requests.length} payment deposits`}<span aria-hidden="true">→</span></button> : null}</>}
  </section>;
}
