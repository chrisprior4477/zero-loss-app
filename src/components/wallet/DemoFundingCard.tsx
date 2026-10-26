"use client";

import { useState, type ReactNode } from "react";
import { demoCardFixture, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { DemoCardArtwork } from "./DemoCardArtwork";
import styles from "./wallet-overview.module.css";

export function DemoFundingCard({ token, selected, saved, artwork, children, actions }: { token: DemoCardToken; selected: boolean; saved: boolean; artwork?: Artwork; children: ReactNode; actions: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  const [back, setBack] = useState(false);
  const fixture = demoCardFixture(token)!;
  return <article id={`sample-payment-${token}`} tabIndex={-1} className={styles.demoCard} data-selected={selected}>
    <div className={styles.demoCardTop}><strong>Test card •••• {fixture.lastFour}</strong><button type="button" className={styles.seeCard} aria-expanded={flipped} aria-controls={`sample-art-${token}`} onClick={() => setFlipped(value => !value)}>{flipped ? "Card details" : "See card"}</button></div>
    <div className={styles.cardFlip} data-flipped={flipped}>
      <div className={styles.cardInfoFace} aria-hidden={flipped} inert={flipped}><p className={styles.demoCardNumber}>{fixture.number}</p><p className={styles.demoCardMeta}>Expires {fixture.expiry} · Sample security code {fixture.code}</p>{children}</div>
      <div id={`sample-art-${token}`} className={styles.cardArtFace} aria-hidden={!flipped} inert={!flipped}><DemoCardArtwork token={token} artwork={artwork} back={back} /><button type="button" className={styles.cardSide} onClick={() => setBack(value => !value)}>See {back ? "front" : "back"}</button></div>
    </div>
    <div className={styles.cardFooter}><span>{saved ? "SAVED" : "NEW SAMPLE"}</span>{actions}</div>
  </article>;
}
