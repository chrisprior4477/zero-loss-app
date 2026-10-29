"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { WalletRollerPicker } from "@/components/wallet/WalletRollerPicker";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import styles from "./purchase-preview.module.css";

type Version = 1 | 2 | 3;
type Step = "choose" | "wallet" | "complete" | "gift";
type Overlay = "fund" | "purchase" | null;
const versions = [
  { id: 1, title: "Wallet return", detail: "Keep the wallet visit. Return directly to the final confirmation." },
  { id: 2, title: "Stay on this page", detail: "Choose, add what’s missing, then confirm. No wallet detour." },
  { id: 3, title: "Two-step popup", detail: "Add funds and confirm inside one popup over your purchase options." },
] as const;
const cards = [
  { value: "wells", label: "Wells Fargo", detail: "Sample card •••• 0002" },
  { value: "discover", label: "Discover", detail: "Sample card •••• 5556" },
  { value: "boa", label: "Bank of America", detail: "Sample card •••• 4242" },
  { value: "capital", label: "Capital One", detail: "Sample card •••• 1881" },
  { value: "chase", label: "Chase", detail: "Sample card •••• 0010" },
];
const optionIds = [1, 2, 3];
const price = 39900;
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

function Product({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.product} ${compact ? styles.compact : ""}`}>
    <Image src="/catalog/nintendo-switch-oled.jpg" alt="Nintendo Switch OLED" width={110} height={92} />
    <div><p className={styles.retailer}>BEST BUY</p><h2>Nintendo Switch – OLED Model</h2><p className={styles.productNote}>$400 gift card · $1 already applied per option</p></div>
  </div>;
}

function PreviewDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus({ preventScroll: true });
    function keys(event: KeyboardEvent) {
      if (event.defaultPrevented) return; // The wallet roller owns Escape while open.
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      // WalletRollerPicker owns a portal so its wheel can float above the ticket.
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]') ?? [])
        .filter(control => control.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onClose]);
  return createPortal(<div className={styles.backdrop} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="purchase-preview-dialog-title" className={`${styles.ticket} ${styles.dialog}`}>
      <button ref={close} type="button" className={styles.close} onClick={onClose} aria-label="Close purchase preview popup">×</button>
      <p className={styles.eyebrow}>PURCHASE PREVIEW</p><h2 id="purchase-preview-dialog-title">{title}</h2>{children}
    </div>
  </div>, document.body);
}

function PurchaseConfirmation({ total, balance, quantity, remaining, decline, onUndo, onConfirm }: {
  total: number; balance: number; quantity: number; remaining: number; decline: boolean;
  onUndo: () => void; onConfirm: () => void;
}) {
  const [deadline] = useState(() => Date.now() + 30000);
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(next);
      if (!next) onUndo();
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, onUndo]);
  return <>
    <Product compact />
    <div className={styles.notice}><strong>Your wallet is ready.</strong><span>{quantity} Best Buy gift {quantity === 1 ? "card" : "cards"} · $400 each</span></div>
    <div className={styles.facts}><div><span>Pay from your preview wallet</span><strong>{usd(total)}</strong></div><div><span>Wallet after purchase</span><strong>{usd(balance - total)}</strong></div></div>
    {decline && remaining > 0 ? <p className={styles.small}>The other {remaining} {remaining === 1 ? "offer is" : "offers are"} declined only after these purchases succeed.</p> : null}
    <div className={styles.countdown}><p>Confirm or undo.<br /><small>If time runs out, nothing is purchased.</small></p><EntryUndoCountdown seconds={seconds} /></div>
    <div className={styles.twoButtons}><button type="button" className={styles.secondary} onClick={onUndo}>Undo</button><button type="button" className={styles.primary} onClick={() => { if (Date.now() >= deadline) onUndo(); else onConfirm(); }}>Confirm purchase</button></div>
    <p className={styles.small}>Preview only. No real payment or account change.</p>
  </>;
}

export function PurchaseJourneyPreview({ initialVersion = 2 }: { initialVersion?: Version }) {
  // These isolated sample balances never enter an account store, action or API.
  const [version, setVersion] = useState<Version>(initialVersion);
  const [step, setStep] = useState<Step>("choose");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selected, setSelected] = useState([1]);
  const [decline, setDecline] = useState(true);
  const [balance, setBalance] = useState(13900);
  const [startingBalance, setStartingBalance] = useState(13900);
  const [card, setCard] = useState("wells");
  const [deposit, setDeposit] = useState(0);
  const [notice, setNotice] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState("");
  const content = useRef<HTMLElement>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const submitted = useRef(false);
  const firstVisit = useRef(true);
  const total = selected.length * price;
  const shortfall = Math.max(0, total - balance);
  const amount = customAmount === "" ? shortfall : /^\d+$/.test(customAmount) ? Number(customAmount) * 100 : NaN;
  const currentCard = cards.find(item => item.value === card)!;
  const remaining = optionIds.length - selected.length;
  const currentVersion = versions.find(item => item.id === version)!;

  const closeOverlay = useCallback(() => {
    submitted.current = false;
    setOverlay(null);
    setNotice("Nothing purchased. Your preview wallet and choices are unchanged.");
  }, []);

  useEffect(() => {
    if (wheel.current) wheel.current.scrollTop = (selected.length - 1) * 44;
  }, [selected.length, version, step]);

  useEffect(() => {
    if (firstVisit.current) { firstVisit.current = false;return; }
    const frame = requestAnimationFrame(() => {
      const target = content.current;
      if (!target) return;
      const header = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
      window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 12), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  function restart(nextVersion = version, nextBalance = startingBalance) {
    setVersion(nextVersion);setStep("choose");setOverlay(null);setSelected([1]);setDecline(true);
    setBalance(nextBalance);setDeposit(0);setNotice("");setCustomAmount("");setError("");submitted.current = false;
    window.history.replaceState(null, "", `/account/purchase-preview?version=${nextVersion}`);
  }
  function quantity(next: number) {
    submitted.current = false;
    setSelected(previous => {
      const kept = previous.slice(0, next);
      for (const id of optionIds) { if (kept.length === next) break; if (!kept.includes(id)) kept.push(id); }
      return kept.sort();
    });setNotice("");setError("");setCustomAmount("");
  }
  function begin() {
    submitted.current = false;
    setNotice("");
    if (!shortfall) setOverlay("purchase");
    else if (version === 1) setStep("wallet");
    else setOverlay("fund");
  }
  function addFunds() {
    if (submitted.current) return;
    if (!Number.isSafeInteger(amount) || amount < shortfall || amount < 100) { setError(`Use a whole-dollar amount of at least ${usd(shortfall)}.`);return; }
    submitted.current = true;
    setBalance(value => value + amount);setDeposit(value => value + amount);setCustomAmount("");setError("");
    setStep("choose");setOverlay("purchase");setNotice(`${usd(amount)} added to the preview wallet. Your purchase is waiting.`);
  }
  function complete() {
    if (overlay !== "purchase" || shortfall > 0) return;
    setBalance(value => value - total);setOverlay(null);setStep("complete");setNotice("");
  }

  const funding = <div className={styles.funding}>
    <WalletRollerPicker label="Current card in use" placeholder="Choose a card" value={card} options={cards} onChange={setCard} />
    <div className={styles.addAmount}><span>Add to your wallet</span><strong>{Number.isFinite(amount) ? usd(amount) : "—"}</strong><small>{customAmount ? "Your chosen whole-dollar amount" : "Exactly what’s missing"}</small></div>
    <details className={styles.custom}><summary>Add a different amount</summary><label>Whole dollars (USD)<input type="text" inputMode="numeric" value={customAmount} onChange={event => { setCustomAmount(event.target.value);setError(""); }} placeholder={`At least ${usd(shortfall)}`} /></label></details>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <p className={styles.authorization}>Add {Number.isFinite(amount) ? usd(amount) : "funds"} using {currentCard.label} •••• {currentCard.detail.slice(-4)}. This does not buy the gift card.</p>
    <button type="button" className={styles.primary} onClick={addFunds}>{Number.isFinite(amount) ? `Add ${usd(amount)}` : "Add funds"}{version === 1 ? " & return to purchase" : " to wallet"}</button>
    <p className={styles.small}>Simulated in this preview. No card is charged.</p>
  </div>;

  return <div className={styles.page}>
    <div className={styles.shell}>
      <aside className={styles.previewBar} aria-label="Preview controls">
        <div><strong>PURCHASE WALKTHROUGHS</strong><span>Sample amounts only · Your account stays unchanged</span></div>
        <div className={styles.previewActions}><button type="button" onClick={() => restart()}>Start over</button><Link href="/account/entries?filter=completion">Exit preview</Link></div>
        <nav className={styles.versions} aria-label="Choose a purchase walkthrough">{versions.map(item => <button type="button" key={item.id} aria-label={`${item.id} ${item.title}`} aria-pressed={version === item.id} onClick={() => restart(item.id)}><span>{item.id}</span>{item.title}</button>)}</nav>
        <p>{currentVersion.detail}</p>
        <details className={styles.scenarios}><summary>Try a different wallet balance</summary><select aria-label="Preview starting balance" value={startingBalance} onChange={event => { const value = Number(event.target.value);setStartingBalance(value);restart(version, value); }}><option value={13900}>$139 — add $260 for one purchase</option><option value={0}>$0 — empty wallet</option><option value={50000}>$500 — enough for one purchase</option><option value={200000}>$2,000 — enough for all three</option></select></details>
      </aside>

      <section ref={content} className={`${styles.ticket} ${styles.content}`} aria-label="Purchase walkthrough">
        {step === "complete" || step === "gift" ? <>
          <p className={styles.successTag}>PREVIEW PURCHASE COMPLETE</p><h1>{step === "gift" ? "Your sample gift card" : `${selected.length === 1 ? "Your gift card is" : "Your gift cards are"} ready.`}</h1>
          {step === "gift" ? <div className={styles.gift}><p>BEST BUY</p><strong>{usd(40000)}</strong><span>{selected.length} separate gift {selected.length === 1 ? "card" : "cards"}</span><b>SAMPLE · NOT REDEEMABLE</b></div> : <Product />}
          <div className={styles.facts}><div><span>Paid from the preview wallet</span><strong>{usd(total)}</strong></div><div><span>Preview wallet remaining</span><strong>{usd(balance)}</strong></div></div>
          <p>{decline && remaining ? `The other ${remaining} ${remaining === 1 ? "offer was" : "offers were"} declined after the simulated purchase succeeded.` : remaining ? `Your other ${remaining} ${remaining === 1 ? "offer stays" : "offers stay"} available.` : "All three sample options are completed."}</p>
          {step !== "gift" ? <button type="button" className={styles.primary} onClick={() => setStep("gift")}>View gift {selected.length === 1 ? "card" : "cards"}</button> : null}
          <div className={styles.twoButtons}><button type="button" className={styles.secondary} onClick={() => restart()}>Try again</button><Link className={styles.secondary} href="/">Continue shopping</Link></div>
          <p className={styles.small}>This is only a walkthrough. No funds, orders, or offers changed in your account.</p>
        </> : step === "wallet" ? <>
          <p className={styles.eyebrow}>PLAYABLE WALLET · PREVIEW</p><h1>Add funds for your purchase</h1><Product compact />
          <div className={styles.notice}><strong>Please add {usd(shortfall)} to continue.</strong><span>{selected.length} selected {selected.length === 1 ? "option" : "options"} · Total {usd(total)} · Wallet {usd(balance)}</span></div>
          {funding}<button type="button" className={styles.secondary} onClick={() => setStep("choose")}>Back to purchase options</button>
        </> : <>
          <h1>Your 3 purchase options</h1><Product />
          {notice ? <p className={styles.status} role="status">{notice}</p> : null}
          <div className={styles.quantity}>
            <div className={styles.numberWheel} ref={wheel} role="radiogroup" aria-label="How many purchase options?">{optionIds.map(value => <label key={value}><input type="radio" name="preview-quantity" aria-label={`${value} purchase ${value === 1 ? "option" : "options"}`} checked={value === selected.length} onChange={() => quantity(value)} /><span>{value}</span></label>)}</div>
            <div><h3>How many would you like?</h3><strong>{selected.length} {selected.length === 1 ? "purchase" : "purchases"}</strong><p>{usd(price)} remaining per option</p></div>
          </div>
          <div className={styles.facts}><div><span>Your purchase total</span><strong>{usd(total)}</strong></div><div><span>Preview wallet balance</span><strong>{usd(balance)}</strong></div></div>
          {shortfall ? <div className={styles.notice}><span>Sorry, you don’t have enough in your wallet to complete the purchase.</span><strong>Please add {usd(shortfall)} to continue.</strong></div> : <div className={`${styles.notice} ${styles.ready}`}><strong>Your wallet covers this purchase.</strong><span>{deposit ? `${usd(deposit)} added in this preview. ` : ""}Nothing is purchased until you confirm.</span></div>}
          {remaining > 0 ? <label className={styles.check}><input type="checkbox" checked={decline} onChange={event => setDecline(event.target.checked)} /><span>Decline the other {remaining} {remaining === 1 ? "offer" : "offers"} after purchase</span></label> : null}
          <details className={styles.exact}><summary>Choose specific options · {selected.join(", ")}</summary><div>{optionIds.map(id => <button type="button" key={id} aria-label={`OPTION ${id}`} className={`${styles.ticket} ${styles.option}`} aria-pressed={selected.includes(id)} onClick={() => { submitted.current = false;setSelected(previous => previous.includes(id) ? previous.length > 1 ? previous.filter(value => value !== id) : previous : [...previous, id].sort());setCustomAmount("");setNotice(""); }}><small>OPTION</small>{id}</button>)}</div></details>
          {version === 2 && shortfall > 0 ? <div className={styles.inlineFunding}><h3>Add what’s missing</h3>{funding}</div> : <button type="button" className={styles.primary} onClick={begin}>{shortfall ? `Add ${usd(shortfall)} to continue` : `Review ${usd(total)} purchase`}</button>}
          <p className={styles.small}>Each entry’s $1 credit stays with its own option. You receive separate retailer gift cards.</p>
        </>}
      </section>
    </div>
    {overlay ? <PreviewDialog title={overlay === "fund" ? `Add ${usd(shortfall)} to continue` : "Confirm your purchase"} onClose={closeOverlay}>
      {overlay === "fund" ? <><p className={styles.popupSteps}><strong>1 Add funds</strong><span>2 Confirm purchase</span></p><Product compact /><div className={styles.facts}><div><span>Purchase total</span><strong>{usd(total)}</strong></div><div><span>In your preview wallet</span><strong>{usd(balance)}</strong></div></div>{funding}<button type="button" className={styles.secondary} onClick={closeOverlay}>Back to purchase options</button></> : <PurchaseConfirmation total={total} balance={balance} quantity={selected.length} remaining={remaining} decline={decline} onUndo={closeOverlay} onConfirm={complete} />}
    </PreviewDialog> : null}
  </div>;
}
