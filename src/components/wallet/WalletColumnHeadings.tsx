import styles from "./wallet-overview.module.css";

export function WalletColumnHeadings() {
  return <div className={styles.walletColumnHeadings} aria-hidden="true"><span>Most recent ↓</span><span>Earlier ↓</span></div>;
}
