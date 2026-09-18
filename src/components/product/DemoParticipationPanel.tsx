"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { PoolProgress } from "@/components/product/PoolProgress";
import { walletHistoryHref } from "@/lib/account/activity";
import { createPreviewEntry } from "@/lib/entries/actions";

type Props = {
  productSlug: string;
  requestKey: string;
  productTitle: string;
  retailer: string;
  productValue: number;
  entryPrice: number;
  sold: number;
  capacity: number;
  balanceLabel?: string;
  isDemoWallet?: boolean;
  isSignedIn?: boolean;
};

export function DemoParticipationPanel({
  productSlug,
  requestKey,
  productTitle,
  retailer,
  productValue,
  entryPrice,
  sold,
  capacity,
  balanceLabel = "Unavailable",
  isDemoWallet = false,
  isSignedIn = false,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createPreviewEntry, { status: "idle" });
  const [quantity, setQuantity] = useState(1);
  const [additionalEntryNoticeOpen, setAdditionalEntryNoticeOpen] = useState(false);
  const [additionalEntryTermsSeen, setAdditionalEntryTermsSeen] = useState(false);
  const remaining = Math.max(0, capacity - sold);
  const remainingBalance = Math.max(0, productValue - entryPrice);
  const total = quantity * entryPrice;

  const requestAdditionalEntry = () => {
    if (pending || state.status === "succeeded" || quantity >= 10) return;
    if (!additionalEntryTermsSeen) {
      setAdditionalEntryNoticeOpen(true);
      return;
    }
    setQuantity((value) => Math.min(10, value + 1));
  };

  const acknowledgeAndAddEntry = () => {
    setAdditionalEntryTermsSeen(true);
    setQuantity((value) => Math.min(10, value + 1));
    setAdditionalEntryNoticeOpen(false);
  };

  useEffect(() => {
    if (state.status !== "succeeded") return;
    const timer = window.setTimeout(() => router.push(state.href), 350);
    return () => window.clearTimeout(timer);
  }, [router, state]);

  return (
    <aside id="enter-entry" className="scroll-mt-32 rounded-3xl border border-cyan-300/30 bg-[#001b3d] p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-cyan-300">Entry price</p>
          <p className="mt-1 text-4xl font-extrabold">${entryPrice.toFixed(2)}</p>
        </div>
        <span className="rounded-full bg-[#ff630f] px-3 py-1.5 text-xs font-extrabold text-black">Ending soon</span>
      </div>

      <div className="mt-8">
        <PoolProgress ticketsSold={sold} ticketCapacity={capacity} />
        <div className="mt-3 flex justify-between text-xs text-white/65">
          <span>{sold.toLocaleString()} entries</span>
          <span>{remaining.toLocaleString()} remaining</span>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between rounded-2xl bg-white/7 p-3">
        <div>
          <p className="text-xs text-white/60">Your entries</p>
          <p className="mt-0.5 font-bold" aria-live="polite">${total.toFixed(2)} total</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1 || pending || state.status === "succeeded"} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-xl transition hover:border-cyan-300 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Remove one entry">−</button>
          <span className="w-5 text-center font-mono font-bold" data-testid="entry-quantity">{quantity}</span>
          <button type="button" onClick={requestAdditionalEntry} disabled={quantity === 10 || pending || state.status === "succeeded"} className="grid h-10 w-10 place-items-center rounded-full border border-white/20 text-xl transition hover:border-cyan-300 hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Add one entry">+</button>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-white/55">Each entry is separate. Entry amounts and completion options never combine.</p>

      {isSignedIn ? (
        <form action={action}>
          <input type="hidden" name="offeringSlug" value={productSlug} />
          <input type="hidden" name="idempotencyKey" value={requestKey} />
          <input type="hidden" name="quantity" value={quantity} />
          <button type="submit" disabled={pending || state.status === "succeeded"} className="mt-4 w-full rounded-xl bg-[#00b9ff] px-5 py-3.5 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">
            {pending ? `Confirming ${quantity === 1 ? "entry" : "entries"}…` : state.status === "succeeded" ? `${quantity === 1 ? "Entry" : "Entries"} confirmed` : `Enter for $${total.toFixed(2)}`}
          </button>
        </form>
      ) : (
        <Link href="/login" className="mt-4 grid w-full place-items-center rounded-xl bg-[#00b9ff] px-5 py-3.5 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200">
          Sign in to enter
        </Link>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
        <span><span className="text-white/60">{isDemoWallet ? "Demo Playable Balance" : "Playable Balance"}</span> <strong className="ml-2" data-testid="product-wallet-balance">{balanceLabel}</strong></span>
        <Link href={walletHistoryHref} className="font-bold text-cyan-300 hover:text-cyan-100">Add funds</Link>
      </div>

      <div className="mt-5 rounded-xl border border-[#31e800]/30 bg-[#31e800]/8 p-4 text-sm leading-6 text-white/85">
        <strong className="text-[#67ff42]">Each ${entryPrice.toFixed(2)} still counts.</strong> If an entry is not selected, its payment remains attached to this exact {retailer} offering as its own completion option, subject to the published terms.
      </div>

      {state.status !== "idle" ? (
        <div role="status" className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${state.status === "error" ? "border-[#ff796c]/50 bg-[#4b1c25]" : "border-[#31e800]/40 bg-[#0b412b]"}`}>
          <strong>{state.message}</strong>
          {state.status === "succeeded" ? <span className="block text-white/65">Opening the stored result for {productTitle}…</span> : null}
        </div>
      ) : null}

      {additionalEntryNoticeOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-end bg-[#000914]/75 p-3 backdrop-blur-sm sm:place-items-center" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setAdditionalEntryNoticeOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="additional-entry-title" className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-cyan-300/40 bg-[#001b3d] p-5 text-left shadow-[0_28px_90px_rgba(0,0,0,.55)] sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-cyan-300">Before you add another entry</p>
            <h2 id="additional-entry-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">Every entry stands on its own.</h2>
            <ol className="mt-5 space-y-3 text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
              <li><strong className="text-white">1. Another entry means another independent chance.</strong> Each entry receives the same chance of selection, subject to the published pool rules.</li>
              <li><strong className="text-white">2. Non-selected entries do not become wallet cash.</strong> Each qualifying non-selected entry creates its own option to complete this exact offering.</li>
              <li><strong className="text-white">3. The options cannot be stacked.</strong> Entry payments and completion options cannot be combined with one another or with Playable Balance.</li>
              <li><strong className="text-white">4. Each option requires its own remaining payment.</strong> For this ${productValue.toLocaleString()} {retailer} offering, one ${entryPrice.toFixed(2)} entry would leave ${remainingBalance.toFixed(2)} to complete one purchase.</li>
              <li><strong className="text-white">5. The option stays with this entry and retailer.</strong> It cannot move to a different product, retailer, account, entry, or cash withdrawal.</li>
            </ol>
            <div className="mt-5 rounded-2xl border border-[#31e800]/30 bg-[#31e800]/8 p-4 text-sm leading-6 sm:text-base sm:leading-7">
              <strong className="text-[#67ff42]">Example with three entries:</strong> You receive three separate chances for {productTitle}. If none is selected, you may receive three separate completion options—not a combined ${(entryPrice * 3).toFixed(2)} credit. Completing all three ${productValue.toLocaleString()} purchases would produce {(productValue * 3).toLocaleString("en-US", { style: "currency", currency: "USD" })} in total retailer value and require three separate payments of ${remainingBalance.toFixed(2)} ({(remainingBalance * 3).toLocaleString("en-US", { style: "currency", currency: "USD" })} total remaining payment).
            </div>
            <p className="mt-4 text-xs leading-5 text-white/55">Eligibility, free-entry method, entry limits, expiration, and final legal terms remain governed by the official rules.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setAdditionalEntryNoticeOpen(false)} className="rounded-xl border border-white/20 px-4 py-3 font-bold text-white hover:bg-white/8">Keep one entry</button>
              <button type="button" onClick={acknowledgeAndAddEntry} className="rounded-xl bg-[#00b9ff] px-4 py-3 font-extrabold text-[#00132e] hover:bg-cyan-200">I understand — add entry</button>
            </div>
            <Link href={`/free-entry?offering=${productSlug}`} className="mt-4 block text-center text-sm font-bold text-cyan-300 hover:text-white">View official rules &amp; free-entry information →</Link>
          </section>
        </div>
      ) : null}

      <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Preview-only activity. The debit, entry and result are written atomically to the development/test database. No real reward is issued.</p>
    </aside>
  );
}
