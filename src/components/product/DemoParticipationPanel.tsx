"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PoolProgress } from "@/components/product/PoolProgress";
import { walletHistoryHref } from "@/lib/account/activity";
import { acknowledgeExtraEntryExplainer, createPreviewEntry } from "@/lib/entries/actions";

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
  extraEntryExplainerAcknowledged?: boolean;
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
  extraEntryExplainerAcknowledged = false,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createPreviewEntry, { status: "idle" });
  const [quantity, setQuantity] = useState(1);
  const [additionalEntryNoticeOpen, setAdditionalEntryNoticeOpen] = useState(false);
  const [additionalEntryTermsSeen, setAdditionalEntryTermsSeen] = useState(false);
  const [rememberExplanation, setRememberExplanation] = useState(false);
  const [skipFutureExplainer, setSkipFutureExplainer] = useState(extraEntryExplainerAcknowledged);
  const [preferenceSaving, setPreferenceSaving] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const remaining = Math.max(0, capacity - sold);
  const remainingBalance = Math.max(0, productValue - entryPrice);
  const total = quantity * entryPrice;

  const requestAdditionalEntry = () => {
    if (pending || state.status === "succeeded" || quantity >= 10) return;
    if (!additionalEntryTermsSeen && !skipFutureExplainer) {
      setAdditionalEntryNoticeOpen(true);
      return;
    }
    setQuantity((value) => Math.min(10, value + 1));
  };

  const acknowledgeAndAddEntry = async () => {
    setPreferenceError(null);
    if (rememberExplanation) {
      setPreferenceSaving(true);
      const preference = await acknowledgeExtraEntryExplainer();
      setPreferenceSaving(false);
      if (preference.status === "error") {
        setPreferenceError(preference.message);
        return;
      }
      setSkipFutureExplainer(true);
    }
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
          <button type="button" onClick={requestAdditionalEntry} disabled={quantity === 10 || pending || state.status === "succeeded"} className="grid h-10 w-10 place-items-center rounded-full border border-[#56ff3b] bg-[#123e27] text-xl font-black text-[#67ff42] shadow-[0_0_12px_rgba(81,255,59,.85),inset_0_0_12px_rgba(81,255,59,.2)] transition hover:bg-[#1b5834] hover:shadow-[0_0_18px_rgba(81,255,59,1),inset_0_0_14px_rgba(81,255,59,.28)] disabled:cursor-not-allowed disabled:opacity-35" aria-label="Add one entry" aria-haspopup="dialog">+</button>
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

      {additionalEntryNoticeOpen ? createPortal((
        <div className="fixed inset-0 z-[200] grid place-items-end bg-[#000914]/75 p-3 backdrop-blur-sm sm:place-items-center" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setAdditionalEntryNoticeOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="additional-entry-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-cyan-300/50 bg-[#001b3d] p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,.65),0_0_28px_rgba(0,185,255,.2)] sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <Image src="/zeroloss-logo.svg" alt="Zero Loss" width={190} height={35} className="h-7 w-auto" />
                <h2 id="additional-entry-title" className="mt-3 text-2xl font-extrabold sm:text-3xl">How Extra Entries Work</h2>
                <p className="mt-1 text-sm text-white/65">One quick visual before you add another independent chance.</p>
              </div>
              <button type="button" onClick={() => setAdditionalEntryNoticeOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-2xl text-white/70 transition hover:border-cyan-300 hover:text-white" aria-label="Close extra entry explanation">×</button>
            </header>

            <Image src="/account/extra-entry-explainer-v2.png" alt="Four illustrated steps showing one entry, adding entries, gaining separate chances, and keeping each completion option separate" width={1256} height={1256} className="mt-5 h-auto w-full rounded-2xl border border-cyan-300/25" priority />

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs leading-5 sm:text-sm">
              <div className="rounded-xl border border-[#55ff3b]/25 bg-[#55ff3b]/7 p-3"><strong className="block text-[#67ff42]">1. One entry</strong>${entryPrice.toFixed(2)} creates one independent chance.</div>
              <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/7 p-3"><strong className="block text-cyan-300">2. Add entries</strong>Add another separate chance with the neon-green plus.</div>
              <div className="rounded-xl border border-[#55ff3b]/25 bg-[#55ff3b]/7 p-3"><strong className="block text-[#67ff42]">3. More chances</strong>Every entry is considered on its own.</div>
              <div className="rounded-xl border border-[#ff9a21]/30 bg-[#ff9a21]/7 p-3"><strong className="block text-[#ffad3d]">4. No stacking</strong>Separate entries never become one combined credit.</div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#55ff3b]/30 bg-[#55ff3b]/8 p-3">
              <span aria-hidden="true" className="text-2xl text-[#67ff42]">✓</span>
              <strong className="text-sm sm:text-base">Every entry—and every completion option—stands alone.</strong>
            </div>

            <details className="group mt-4 rounded-xl border border-cyan-300/35 bg-[#001632] open:border-cyan-300/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-bold text-white marker:hidden">
                <span className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#00b9ff] text-[#00132e]">?</span>Why does each entry stand alone?</span>
                <span aria-hidden="true" className="text-xl text-cyan-300 transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="border-t border-cyan-300/20 px-4 py-4">
                <ol className="space-y-3 text-sm leading-6 text-white/78">
                  <li><strong className="text-white">1. Another entry means another independent chance.</strong> Each entry receives the same chance of selection, subject to the published pool rules.</li>
                  <li><strong className="text-white">2. Non-selected entries do not become wallet cash.</strong> Each qualifying non-selected entry creates its own option to complete this exact offering.</li>
                  <li><strong className="text-white">3. The options cannot be stacked.</strong> Entry payments and completion options cannot be combined with one another or with Playable Balance.</li>
                  <li><strong className="text-white">4. Each option requires its own remaining payment.</strong> For this ${productValue.toLocaleString()} {retailer} offering, one ${entryPrice.toFixed(2)} entry would leave ${remainingBalance.toFixed(2)} to complete one purchase.</li>
                  <li><strong className="text-white">5. The option stays with this entry and retailer.</strong> It cannot move to a different product, retailer, account, entry, or cash withdrawal.</li>
                </ol>
                <div className="mt-4 rounded-xl border border-[#31e800]/30 bg-[#31e800]/8 p-3 text-sm leading-6">
                  <strong className="text-[#67ff42]">Example with three entries:</strong> You receive three separate chances for {productTitle}. If none is selected, you may receive three separate completion options—not a combined ${(entryPrice * 3).toFixed(2)} credit. Completing all three purchases would require three separate remaining payments of ${remainingBalance.toFixed(2)} each.
                </div>
              </div>
            </details>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
              <input type="checkbox" checked={rememberExplanation} onChange={(event) => setRememberExplanation(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#55ff3b]" />
              <span><strong className="block text-sm">I understand how extra entries work</strong><span className="mt-0.5 block text-xs leading-5 text-white/55">Check this and we&apos;ll stop showing this notice. We just want to make sure you understand that extra entries and completion options never combine.</span></span>
            </label>
            {preferenceError ? <p role="alert" className="mt-3 rounded-xl border border-[#ff796c]/40 bg-[#4b1c25] p-3 text-sm">{preferenceError}</p> : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setAdditionalEntryNoticeOpen(false)} className="rounded-xl border border-white/20 px-4 py-3 font-bold text-white hover:bg-white/8">Keep current entries</button>
              <button type="button" onClick={acknowledgeAndAddEntry} disabled={preferenceSaving} className="rounded-xl bg-[#00b9ff] px-4 py-3 font-extrabold text-[#00132e] hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">{preferenceSaving ? "Saving preference…" : "Add entry"}</button>
            </div>
            <Link href={`/free-entry?offering=${productSlug}`} className="mt-4 block text-center text-sm font-bold text-cyan-300 hover:text-white">View official rules &amp; free-entry information →</Link>
          </section>
        </div>
      ), document.body) : null}

      <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Preview-only activity. The debit, entry and result are written atomically to the development/test database. No real reward is issued.</p>
    </aside>
  );
}
