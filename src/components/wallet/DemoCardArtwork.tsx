import type { CSSProperties } from "react";
import { AccountIcon } from "@/components/account/AccountIcon";
import { DEMO_CARD_COLORS, demoCardFixture, type DemoCardArtwork as Artwork, type DemoCardToken } from "@/lib/payments/demo-card";
import styles from "./demo-card-artwork.module.css";

export function DemoCardArtwork({ token, artwork, back = false, cardholder = "DEMO CUSTOMER" }: { token: DemoCardToken; artwork?: Artwork; back?: boolean; cardholder?: string }) {
  const fixture = demoCardFixture(token)!;
  const colors = (artwork ?? [0, 2, 0, 1, 0, 2, 0, 1]).slice(back ? 4 : 0, back ? 8 : 4);
  const paint = Object.fromEntries(colors.map((color, index) => [`--card-color-${index}`, DEMO_CARD_COLORS[color]])) as CSSProperties;
  return <div className={styles.frame} role="img" aria-label={`Sample card ${back ? "back" : "front"}, ending ${fixture.lastFour}`}>
    <div className={styles.card} style={paint} data-back={back}>
      <div className={styles.top}><strong>ZERO LOSS</strong><AccountIcon name="wallet" /></div>
      {back ? <><div className={styles.stripe} /><div className={styles.signature}><span>DEMO CUSTOMER</span><b>{fixture.code}</b></div><p className={styles.backNote}>Sample security code · No real payment</p></> : <><span className={styles.chip} /><p className={styles.number}>{fixture.number}</p><div className={styles.bottom}><span><small>Cardholder</small>{cardholder}</span><span><small>Expires</small>{fixture.expiry}</span></div></>}
      <span className={styles.sample}>SAMPLE · NOT A PAYMENT CARD</span>
    </div>
  </div>;
}
