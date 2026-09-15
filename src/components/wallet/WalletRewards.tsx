import Image from "next/image";
import Link from "next/link";
import { walletRewardHref, walletRewards, type AccountActivity, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";

export function WalletRewards({ state }: { state: AccountActivity }) {
  const rewards = walletRewards(state);
  return <section className="mt-6" aria-labelledby="wallet-rewards-heading" data-activity-source={state.source}>
    <h2 id="wallet-rewards-heading" className="text-xl font-bold text-white">Your prizes</h2>
    <p className="mt-2 text-sm leading-6 text-[#b5cce4]">Open a prize to go straight to its redemption details.</p>
    {state.isPreview ? <p className="mt-2 text-xs text-[#9bb3ce]">Illustrative sample only. No reward has been issued.</p> : null}
    {state.source === "unavailable" ? <p role="status" className="mt-5 rounded-2xl border border-orange-300/25 bg-orange-300/5 p-5 text-sm text-orange-100">Rewards unavailable. We can’t verify your account activity right now.</p> : rewards.length === 0 ? <div className="mt-5 rounded-2xl border border-white/10 bg-[#06223d] p-6">
      <h3 className="font-bold text-white">No ready prizes yet</h3>
      <p className="mt-2 text-sm leading-6 text-[#b5cce4]">Your digital rewards will appear here. Open entries and purchase options stay in My Zero Loss.</p>
      <Link href="/account/entries" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300 hover:underline focus-visible:outline-2 focus-visible:outline-cyan-300">View My Zero Loss ›</Link>
    </div> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rewards.map(item => <Link key={item.slug} href={walletRewardHref(item)} className="group rounded-2xl border border-[#31ff83]/25 bg-[#062d36] p-5 transition hover:border-[#31ff83]/70 hover:bg-[#0a3c36] focus-visible:outline-2 focus-visible:outline-cyan-300">
        <div className="relative h-28 rounded-xl bg-[#16703f]"><Image src={item.image} alt="" fill sizes="360px" className="object-contain p-3" /></div>
        <p className="mt-4 text-xs font-bold text-[#b5cce4]">{item.retailer}</p>
        <h3 className="mt-1 text-lg font-bold leading-6 text-white">{item.title}</h3>
        <p className="mt-2 text-sm text-[#b5cce4]">Digital gift-card reward · {formatUsdFromCents(item.priceCents)}</p>
        {state.isPreview ? <p className="mt-2 text-xs text-[#b5cce4]">Sample · Not redeemable</p> : null}
        <span className="mt-4 flex min-h-11 items-center justify-between border-t border-white/10 pt-3 text-sm font-bold text-[#72ff9f]">Open reward <span aria-hidden="true">›</span></span>
      </Link>)}
    </div>}
  </section>;
}

/** Checkpoint-one read-only destination. No credential or redemption is invented. */
export function WalletRewardDetail({ item, isPreview }: { item: ActivityItem; isPreview: boolean }) {
  return <section aria-label="Reward redemption details" className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#06223d] p-4 lg:block lg:p-6">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#16703f] lg:h-44 lg:w-full"><Image src={item.image} alt="" fill sizes="(min-width:1024px) 400px, 64px" className="object-contain p-2 lg:p-5" /></div>
      <div className="min-w-0 lg:mt-5"><p className="text-xs font-bold text-[#b5cce4]">{item.retailer}</p><h2 className="mt-1 break-words text-base font-black leading-tight text-white lg:text-2xl">{item.title}</h2><p className="mt-2 hidden text-xs leading-5 text-[#b5cce4] lg:block">Fulfilled as a digital gift card, not a shipped product.</p></div>
    </div>
    <div className="rounded-2xl border border-[#31ff83]/30 bg-[linear-gradient(135deg,#073453,#063c38)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#b5cce4]">Digital gift-card reward</p><p className="mt-2 text-4xl font-black text-[#31ff83]">{formatUsdFromCents(item.priceCents)}</p></div><span className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-white">{isPreview ? "Sample" : "Not issued"}</span></div>
      <p className="mt-2 text-sm font-bold text-white">{item.retailer}</p>
      <div role="status" className="mt-4 rounded-xl bg-[#f2f7f5] px-4 py-5 text-center text-[#07352f] sm:px-5 sm:py-7">
        <p className="text-xs font-bold uppercase tracking-wider">Redemption code</p>
        <p className="mt-3 text-xl font-black">{isPreview ? "Sample — not redeemable" : "Not issued yet"}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6">No gift card or redeemable barcode has been issued. There is nothing to scan or use at checkout yet.</p>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#b5cce4]">This is the direct redemption destination. The supplier’s supported code, PIN or redemption link will appear here when delivery is implemented.</p>
    </div>
  </section>;
}
