import Link from "next/link";
import { walletHistoryHref, walletRewardHref, walletRewards, type AccountActivity } from "@/lib/account/activity";
import { AccountIcon } from "./AccountIcon";
import styles from "./drawer.module.css";

/** Navigation shortcuts only; amounts and ownership remain server-authorized. */
export function DrawerOverview({ state, balanceLabel, fundingEnabled, onNavigate }: {
  state: AccountActivity; balanceLabel: string | null; fundingEnabled: boolean; onNavigate: () => void;
}) {
  const rewards = walletRewards(state);
  const count = state.source === "unavailable" ? null : rewards.length;
  const single = count === 1 ? rewards[0] : null;
  return <div aria-label="Your Zero Loss overview" className={styles.overview}>
    <article aria-label="Playable Wallet" className={styles.summary}>
      <Link href={walletHistoryHref} onClick={onNavigate} className={styles.summaryInfo}>
        <span className={styles.summaryIcon}><AccountIcon name="wallet" /></span>
        <span className={styles.summaryText}><span className={styles.summaryLabel}>Playable Wallet</span><strong className={styles.summaryValue} data-testid="drawer-balance">{balanceLabel ?? "Unavailable"}</strong></span>
      </Link>
      {fundingEnabled ? <Link href={`${walletHistoryHref}#add-funds`} onClick={onNavigate} className={styles.primaryAction}>Add funds<AccountIcon name="arrow" /></Link> : <button type="button" disabled title="Funding is not available" className={styles.primaryAction}>Add funds<AccountIcon name="arrow" /></button>}
    </article>
    <Link href={single ? walletRewardHref(single) : "/account/wallet"} onClick={onNavigate} aria-label={`Prize Ready — ${count === null ? "Reward count unavailable" : `${count} ${count === 1 ? "reward" : "rewards"}`}`} className={`${styles.summary} ${styles.reward}`}>
      <span className={styles.summaryInfo}><span className={styles.summaryIcon}><AccountIcon name="gift" /></span><span className={styles.summaryText}><span className={styles.summaryLabel}>Prize Ready</span><strong className={styles.summaryValue}>{count === null ? "Unavailable" : count}<span className="sr-only">{count === null ? "" : " ready"}</span></strong></span></span>
      <span className={styles.primaryAction}>{single ? "Show barcode" : "View rewards"}<AccountIcon name="arrow" /></span>
    </Link>
    <Link href="/account/entries" onClick={onNavigate} aria-label="Items in Play — See every entry and outcome" className={styles.summary}>
      <span className={styles.summaryInfo}><span className={styles.summaryIcon}><AccountIcon name="layers" /></span><span className={styles.summaryText}><span className={styles.summaryLabel}>Items in Play</span><strong className={styles.summaryValue}>{state.source === "unavailable" ? "Unavailable" : state.activity.length}</strong></span></span>
      <span className={styles.secondaryAction}>View activity<AccountIcon name="arrow" /></span>
    </Link>
  </div>;
}
