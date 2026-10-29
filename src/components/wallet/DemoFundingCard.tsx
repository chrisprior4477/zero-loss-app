"use client";

import { useState, type ReactNode } from "react";
import { demoCardFixture, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import { DemoCardArtwork } from "./DemoCardArtwork";
import styles from "./wallet-overview.module.css";

export function DemoFundingCard({ token, selected, saved, artwork, children, actions, confirmation }: { token: DemoCardToken; selected: boolean; saved: boolean; artwork?: Artwork; children: ReactNode; actions: ReactNode; confirmation?: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  const [back, setBack] = useState(false);
  const fixture = demoCardFixture(token)!;
  return <article id={`sample-payment-${token}`} tabIndex={-1} className={styles.demoCard} data-selected={selected}>
    <div className={styles.demoCardTop}><strong>{fixture.issuer}</strong><span>{saved ? "SAVED" : "NEW SAMPLE"}</span></div>
    <p className={styles.demoCardMeta}>Sample card •••• {fixture.lastFour} · Expires {fixture.expiry}</p>
    {children}
    <div className={styles.cardFooter}><button type="button" className={styles.seeCard} aria-expanded={flipped} aria-controls={`sample-art-${token}`} onClick={() => setFlipped(value => !value)}>{flipped ? "Hide card" : "See card"}</button>{actions}</div>
    {confirmation}
    <div id={`sample-art-${token}`} hidden={!flipped} className={styles.cardPreview}><DemoCardArtwork token={token} artwork={artwork} back={back} /><button type="button" className={styles.cardSide} onClick={() => setBack(value => !value)}>See {back ? "front" : "back"}</button></div>
  </article>;
}
