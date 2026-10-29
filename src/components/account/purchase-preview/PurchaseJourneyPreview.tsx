"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { WalletRollerPicker } from "@/components/wallet/WalletRollerPicker";
import { EntryUndoCountdown } from "@/components/product/EntryUndoCountdown";
import styles from "./purchase-preview.module.css";

type Version = 1 | 2 | 3 | 4;
type Step = "choose" | "wallet" | "complete" | "gift";
type Overlay = "fund" | "purchase" | "options" | null;
const versions = [
  { id: 1, title: "Wallet return" },
  { id: 2, title: "One ticket" },
  { id: 3, title: "Quick popup" },
  { id: 4, title: "Two wheels" },
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

function Product() {
  return <div className={styles.product}>
    <Image src="/catalog/nintendo-switch-oled.jpg" alt="Nintendo Switch OLED" width={64} height={60} />
    <div><p className={styles.retailer}>BEST BUY</p><h2>Nintendo Switch – OLED Model</h2><p>$400 gift card · $1 applied per option</p></div>
  </div>;
}

function NumberWheel({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  const wheel = useRef<HTMLDivElement>(null);
  const name = useId();
  useEffect(() => { if (wheel.current) wheel.current.scrollTop = (value - min) * 40; }, [value, min]);
  return <div ref={wheel} className={styles.numberWheel} role="radiogroup" aria-label={label}>
    {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(number => <label key={number}>
      <input type="radio" name={name} aria-label={label + " " + number} checked={value === number} onChange={() => onChange(number)} /><span>{number}</span>
    </label>)}
  </div>;
}

function MoneySummary({ total, balance }: { total: number; balance: number }) {
  const shortfall = Math.max(0, total - balance);
  return <div className={styles.facts}>
    <div><span>Purchase total</span><strong>{usd(total)}</strong></div>
    <div><span>Preview wallet</span><strong>{usd(balance)}</strong></div>
    <div className={shortfall ? styles.shortfall : styles.covered}>{shortfall ? <strong>Please add {usd(shortfall)} to continue.</strong> : <strong>Your wallet covers this purchase.</strong>}</div>
  </div>;
}

function PreviewDialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const [top, setTop] = useState(130);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    close.current?.focus({ preventScroll: true });
    const header = document.querySelector("header.sticky");
    function position() { setTop(Math.max(12, (header?.getBoundingClientRect().height ?? 0) + 8)); }
    position();
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (header) observer?.observe(header);
    function keys(event: KeyboardEvent) {
      if (event.defaultPrevented) return; // The card wheel owns Escape while open.
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]') ?? []).filter(control => control.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
      observer?.disconnect();
      document.documentElement.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onClose]);
  return createPortal(<div className={styles.backdrop} style={{ "--preview-top": top + "px" } as CSSProperties} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="purchase-preview-dialog-title" className={styles.ticket + " " + styles.dialog}>
      <button ref={close} type="button" className={styles.close} onClick={onClose} aria-label="Close purchase preview popup">×</button>
      <h2 id="purchase-preview-dialog-title">{title}</h2>{children}
    </div>
  </div>, document.body);
}

function PurchaseConfirmation({ total, balance, quantity, declined, deposit, onUndo, onConfirm }: {
  total: number; balance: number; quantity: number; declined: number; deposit: number;
  onUndo: () => void; onConfirm: () => void;
}) {
  const [deadline] = useState(() => Date.now() + 30000);
  const [seconds, setSeconds] = useState(30);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(next);if (!next) onUndo();
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, onUndo]);
  return <>
    <Product />
    <p className={styles.ready}>{deposit ? usd(deposit) + " added. " : ""}Your wallet is ready.</p>
    <div className={styles.facts}>
      <div><span>Buying {quantity} gift {quantity === 1 ? "card" : "cards"}</span><strong>{usd(total)}</strong></div>
      <div><span>Wallet after purchase</span><strong>{usd(balance - total)}</strong></div>
    </div>
    <p className={styles.small}>{declined ? "Decline " + declined + " other " + (declined === 1 ? "offer" : "offers") + " only after the purchase succeeds." : "Other offers stay available."}</p>
    <div className={styles.countdown}><p>Confirm or undo.<small>Time runs out? Nothing is purchased.</small></p><EntryUndoCountdown seconds={seconds} /></div>
    <div className={styles.twoButtons}><button type="button" className={styles.secondary} onClick={onUndo}>Undo</button><button type="button" className={styles.primary} onClick={() => { if (Date.now() >= deadline) onUndo(); else onConfirm(); }}>Confirm purchase</button></div>
    <p className={styles.footnote}>Preview only · No real payment</p>
  </>;
}

export function PurchaseJourneyPreview({ initialVersion = 3 }: { initialVersion?: Version }) {
  // Preview state is isolated: no account store, server action, API or persistence.
  const [version, setVersion] = useState<Version>(initialVersion);
  const [step, setStep] = useState<Step>("choose");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selected, setSelected] = useState([1]);
  const [declined, setDeclined] = useState(2);
  const [declineAll, setDeclineAll] = useState(true);
  const [balance, setBalance] = useState(13900);
  const [startingBalance, setStartingBalance] = useState(13900);
  const [card, setCard] = useState("wells");
  const [deposit, setDeposit] = useState(0);
  const [notice, setNotice] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState("");
  const [navigation, setNavigation] = useState(0);
  const content = useRef<HTMLElement>(null);
  const submitted = useRef(false);
  const purchased = useRef(false);
  const optionsReturn = useRef<Overlay>(null);
  const total = selected.length * price;
  const shortfall = Math.max(0, total - balance);
  const amount = customAmount === "" ? shortfall : /^\d+$/.test(customAmount) ? Number(customAmount) * 100 : NaN;
  const currentCard = cards.find(item => item.value === card)!;
  const remaining = optionIds.length - selected.length;

  const closeOverlay = useCallback(() => {
    submitted.current = false;purchased.current = false;
    setOverlay(null);setNotice("Nothing purchased. Your wallet and choices are unchanged.");
  }, []);
  const closeOptions = useCallback(() => setOverlay(optionsReturn.current), []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = content.current;
      if (!target) return;
      const header = document.querySelector("header.sticky")?.getBoundingClientRect().height ?? 0;
      window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - header - 8), behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, navigation]);

  function restart(nextVersion = version, nextBalance = startingBalance) {
    setVersion(nextVersion);setStep("choose");setOverlay(null);setSelected([1]);setDeclined(2);setDeclineAll(true);
    setBalance(nextBalance);setDeposit(0);setNotice("");setCustomAmount("");setError("");
    submitted.current = false;purchased.current = false;
    setNavigation(value => value + 1);
    window.history.replaceState(null, "", "/account/purchase-preview?version=" + nextVersion);
  }
  function selectOptions(next: number[]) {
    if (!next.length) return;
    const nextRemaining = optionIds.length - next.length;
    setDeclined(value => declineAll ? nextRemaining : Math.min(value, nextRemaining));
    setSelected(next.sort());setNotice("");setError("");setCustomAmount("");submitted.current = false;
  }
  function quantity(next: number) {
    const kept = selected.slice(0, next);
    for (const id of optionIds) { if (kept.length === next) break;if (!kept.includes(id)) kept.push(id); }
    selectOptions(kept);
  }
  function begin() {
    submitted.current = false;purchased.current = false;setNotice("");
    if (!shortfall) setOverlay("purchase");
    else if (version === 1) setStep("wallet");
    else setOverlay("fund");
  }
  function addFunds() {
    if (submitted.current) return;
    if (!Number.isSafeInteger(amount) || amount < shortfall || amount < 100 || !Number.isSafeInteger(balance + amount)) { setError("Use a whole-dollar amount of at least " + usd(shortfall) + ".");return; }
    submitted.current = true;purchased.current = false;
    setBalance(value => value + amount);setDeposit(value => value + amount);setCustomAmount("");setError("");
    setStep("choose");setOverlay("purchase");setNotice(usd(amount) + " added. Your purchase is waiting.");
  }
  function complete() {
    if (overlay !== "purchase" || shortfall > 0 || purchased.current) return;
    purchased.current = true;setBalance(value => value - total);setOverlay(null);setStep("complete");setNotice("");
  }

  const declineChoice = remaining > 0 ? <label className={styles.check}><input type="checkbox" checked={declined === remaining} onChange={event => { setDeclineAll(event.target.checked);setDeclined(event.target.checked ? remaining : 0); }} /><span>Decline the other {remaining} {remaining === 1 ? "offer" : "offers"}<small>Only after purchase succeeds</small></span></label> : <p className={styles.small}>Buying all 3 options</p>;
  const chooser = version === 4 ? <div className={styles.dualWheels}>
    <div><h3>Buying</h3><NumberWheel label="Buying" min={1} max={3} value={selected.length} onChange={quantity} /></div>
    <div className={styles.wheelBridge}><strong>3</strong><span>options</span><small>{remaining - declined} kept</small></div>
    <div><h3>Declining</h3><NumberWheel label="Declining" min={0} max={remaining} value={declined} onChange={value => { setDeclined(value);setDeclineAll(value > 0 && value === remaining); }} /></div>
  </div> : <div className={styles.quantity}>
    <NumberWheel label="Buying" min={1} max={3} value={selected.length} onChange={quantity} />
    <div><h3>Buy {selected.length} gift {selected.length === 1 ? "card" : "cards"}</h3>{declineChoice}</div>
  </div>;
  const choices = <>{chooser}<div className={styles.optionLine}><span>{usd(price)} per purchase</span><button type="button" onClick={() => { optionsReturn.current = overlay;setOverlay("options"); }}>Choose options · {selected.join(", ")}</button></div>{version === 4 ? <p className={styles.wheelNote}>Declining happens only after purchase succeeds.</p> : null}</>;
  const funding = <div className={styles.funding}>
    <div className={styles.cardChoice}><WalletRollerPicker label="Current card in use" placeholder="Choose a card" value={card} options={cards} onChange={setCard} /></div>
    <details className={styles.custom}><summary>Add a different amount</summary><label>Whole dollars (USD)<input type="text" inputMode="numeric" value={customAmount} onChange={event => { setCustomAmount(event.target.value);setError(""); }} placeholder={"At least " + usd(shortfall)} /></label></details>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <button type="button" className={styles.primary} onClick={shortfall ? addFunds : begin}>{shortfall ? (Number.isFinite(amount) ? "Add " + usd(amount) : "Add funds") + (version === 1 ? " & return to purchase" : " to wallet") : "Review " + usd(total) + " purchase"}</button>
    <p className={styles.footnote}>{shortfall ? "Using " + currentCard.label + " •••• " + currentCard.detail.slice(-4) + ". Confirm purchase next." : "Nothing is purchased until you confirm."}</p>
  </div>;

  return <div className={styles.page}><div className={styles.shell}>
    <aside className={styles.previewBar} aria-label="Preview controls">
      <div className={styles.previewHeading}><strong>4 PURCHASE PREVIEWS</strong><span>Sample funds only</span></div>
      <nav className={styles.versions} aria-label="Choose a purchase walkthrough">{versions.map(item => <button type="button" key={item.id} aria-label={item.id + " " + item.title} aria-pressed={version === item.id} onClick={() => restart(item.id)}><span>{item.id}</span>{item.title}</button>)}</nav>
      <div className={styles.previewActions}><button type="button" onClick={() => restart()}>Start over</button><label>Wallet <select aria-label="Preview starting balance" value={startingBalance} onChange={event => { const value = Number(event.target.value);setStartingBalance(value);restart(version, value); }}><option value={13900}>$139</option><option value={0}>$0</option><option value={50000}>$500</option><option value={200000}>$2,000</option></select></label><Link href="/account/entries?filter=completion">Exit</Link></div>
    </aside>

    <section ref={content} className={styles.ticket + " " + styles.content} aria-label="Purchase walkthrough">
      {step === "complete" || step === "gift" ? <>
        <p className={styles.successTag}>PREVIEW PURCHASE COMPLETE</p><h1>{step === "gift" ? "Your sample gift card" : (selected.length === 1 ? "Your gift card is" : "Your gift cards are") + " ready."}</h1>
        {step === "gift" ? <div className={styles.gift}><p>BEST BUY</p><strong>$400</strong><span>{selected.length} separate gift {selected.length === 1 ? "card" : "cards"}</span><b>SAMPLE · NOT REDEEMABLE</b></div> : <Product />}
        <div className={styles.facts}><div><span>Paid from preview wallet</span><strong>{usd(total)}</strong></div><div><span>Wallet remaining</span><strong>{usd(balance)}</strong></div></div>
        <p className={styles.small}>{declined ? declined + " other " + (declined === 1 ? "offer was" : "offers were") + " declined after the simulated purchase." : "No other offers were declined."} {remaining - declined > 0 ? (remaining - declined) + " kept available." : ""}</p>
        {step !== "gift" ? <button type="button" className={styles.primary} onClick={() => setStep("gift")}>View gift {selected.length === 1 ? "card" : "cards"}</button> : null}
        <div className={styles.twoButtons}><button type="button" className={styles.secondary} onClick={() => restart()}>Try again</button><Link className={styles.secondary} href="/">Continue shopping</Link></div>
        <p className={styles.footnote}>Preview only · Your account is unchanged</p>
      </> : step === "wallet" ? <>
        <h1>Add funds</h1><Product /><MoneySummary total={total} balance={balance} />
        <div className={styles.walletChoice}><strong>Buying {selected.length}</strong>{declineChoice}</div>
        {funding}<button type="button" className={styles.backLink} onClick={() => setStep("choose")}>Back to purchase options</button>
      </> : <>
        <h1>Your 3 purchase options</h1><Product />
        {notice ? <p className={styles.status} role="status">{notice}</p> : null}
        {choices}<MoneySummary total={total} balance={balance} />
        {(version === 2 || version === 4) && shortfall > 0 ? funding : <><button type="button" className={styles.primary} onClick={begin}>{shortfall ? "Add " + usd(shortfall) + " to continue" : "Review " + usd(total) + " purchase"}</button><p className={styles.footnote}>{version === 3 ? "Choose a card in the popup. Confirm purchase separately." : "Your selections stay with you."}</p></>}
      </>}
    </section>
  </div>
    {overlay ? <PreviewDialog title={overlay === "options" ? "Choose your options" : overlay === "fund" ? "Add funds to continue" : "Confirm your purchase"} onClose={overlay === "options" ? closeOptions : closeOverlay}>
      {overlay === "options" ? <><Product /><p className={styles.small}>Choose the exact options to purchase. At least one must stay selected.</p><div className={styles.exact}>{optionIds.map(id => <button type="button" key={id} aria-label={"OPTION " + id} className={styles.ticket + " " + styles.option} aria-pressed={selected.includes(id)} onClick={() => selectOptions(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id])}><small>OPTION</small>{id}</button>)}</div><button type="button" className={styles.primary} onClick={closeOptions}>Use these options</button></> : overlay === "fund" ? <><Product />{choices}<MoneySummary total={total} balance={balance} />{funding}<button type="button" className={styles.backLink} onClick={closeOverlay}>Back to purchase options</button></> : <PurchaseConfirmation total={total} balance={balance} quantity={selected.length} declined={declined} deposit={deposit} onUndo={closeOverlay} onConfirm={complete} />}
    </PreviewDialog> : null}
  </div>;
}
