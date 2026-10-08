import Image from "next/image";
import Link from "next/link";
import type { LedgerEntryRow, WalletSnapshot } from "@/lib/wallet/snapshot";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { readyWalletRewards, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { DemoFundingForm, DemoFundingRequests } from "./DemoFundingForm";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";
import type { DemoCard } from "@/lib/payments/demo-card";
import { AccountIcon } from "@/components/account/AccountIcon";
import { StatusTicket } from "@/components/account/StatusTicket";
import stripStyles from "@/components/account/account-status-strip.module.css";
import { WalletLedger } from "./WalletLedger";
import { DeleteAllFundsButton } from "./DeleteAllFundsButton";
import styles from "./wallet-overview.module.css";
import type { SelectedTransaction } from "@/lib/wallet/selected-transaction";

export function WalletOverview({ wallet, ledgerEntries, activity, selectedTransaction, fundingEnabled = false, requestKey = "", requests = null, savedCard = null, savedCards, cardUnavailable = false, returnToProduct, returnUnavailable = false }: {
  wallet: WalletSnapshot | null;
  ledgerEntries?: LedgerEntryRow[] | null;
  activity?: AccountActivity;
  selectedTransaction?: SelectedTransaction;
  fundingEnabled?: boolean;
  requestKey?: string;
  requests?: DemoFundingRequest[] | null;
  savedCard?: DemoCard | null;
  savedCards?: DemoCard[];
  cardUnavailable?: boolean;
  returnToProduct?: { title: string; href: string; label?: "Back to purchase option" };
  returnUnavailable?: boolean;
}) {
  const demo = wallet?.scope === "demo";
  const balance = wallet ? (wallet.balanceCents === 0 ? "$0.00" : formatUsdFromCents(wallet.balanceCents)) : "Unavailable";
  const pendingCents = requests?.filter(request => request.reconciliation === "credit_pending").reduce((sum, request) => sum + request.amount, 0);
  const recentCount = wallet?.entries.length;
  const canFund = Boolean(fundingEnabled && demo && wallet?.fundingAvailable);
  const ready = activity && activity.source !== "unavailable" ? readyWalletRewards(activity) : null;
  const optionCount = activity && activity.source !== "unavailable" ? activity.activity.filter(item => item.status === "completion").length : null;
  const rewardHref = ready?.length === 1 ? walletRewardHref(ready[0]) : accountRoutes.rewards;

  return <main className={styles.page}>
    <div className={styles.shell}>
      <nav aria-label="Account wallet overview" className={stripStyles.row}>
        <StatusTicket size="top" variant="wallet" label="Playable Wallet" value={balance} action="Add funds" href="/account/wallet?view=history#balance" actionHref={canFund ? "/account/wallet?view=history#add-funds" : undefined} actionDisabled={!canFund} />
        <StatusTicket size="top" variant="reward" label="Prize Ready" value={ready === null ? "Unavailable" : String(ready.length)} action={ready?.length === 1 ? "View reward" : "View rewards"} href={rewardHref} />
        <StatusTicket size="top" variant="option" label="Purchase Options" value={optionCount === null ? "Unavailable" : String(optionCount)} action="Review options" href={accountRoutes.purchaseOptions} />
      </nav>

      <header className={styles.hero}>
        <div><h1>Playable Wallet</h1><p>Your balance and every move, all in one place.</p></div>
        <nav aria-label="Wallet sections" className={styles.walletSections}><Link href="/account/wallet">Gift Cards &amp; Rewards</Link><Link href="/account/wallet?view=history" aria-current="page">Funds &amp; history</Link></nav>
      </header>

      <section className={styles.summaryGrid} aria-label="Wallet summary">
        <article id="balance" className={`${styles.ticketPanel} ${styles.balanceCard}`} aria-label="Current balance">
          <div className={styles.balanceArt}><Image src="/account/drawer/wallet-transactions-324x180.png" alt="Zero Loss leather wallet" width={324} height={180} priority sizes="324px" /></div>
          <div className={styles.balanceCopy}>
            <h2>Current balance</h2>
            <div className={styles.balanceAmountRow}>
              <p data-testid="wallet-balance" className={styles.balance}>{balance}</p>
              {canFund ? <DeleteAllFundsButton value={balance} /> : null}
            </div>
            <p className={styles.balanceNote}>{wallet ? "Ready to use for entries." : "Balance could not be verified."}</p>
            <div className={styles.balanceActions}>
              <a href="#add-funds" className={styles.primaryAction}>Add funds<AccountIcon name="arrow" /></a>
              <div className={styles.fundingActions}>
                {canFund ? <Link href="/account/payment-methods" className={styles.cardAction}><AccountIcon name="wallet" />Add Card</Link> : <button disabled type="button" className={styles.cardAction}><AccountIcon name="wallet" />Add Card</button>}
                {canFund ? <Link href="/account/payment-methods" className={styles.cardAction}><AccountIcon name="layers" />View payment methods</Link> : <button disabled type="button" className={styles.cardAction}><AccountIcon name="layers" />View payment methods</button>}
              </div>
              <a href="#transactions" className={styles.transactionsLink}>View transactions <AccountIcon name="arrow" /></a>
            </div>
          </div>
        </article>
        <article className={`${styles.ticketPanel} ${styles.walletSummary}`} aria-labelledby="wallet-summary-heading">
          <h2 id="wallet-summary-heading">Wallet summary</h2>
          <div className={styles.summaryRow}><span className={styles.statIcon} data-tone="available"><AccountIcon name="wallet" /></span><span><small>Available</small><strong>{balance}</strong></span></div>
          <div className={styles.summaryRow}><span className={styles.statIcon} data-tone="pending"><AccountIcon name="active" /></span><span><small>Pending</small><strong>{pendingCents === undefined ? "—" : formatUsdFromCents(pendingCents)}</strong></span></div>
          <div className={styles.summaryRow}><span className={styles.statIcon} data-tone="activity"><AccountIcon name="all" /></span><span><small>Recent activity</small><strong>{recentCount ?? "—"}</strong></span></div>
        </article>
      </section>

      <section id="transactions" className={styles.transactions} aria-labelledby="transactions-heading">
        <div className={styles.sectionHeading}><div><h2 id="transactions-heading">Transaction history</h2><p>Posted activity from this account’s ledger.</p></div></div>
        {selectedTransaction?.requested && !selectedTransaction.entry ? <p role="status" className={styles.alert}>That transaction could not be opened for this account. Your available history is shown below.</p> : null}
        {selectedTransaction?.entry && !(ledgerEntries ?? wallet?.entries)?.some(entry => entry.id === selectedTransaction.entry?.id) ? <section aria-label="Selected older transaction" className={styles.olderTransaction}><h3>Selected transaction · older than your recent history</h3><WalletLedger compact entries={[selectedTransaction.entry]} selectedId={selectedTransaction.entry.id} /></section> : null}
        {!wallet ? <div role="alert" className={styles.alert}>We couldn’t load your wallet. Balance and transaction history are unavailable. Refresh to try again.</div> : <WalletLedger entries={ledgerEntries ?? wallet.entries} totalCount={wallet.transactionCount} selectedId={selectedTransaction?.entry?.id} />}
        {wallet && !ledgerEntries && wallet.transactionCount > wallet.entries.length ? <p className={styles.finePrint}>Only the latest {wallet.entries.length} transactions could be loaded. Refresh to try the full history again. Balance includes all posted transactions.</p> : null}
      </section>

      <section id="add-funds" className={`${styles.ticketPanel} ${styles.funding}`} aria-labelledby="funding-heading">
        <div className={styles.sectionHeading}><div><h2 id="funding-heading">Add funds</h2><p>{canFund ? "Choose an amount and confirm your preview deposit." : "Add playable balance when funding is available for your account."}</p></div><span className={styles.fundingBadge}>{demo ? "Demo payment" : "Funding"}</span></div>
        {returnToProduct ? <div className={styles.fundingReturn}><p>{returnToProduct.title}</p><Link href={returnToProduct.href}>{returnToProduct.label ?? "Back to this prize"} <span aria-hidden="true">→</span></Link></div> : null}
        {returnUnavailable ? <p role="status" className={styles.fundingReturn}>We couldn’t find that purchase option in your account. <Link href="/account/entries?filter=completion">View your purchase options →</Link></p> : null}
        {canFund ? <DemoFundingForm requestKey={requestKey} walletId={wallet!.walletAccountId!} savedCard={savedCard} savedCards={savedCards} cardUnavailable={cardUnavailable} blocked={requests === null || requests.some(request => request.reconciliation !== "reconciled")} continueTo={returnToProduct} /> : <div className={styles.unavailable}><div><h3>Add funds is unavailable</h3><p>This account cannot start a deposit right now. Your balance and payment history remain available above.</p></div><button type="button" aria-label="Add funds unavailable" disabled>Add funds</button></div>}
        {demo ? <DemoFundingRequests requests={requests} fundingEnabled={fundingEnabled} continueTo={returnToProduct} /> : null}
      </section>
    </div>
  </main>;
}
