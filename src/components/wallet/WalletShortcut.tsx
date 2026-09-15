import Link from "next/link";
import { walletRewardHref, walletRewards, type AccountActivity } from "@/lib/account/activity";

/** Shared navigation only. Counts are not wallet cash or issued cards. */
export function WalletShortcut({ state, onNavigate, dashboard = false }: { state: AccountActivity; onNavigate?: () => void; dashboard?: boolean }) {
  const rewards = walletRewards(state);
  const count = state.source === "unavailable" ? null : rewards.length;
  const detail = count === null ? "Reward count unavailable" : `${count} ${state.isPreview ? "sample " : ""}${count === 1 ? "reward" : "rewards"}`;
  const single = count === 1 ? rewards[0] : null;
  return <Link href={single ? walletRewardHref(single) : "/account/wallet"} onClick={onNavigate} aria-label={`Your wallet — ${detail}`}
    className={`group h-full min-w-0 w-full rounded-2xl border border-[#31ff83]/30 bg-[linear-gradient(135deg,#0b554b,#0a3c36)] transition hover:border-[#72ff9f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 ${dashboard ? "flex flex-col p-4" : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 p-3"}`}>
    <h2 className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Your wallet</h2>
    <p className={`font-black tracking-tight text-[#31e800] ${dashboard ? "mt-1 text-3xl" : "text-lg"}`}>{count === null ? "Unavailable" : `${count} ready`}</p>
    {dashboard ? <p className="mt-1 text-sm leading-5 text-[#b5cce4]">{count === null ? "We can’t verify your rewards right now." : single ? single.retailer : count === 0 ? "Your ready prizes will appear here." : "Your ready prizes, all together."}</p> : null}
    <span className={dashboard ? "mt-auto block pt-2" : "mt-2 block"}><span className="inline-flex min-h-11 items-center rounded-xl bg-[#31e800] px-4 text-sm font-black text-[#002719] group-hover:bg-[#72ff4e]">{single ? (state.isPreview && dashboard ? "Open sample reward" : "Open reward") : "Open wallet"} <span aria-hidden="true" className="ml-2">→</span></span></span>
    {state.isPreview ? <span className={`text-[11px] text-[#b5cce4] ${dashboard ? "mt-1" : "mt-2 max-w-28 justify-self-end text-right leading-4"}`}>Sample · Not redeemable</span> : null}
  </Link>;
}
