import Link from "next/link";
import { walletHistoryHref, type AccountActivity } from "@/lib/account/activity";

export function PlayableBalanceCard({ balanceLabel, isDemoWallet = false, fundingEnabled = false, compact = false, onNavigate }: {
  balanceLabel: string | null; isDemoWallet?: boolean; fundingEnabled?: boolean; compact?: boolean; onNavigate?: () => void;
}) {
  return <article aria-label="Playable balance" className={`h-full min-w-0 rounded-2xl border border-cyan-300/20 bg-[#0c3b5d] ${compact ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-3" : "flex flex-col p-4"}`}>
    <h2 className={`text-xs font-black uppercase tracking-[0.14em] text-cyan-300 ${compact ? "col-start-1 row-start-1" : ""}`}>{isDemoWallet ? "Demo playable balance" : "Playable balance"}</h2>
    <p data-testid={compact ? "drawer-balance" : "dashboard-balance"} className={`mt-1 font-black tabular-nums tracking-tight text-white ${compact ? "col-start-1 row-start-2 break-words text-2xl" : "text-3xl"}`}>{balanceLabel ?? "Unavailable"}</p>
    {!compact ? <p className="mt-1 text-sm text-[#b5cce4]">Funds available for entries</p> : null}
    <div className={compact ? "contents" : "mt-auto flex flex-wrap items-center justify-between gap-2 pt-2"}>
      {fundingEnabled && isDemoWallet ? <Link href={`${walletHistoryHref}#demo-funding`} onClick={onNavigate} className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-[#31e800] px-4 text-sm font-black text-[#002719] ${compact ? "col-start-2 row-start-1 row-span-2" : ""}`}>Add funds</Link> : <button type="button" disabled title="Funding is not enabled yet" className={`min-h-11 cursor-not-allowed rounded-xl bg-[#31e800] px-4 text-sm font-black text-[#002719] ${compact ? "col-start-2 row-start-1 row-span-2" : ""}`}>Add funds</button>}
      {!compact ? <Link href={walletHistoryHref} onClick={onNavigate} className="inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-bold text-cyan-300 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300">Transactions <span aria-hidden="true">›</span></Link> : null}
    </div>
    {!compact ? <p className="mt-1 text-[11px] text-[#b5cce4]">{fundingEnabled && isDemoWallet ? "Demo funds only · No real money" : "Funding is not enabled yet."}</p> : null}
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
  return <Link href="/account/entries" onClick={onNavigate} aria-label="My Zero Loss — See every entry and outcome" data-activity-source={state.source}
    className={`group h-full min-w-0 rounded-2xl border border-cyan-300/20 bg-[linear-gradient(135deg,#133e64,#232f63)] transition hover:border-cyan-300/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${compact ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-3" : "flex flex-col p-4"}`}>
    <h2 className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">My Zero Loss</h2>
    <p className={`font-black tracking-tight text-white ${compact ? "text-base" : "mt-1 text-3xl"}`}>{counts ? `${counts.total} ${counts.total === 1 ? "item" : "items"}` : "Unavailable"}{compact ? <span aria-hidden="true" className="ml-2 text-cyan-300">›</span> : null}</p>
    <p className={`mt-1 leading-5 text-[#b5cce4] ${compact ? "col-span-2 text-xs" : "text-sm"}`}>{counts ? `${counts.open} open · ${counts.won} won · ${counts.options} purchase ${counts.options === 1 ? "option" : "options"}` : "We can’t verify your activity right now."}</p>
    {!compact ? <span className="mt-auto block pt-2 text-sm font-bold text-cyan-300 group-hover:text-white">See every entry and outcome <span aria-hidden="true">→</span></span> : null}
    {state.isPreview && !compact ? <span className="mt-1 text-[11px] text-[#b5cce4]">Illustrative sample activity</span> : null}
  </Link>;
}
