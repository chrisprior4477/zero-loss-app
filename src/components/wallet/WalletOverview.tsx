import Image from "next/image";
import Link from "next/link";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { DemoFundingForm, DemoFundingRequests } from "./DemoFundingForm";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import type { DemoCard } from "@/lib/payments/demo-card";
import { AccountIcon } from "@/components/account/AccountIcon";
import { WalletLedger } from "./WalletLedger";
import styles from "./wallet-overview.module.css";

export function WalletOverview({ wallet, fundingEnabled = false, requestKey = "", requests = null, savedCard = null, cardUnavailable = false }: { wallet: WalletSnapshot | null; fundingEnabled?: boolean; requestKey?: string; requests?: DemoFundingRequest[] | null; savedCard?: DemoCard | null; cardUnavailable?: boolean }) {
  const demo = wallet?.scope === "demo";
  const balance = wallet ? (wallet.balanceCents === 0 ? "$0.00" : formatUsdFromCents(wallet.balanceCents)) : "Unavailable";
  const pendingCents = requests?.filter(request => request.reconciliation === "credit_pending").reduce((sum, request) => sum + request.amount, 0) ?? 0;
  const recentCount = wallet?.entries.length ?? 0;
  const canFund = Boolean(fundingEnabled && demo && wallet?.fundingAvailable);

  return <main className={styles.page}>
    <div className={styles.shell}>
      <div className={styles.topline}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/account">My Account</Link><span aria-hidden="true">›</span><span>Wallet &amp; Transactions</span></nav>
        <nav aria-label="Wallet sections" className={styles.walletSections}><Link href="/account/wallet">Your prizes</Link><Link href="/account/wallet?view=history" aria-current="page">Funds &amp; history</Link></nav>
      </div>
      <header className={styles.hero}>
        <div className={styles.heroCopy}><h1>Playable Wallet</h1><p>Manage your balance and view your transactions.</p></div>
        <div className={styles.heroStatement}><strong>REAL PRODUCTS<br />FUELED BY REAL PEOPLE.</strong><span>Add funds. Enter products. Make progress.</span></div>
        <Image className={styles.heroArt} src="/account/playable-wallet-hero-v1.png" alt="Zero Loss leather wallet" width={1536} height={1024} priority sizes="(max-width: 800px) 0px, 360px" />
      </header>

      <section className={styles.summaryGrid} aria-label="Wallet summary">
        <article className={styles.balanceCard} aria-label="Current balance">
          <div><h2>Current balance</h2><p data-testid="wallet-balance" className={styles.balance}>{balance}</p><p>{wallet ? "Your playable wallet balance." : "Balance could not be verified."}</p></div>
          <div className={styles.balanceActions}>
            {canFund ? <a href="#add-funds" className={styles.primaryAction}><AccountIcon name="wallet" />Add funds<AccountIcon name="arrow" /></a> : <button disabled type="button" className={styles.primaryAction}><AccountIcon name="wallet" />Add funds<AccountIcon name="arrow" /></button>}
            <a href="#transactions" className={styles.secondaryAction}><AccountIcon name="layers" />View transactions</a>
          </div>
        </article>
        <article className={styles.statCard}><span className={`${styles.statIcon} ${styles.available}`}><AccountIcon name="wallet" /></span><h2>Available</h2><strong>{balance}</strong><p>Ready to use for entries.</p></article>
        <article className={styles.statCard}><span className={styles.statIcon}><AccountIcon name="active" /></span><h2>Pending</h2><strong>{formatUsdFromCents(pendingCents)}</strong><p>Funds in progress.</p></article>
        <article className={styles.statCard}><span className={styles.statIcon}><AccountIcon name="all" /></span><h2>Recent activity</h2><strong>{recentCount}</strong><p>Posted ledger transactions.</p></article>
      </section>

      <section id="transactions" className={styles.transactions} aria-labelledby="transactions-heading">
        <div className={styles.sectionHeading}><div><h2 id="transactions-heading">Transaction history</h2><p>Posted activity from this account’s ledger.</p></div>{wallet ? <span>Showing {wallet.entries.length} of {wallet.transactionCount} transactions</span> : null}</div>
        {!wallet ? <div role="alert" className={styles.alert}>We couldn’t load your wallet. Balance and transaction history are unavailable. Refresh to try again.</div> : <WalletLedger entries={wallet.entries} />}
        {wallet && wallet.transactionCount > 50 ? <p className={styles.finePrint}>Latest 50 of {wallet.transactionCount} transactions. Balance includes all posted transactions.</p> : null}
      </section>

      <section id="add-funds" className={styles.funding} aria-labelledby="funding-heading">
        <div className={styles.sectionHeading}><div><h2 id="funding-heading">Add funds</h2><p>Use the preview payment flow to add playable balance.</p></div><span>{demo ? "Demo payment" : "Funding"}</span></div>
        {canFund ? <DemoFundingForm requestKey={requestKey} walletId={wallet!.walletAccountId!} savedCard={savedCard} cardUnavailable={cardUnavailable} blocked={requests === null || requests.some(request => request.reconciliation !== "reconciled")} /> : <div className={styles.unavailable}><p>Funding is not available for this account.</p></div>}
        {demo ? <DemoFundingRequests requests={requests} fundingEnabled={fundingEnabled} /> : null}
      </section>
    </div>
  </main>;
}
