"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_CARD_FIXTURES, type DemoCard, type DemoCardToken } from "@/lib/payments/demo-card";
import { DemoCardManager } from "./DemoCardManager";
import { DemoFundingCard } from "./DemoFundingCard";
import styles from "./wallet-overview.module.css";

export function WalletPaymentMethods({ savedCards, displayName, enabled, unavailable, onFund }: { savedCards: DemoCard[]; displayName: string; enabled: boolean; unavailable: boolean; onFund: (token: DemoCardToken) => void }) {
  const router = useRouter();
  const [cards, setCards] = useState(savedCards);
  const [previousCards, setPreviousCards] = useState(savedCards);
  if (savedCards !== previousCards) { setPreviousCards(savedCards); setCards(savedCards); }
  const [editing, setEditing] = useState<DemoCardToken | null>(null);
  const [message, setMessage] = useState("");
  function edit(token: DemoCardToken | null) {
    setEditing(token);
    requestAnimationFrame(() => document.getElementById("wallet-content")?.scrollIntoView({ block: "start" }));
  }
  const next = DEMO_CARD_FIXTURES.find(f => !cards.some(c => c.token === f.token));
  if (editing) return <DemoCardManager key={editing} embedded compact initialToken={editing} displayName={displayName} savedCards={cards} savedCard={cards.find(c => c.isDefault) ?? cards[0]} enabled={enabled} cardUnavailable={unavailable} onCancel={() => edit(null)} onSaved={card => {
    setCards(previous => [...previous.filter(c => c.token !== card.token).map(c => card.isDefault ? { ...c, isDefault: false } : c), card]);
    edit(null); setMessage("Sample card saved."); router.refresh();
  }} />;
  return <section className={`${styles.ticketPanel} ${styles.methods}`} aria-labelledby="payment-methods-heading">
    <div className={styles.sectionHeading}><div><h2 id="payment-methods-heading">Payment Methods</h2><p>Your saved cards, ready when you need them.</p></div></div>
    {message ? <p role="status" className={styles.methodNotice}>{message}</p> : null}
    {unavailable ? <p role="alert">Your saved cards could not be loaded. Refresh before making changes.</p> : null}
    {!next ? <p className={styles.methodNotice}>All four sample cards are available. Use a saved card or edit its sample artwork below. Camera changes update the selected sample card.</p> : <button type="button" className={styles.primaryAction} disabled={!enabled || unavailable} onClick={() => edit(next.token)}>Add card</button>}
    <div className={styles.demoCardsGrid}>{cards.map(card => <DemoFundingCard key={card.token} idPrefix="wallet-method" token={card.token} selected={card.isDefault} saved artwork={card.artwork} actions={<button type="button" disabled={!enabled || unavailable} onClick={() => edit(card.token)}>Edit card / artwork</button>}>
      <p>{card.isDefault ? "Default payment method" : "Saved sample card"}</p>
      <button type="button" className={styles.cardAction} disabled={!enabled || unavailable} onClick={() => onFund(card.token)}>Use this card</button>
    </DemoFundingCard>)}</div>
    {!cards.length && !unavailable ? <p>No saved cards yet. Add a supplied sample card to get started.</p> : null}
  </section>;
}
