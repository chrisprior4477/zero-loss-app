import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { DemoFundingForm, DemoFundingRequests } from "./DemoFundingForm";
import type { DemoFundingRequest } from "@/lib/payments/demo-provider";

export function WalletOverview({ wallet, fundingEnabled = false, requestKey = "", requests = null }: { wallet: WalletSnapshot | null; fundingEnabled?: boolean; requestKey?: string; requests?: DemoFundingRequest[] | null }) {
  const demo = wallet?.scope === "demo";
  const balance = wallet ? (wallet.balanceCents === 0 ? "$0.00" : formatUsdFromCents(wallet.balanceCents)) : "Unavailable";
  return <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)]">
    <section id="add-funds" className="scroll-mt-48 rounded-3xl border border-[#31e800]/20 bg-[linear-gradient(135deg,#073453,#063c38)] p-6 sm:p-7" aria-label="Playable Wallet">
      <h2 className="text-xs font-black uppercase tracking-widest text-[#b5cce4]">Playable Wallet</h2>
      <p data-testid="wallet-balance" className="mt-3 break-words text-4xl font-black tabular-nums text-[#31e800] sm:text-5xl">{balance}</p>
      <p className="mt-2 text-xs text-[#b5cce4]">USD · {wallet ? "Database ledger balance" : "Balance could not be verified"}</p>
      {fundingEnabled && demo && wallet?.fundingAvailable ? <DemoFundingForm requestKey={requestKey} walletId={wallet.walletAccountId!} blocked={requests === null || requests.some(request => request.reconciliation !== "reconciled")} /> : <>
      <button disabled type="button" className="mt-6 min-h-12 w-full cursor-not-allowed rounded-xl bg-[#31e800] px-5 text-sm font-black text-[#002719]">Add funds</button>
      <p className="mt-3 text-sm font-bold text-white">Funding is not available for this account.</p></>}
    </section>
    <section aria-labelledby="transactions-heading">
      <h2 id="transactions-heading" className="text-xl font-bold text-white">Transaction history</h2>
      <p className="mt-2 text-sm text-[#b5cce4]">Posted activity from this account’s ledger.</p>
      {!wallet ? <div role="alert" className="mt-5 rounded-2xl border border-orange-300/25 bg-orange-300/5 p-5 text-sm leading-6 text-orange-100">We couldn’t load your wallet. Balance and transaction history are unavailable. Refresh to try again.</div> : wallet.entries.length === 0 ? <div className="mt-5 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h3 className="font-bold text-white">No transactions yet</h3><p className="mt-2 text-sm leading-6 text-[#b5cce4]">Nothing has been added or spent. Your first posted transaction will appear here.</p></div> : <ul className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-[#06223d]">
        {wallet.entries.map(entry => <li key={entry.id} className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0"><p className="font-bold text-white">{({ DEPOSIT: "Funds added", ENTRY_DEBIT: "Entry purchase", REFUND: "Refund", CORRECTION: "Adjustment" } as Record<string, string>)[entry.entry_type] ?? "Wallet transaction"}</p><p className="mt-1 text-xs text-[#b5cce4]">{new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(entry.created_at))} · Posted</p><p className="mt-1 break-all text-[10px] text-[#9bb3ce]">{entry.id}</p></div>
          <p className={`shrink-0 font-bold tabular-nums ${entry.amount > 0 ? "text-[#31ff83]" : "text-white"}`}>{entry.amount > 0 ? "+" : ""}{formatUsdFromCents(entry.amount)}</p>
        </li>)}
      </ul>}
      {wallet && wallet.transactionCount > 50 ? <p className="mt-3 text-xs text-[#b5cce4]">Latest 50 of {wallet.transactionCount} transactions. Balance includes all posted transactions.</p> : null}
      {demo ? <DemoFundingRequests requests={requests} fundingEnabled={fundingEnabled} /> : null}
    </section>
  </div>;
}
