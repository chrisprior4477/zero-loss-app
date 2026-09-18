import Link from "next/link";
import { walletHistoryHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";

export function PlayableBalanceCard({ balanceLabel, fundingEnabled = false, compact = false, onNavigate }: {
  balanceLabel: string | null; fundingEnabled?: boolean; compact?: boolean; onNavigate?: () => void;
}) {
  return <article aria-label="Playable Wallet" className={`h-full min-w-0 rounded-2xl border border-cyan-300/20 bg-[#0c3b5d] ${compact ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-3" : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 lg:flex lg:flex-col lg:items-stretch"}`}>
    <Link href={walletHistoryHref} onClick={onNavigate} className={`${compact ? "col-start-1 row-start-1 row-span-2 min-w-0" : "block"} rounded-lg focus-visible:outline-2 focus-visible:outline-cyan-300`}>
      <h2 className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Playable Wallet</h2>
      <p data-testid={compact ? "drawer-balance" : "dashboard-balance"} className={`mt-1 font-black tabular-nums tracking-tight text-white ${compact ? "break-words text-2xl" : "text-3xl"}`}>{balanceLabel ?? "Unavailable"}</p>
      {!compact ? <p className="mt-1 hidden text-sm text-[#b5cce4] sm:block">Funds available for entries</p> : null}
    </Link>
    <div className={compact ? "contents" : "flex flex-wrap items-center justify-end gap-2 lg:mt-auto lg:justify-between lg:pt-2"}>
      {fundingEnabled ? <Link href={`${walletHistoryHref}#add-funds`} onClick={onNavigate} className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-[#31e800] px-4 text-sm font-black text-[#002719] ${compact ? "col-start-2 row-start-1 row-span-2" : ""}`}>Add funds</Link> : <button type="button" disabled title="Funding is not available" className={`min-h-11 cursor-not-allowed rounded-xl bg-[#31e800] px-4 text-sm font-black text-[#002719] ${compact ? "col-start-2 row-start-1 row-span-2" : ""}`}>Add funds</button>}
      {!compact ? <Link href={walletHistoryHref} onClick={onNavigate} className="hidden min-h-11 items-center gap-1 rounded-lg text-sm font-bold text-cyan-300 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 sm:inline-flex">View transactions <span aria-hidden="true">›</span></Link> : null}
    </div>
  </article>;
}

export function MyZeroLossSummary({ state, compact = false, onNavigate }: { state: AccountActivity; compact?: boolean; onNavigate?: () => void }) {
  const available = state.source !== "unavailable";
  const counts = available ? {
    total: state.activity.length,
    open: state.activity.filter(item => item.status === "active").length,
    won: state.activity.filter(item => item.status === "prize").length,
    options: state.activity.filter(item => item.status === "completion").length,
  } : null;
  return <Link href="/account/entries" onClick={onNavigate} aria-label="My Activity — See every entry and outcome" data-activity-source={state.source}
    className={`group h-full min-w-0 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,#133e64,#232f63)] transition hover:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${compact ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-3" : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 p-4 lg:flex lg:flex-col lg:items-stretch"}`}>
    <h2 className={`text-xs font-black uppercase tracking-[0.14em] text-cyan-300 ${compact ? "col-start-1 row-start-1" : ""}`}>My Activity</h2>
    <p className={`font-black tracking-tight text-white ${compact ? "col-start-1 row-start-2 text-base" : "mt-1 text-3xl"}`}>{counts ? `${counts.total} ${counts.total === 1 ? "item" : "items"}` : "Unavailable"}</p>
    <p className={`mt-1 leading-5 text-[#b5cce4] ${compact ? "col-span-2 row-start-3 text-xs" : "col-span-2 text-xs sm:text-sm lg:col-auto"}`}>{counts ? `${counts.open} open · ${counts.won} won · ${counts.options} purchase ${counts.options === 1 ? "option" : "options"}` : "We can’t verify your activity right now."}</p>
    <span className={`${compact ? "col-start-2 row-start-1 row-span-2 text-xs" : "col-start-2 row-start-1 row-span-2 text-sm lg:mt-auto lg:block lg:pt-2"} font-bold text-cyan-300 group-hover:text-white`}>View activity <span aria-hidden="true">→</span></span>
  </Link>;
}

export function PurchaseOptionsSummary({ state, compact = false, onNavigate }: { state: AccountActivity; compact?: boolean; onNavigate?: () => void }) {
  const count = state.source === "unavailable" ? null : state.activity.filter(item => item.status === "completion").length;
  return <Link href={accountRoutes.purchaseOptions} onClick={onNavigate} aria-label="Purchase Options — Review optional retailer gift cards" data-activity-source={state.source}
    className={`group h-full min-w-0 rounded-2xl border border-[#ffd633]/45 bg-[linear-gradient(135deg,#46380b,#27231b)] transition hover:border-[#ffe05a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe05a] ${compact ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-3" : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 p-4 lg:flex lg:flex-col lg:items-stretch"}`}>
    <h2 className={`text-xs font-black uppercase tracking-[0.14em] text-[#ffe05a] ${compact ? "col-start-1 row-start-1" : ""}`}>Purchase Options</h2>
    <p className={`font-black tracking-tight text-white ${compact ? "col-start-1 row-start-2 text-base" : "mt-1 text-3xl"}`}>{count === null ? "Unavailable" : count}</p>
    <p className={`mt-1 leading-5 text-[#eadca8] ${compact ? "col-span-2 row-start-3 text-xs" : "col-span-2 text-xs sm:text-sm lg:col-auto"}`}>{count === null ? "We can’t verify your options right now." : count === 1 ? "One optional retailer gift-card choice" : `${count} optional retailer gift-card choices`}</p>
    <span className={`${compact ? "col-start-2 row-start-1 row-span-2 text-xs" : "col-start-2 row-start-1 row-span-2 text-sm lg:mt-auto lg:block lg:pt-2"} font-bold text-[#ffe05a] group-hover:text-white`}>Review now <span aria-hidden="true">→</span></span>
  </Link>;
}
