import Image from "next/image";
import Link from "next/link";
import { walletRewardHref, walletRewards, type AccountActivity, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { RewardRedemptionActions } from "./RewardRedemptionActions";

export function WalletRewards({ state }: { state: AccountActivity }) {
  const rewards = walletRewards(state);
  return <section className="mt-6" aria-labelledby="wallet-rewards-heading" data-activity-source={state.source}>
    <h2 id="wallet-rewards-heading" className="text-xl font-bold text-white">Your prizes</h2>
    <p className="mt-2 text-sm leading-6 text-[#b5cce4]">Open a prize to go straight to its redemption details.</p>
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

const CODE39: Record<string, string> = {
  "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
  "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", "*": "nwnnwnwnn",
};

function sampleRewardNumber(slug: string) {
  let hash = 2166136261;
  for (const character of slug) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const digits = `45${(hash >>> 0).toString().padStart(10, "0")}`.slice(0, 12);
  return { raw: digits, display: digits.match(/.{1,4}/g)?.join(" ") ?? digits };
}

function SampleRewardBarcode({ value }: { value: string }) {
  const bars = `*${value}*`.split("").flatMap((character, characterIndex) => {
    const pattern = CODE39[character] ?? CODE39["0"];
    return [...pattern.split("").map((width, index) => ({
      dark: index % 2 === 0,
      width: width === "w" ? 3 : 1,
      key: `${characterIndex}-${index}`,
    })), { dark: false, width: 1, key: `${characterIndex}-gap` }];
  });
  return <div className="flex h-24 w-full items-stretch justify-center overflow-hidden bg-white px-2 py-1 sm:h-28" aria-label="Sample reward barcode">
    {bars.map(bar => <span key={bar.key} className={bar.dark ? "bg-[#061630]" : "bg-white"} style={{ width: `${bar.width}px` }} />)}
  </div>;
}

/** Responsive reward destination. Preview codes are visibly non-redeemable. */
export function WalletRewardDetail({ item, isPreview }: { item: ActivityItem; isPreview: boolean }) {
  const sample = isPreview ? sampleRewardNumber(item.slug) : null;
  const detailRows = [
    ["Retailer", item.retailer],
    ["Value", formatUsdFromCents(item.priceCents)],
    ["Status", isPreview ? "Demo ready" : "Not issued"],
    ["Expires", isPreview ? "No expiration" : "Not available"],
  ];

  return <main className="relative isolate min-h-[calc(100dvh-5rem)] overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#07528a_0%,#002b52_28%,#00152f_68%,#000d20_100%)] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
    <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(0,185,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,185,255,.08)_1px,transparent_1px)] [background-size:44px_44px]" />
    <section aria-label="Reward redemption details" className="mx-auto w-full max-w-[42rem]">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 px-1 text-sm font-semibold text-white/85">
        <Link href="/account/wallet" className="rounded-sm hover:text-cyan-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">My Rewards</Link>
        <span aria-hidden="true" className="text-cyan-300">›</span>
        <span className="truncate">{item.retailer}</span>
      </nav>

      <article className="overflow-hidden rounded-[1.35rem] border border-cyan-200/70 bg-[linear-gradient(145deg,#edffff_0%,#d9fbff_46%,#bff7fb_100%)] p-4 text-[#061630] shadow-[0_0_0_1px_rgba(0,185,255,.2),0_0_32px_rgba(0,185,255,.34),0_24px_55px_rgba(0,0,0,.35)] sm:p-7">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-[#00a31d]">
            <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-[#31e800] text-sm text-[#052d0b]">✓</span>
            {isPreview ? "Ready to use" : "Reward earned"}
          </div>
          <p className="mt-5 text-xl font-black sm:text-2xl">{item.retailer}</p>
          <p className="mt-1 text-[clamp(3.75rem,14vw,6rem)] font-black leading-none tracking-[-0.06em]">{formatUsdFromCents(item.priceCents)}</p>
          <p className="mt-1 text-xl font-black sm:text-2xl">digital reward</p>
        </header>

        <div className="mt-5 rounded-xl bg-white p-3 shadow-[0_6px_22px_rgba(3,50,82,.12)] sm:p-5">
          {sample ? <>
            <SampleRewardBarcode value={sample.raw} />
            <p className="mt-2 text-center font-mono text-lg font-bold tracking-[0.08em] sm:text-xl">{sample.display}</p>
            <p className="mt-1 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#244da2] sm:text-xs">Sample — not redeemable</p>
          </> : <div role="status" className="grid min-h-36 place-items-center text-center">
            <div><p className="text-lg font-black">Not issued yet</p><p className="mt-2 text-sm text-[#4a667c]">No gift card or redeemable barcode has been issued.</p></div>
          </div>}
        </div>

        <RewardRedemptionActions displayCode={sample?.display ?? null} isPreview={isPreview} />
      </article>

      <section aria-labelledby="reward-details-heading" className="mt-4 overflow-hidden rounded-2xl border border-cyan-300/35 bg-[#062b4b]/95 text-white shadow-[0_18px_42px_rgba(0,0,0,.28)]">
        <h2 id="reward-details-heading" className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-black sm:px-5">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#31e800] shadow-[0_0_10px_#31e800]" />
          Reward details
        </h2>
        <dl>
          {detailRows.map(([label, value], index) => <div key={label} className={`grid grid-cols-[minmax(6.5rem,.8fr)_minmax(0,1.2fr)_auto] items-center gap-3 px-4 py-2.5 text-sm sm:px-5 ${index ? "border-t border-white/10" : ""}`}>
            <dt className="text-[#b5cce4]">{label}</dt>
            <dd className={`min-w-0 break-words font-semibold ${label === "Status" && isPreview ? "text-[#72ff9f]" : "text-white"}`}>{value}</dd>
            <span aria-hidden="true" className="text-cyan-300">›</span>
          </div>)}
        </dl>
      </section>

      <p className="mx-auto mt-4 max-w-xl text-center text-xs leading-5 text-[#a7c6df]">Reward for {item.title}. Digital reward availability and redemption methods depend on the issuing retailer.</p>
      <Link href="/account/wallet" className="mx-auto mt-4 flex min-h-12 w-fit items-center justify-center px-4 text-sm font-bold text-cyan-300 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">Back to My Rewards</Link>
    </section>
  </main>;
}
