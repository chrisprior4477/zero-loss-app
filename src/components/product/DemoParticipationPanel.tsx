"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PoolProgress } from "@/components/product/PoolProgress";
import { fundingHref } from "@/lib/wallet/funding-navigation";
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
  const [sharePromptOpen, setSharePromptOpen] = useState(false);
  const entryFormRef = useRef<HTMLFormElement>(null);
  const shareChoiceRef = useRef<HTMLInputElement>(null);
  const shareChoiceConfirmed = useRef(false);
  const remaining = Math.max(0, capacity - sold);
  const maxQuantity = Math.min(10, remaining);
  const remainingBalance = Math.max(0, productValue - entryPrice);
  const total = quantity * entryPrice;
  const entryLoginHref = `/login?next=${encodeURIComponent(`/items/${productSlug}#enter-entry`)}`;
  const addFundsHref = fundingHref(productSlug);

  const requestAdditionalEntry = () => {
    if (pending || state.status === "succeeded" || quantity >= maxQuantity) return;
    if (!additionalEntryTermsSeen && !skipFutureExplainer) {
      setAdditionalEntryNoticeOpen(true);
      return;
    }
    setQuantity((value) => Math.min(maxQuantity, value + 1));
  };

  const acknowledgeAndAddEntry = async () => {
    setPreferenceError(null);
    if (!rememberExplanation) {
      setPreferenceError("Check the acknowledgment before saving your choice.");
      return;
    }
    setPreferenceSaving(true);
    const preference = await acknowledgeExtraEntryExplainer();
    setPreferenceSaving(false);
    if (preference.status === "error") {
      setPreferenceError(preference.message);
      return;
    }
    setSkipFutureExplainer(true);
    setAdditionalEntryTermsSeen(true);
    setQuantity((value) => Math.min(maxQuantity, value + 1));
    setAdditionalEntryNoticeOpen(false);
  };

  useEffect(() => {
    if (state.status !== "succeeded") return;
    const timer = window.setTimeout(() => router.push(state.href), 350);
    return () => window.clearTimeout(timer);
  }, [router, state]);

  useEffect(() => {
    if (state.status === "error") shareChoiceConfirmed.current = false;
  }, [state]);

  const chooseEntrySharing = (share: boolean) => {
    if (shareChoiceRef.current) shareChoiceRef.current.value = share ? "yes" : "no";
    shareChoiceConfirmed.current = true;
    setSharePromptOpen(false);
    window.setTimeout(() => entryFormRef.current?.requestSubmit(), 0);
  };

  return (
    <aside id="enter-entry" className="scroll-mt-[180px] rounded-3xl border border-cyan-300/30 bg-[#001b3d] p-5 shadow-[0_24px_70px_rgba(0,0,0,.24)] sm:p-7 md:scroll-mt-32">
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
          <button type="button" onClick={requestAdditionalEntry} disabled={quantity >= maxQuantity || pending || state.status === "succeeded"} className="grid h-10 w-10 place-items-center rounded-full border border-[#56ff3b] bg-[#123e27] text-xl font-black text-[#67ff42] shadow-[0_0_12px_rgba(81,255,59,.85),inset_0_0_12px_rgba(81,255,59,.2)] transition hover:bg-[#1b5834] hover:shadow-[0_0_18px_rgba(81,255,59,1),inset_0_0_14px_rgba(81,255,59,.28)] disabled:cursor-not-allowed disabled:opacity-35" aria-label="Add one entry" aria-haspopup="dialog">+</button>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-white/55">Each entry is separate. Entry amounts and completion options never combine.</p>

      {remaining === 0 ? (
        <button type="button" disabled className="mt-4 w-full rounded-xl bg-[#0b668b] px-5 py-3.5 text-base font-extrabold text-white/60">No entries remaining</button>
      ) : isSignedIn ? (
        <form ref={entryFormRef} action={action} onSubmit={(event) => {
          if (shareChoiceConfirmed.current) return;
          event.preventDefault();
          setSharePromptOpen(true);
        }}>
          <input type="hidden" name="offeringSlug" value={productSlug} />
          <input type="hidden" name="idempotencyKey" value={requestKey} />
          <input type="hidden" name="quantity" value={quantity} />
          <input ref={shareChoiceRef} type="hidden" name="shareWithCrew" value="no" />
          <button type="submit" disabled={pending || state.status === "succeeded"} className="mt-4 w-full rounded-xl bg-[#00b9ff] px-5 py-3.5 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60">
            {pending ? `Confirming ${quantity === 1 ? "entry" : "entries"}…` : state.status === "succeeded" ? `${quantity === 1 ? "Entry" : "Entries"} confirmed` : `Enter for $${total.toFixed(2)}`}
          </button>
        </form>
      ) : (
        <Link href={entryLoginHref} className="mt-4 grid w-full place-items-center rounded-xl bg-[#00b9ff] px-5 py-3.5 text-base font-extrabold text-[#00132e] transition hover:bg-cyan-200">
          Sign in to enter
        </Link>
      )}

      <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm">
        <span><span className="text-white/60">{isDemoWallet ? "Demo Playable Balance" : "Playable Balance"}</span> <strong className="ml-2" data-testid="product-wallet-balance">{balanceLabel}</strong></span>
        <Link href={isSignedIn ? addFundsHref : `/login?next=${encodeURIComponent(addFundsHref)}&focus=email#login-form`} className="font-bold text-cyan-300 hover:text-cyan-100">Add funds</Link>
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
        <div className="fixed inset-0 z-[200] grid place-items-end bg-[#000914]/75 p-2 backdrop-blur-sm sm:place-items-center sm:p-4" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setAdditionalEntryNoticeOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="additional-entry-title" className="max-h-[94vh] w-full max-w-sm overflow-y-auto rounded-[1.75rem] border border-cyan-300/55 bg-[#001b3d] text-left shadow-[0_28px_90px_rgba(0,0,0,.68),0_0_30px_rgba(0,185,255,.24)]">
            <h2 id="additional-entry-title" className="sr-only">How Extra Chances Work</h2>
            <div className="relative">
              <Image src="/account/extra-entry-explainer-approved-slide-v2.png" alt="How extra chances work: one entry creates one chance, extra entries create more separate chances, and entries never stack into one discount" width={952} height={1145} className="h-auto w-full" priority sizes="(max-width: 640px) calc(100vw - 16px), 576px" />
              <button type="button" onClick={() => setAdditionalEntryNoticeOpen(false)} className="absolute right-[1.2%] top-[1.1%] grid h-10 w-10 place-items-center rounded-full bg-[#001b3d]/95 text-3xl font-light text-[#aacaff] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300" aria-label="Close extra entry explanation">×</button>
            </div>

            <div className="space-y-4 px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
            <details className="group rounded-xl border border-cyan-300/35 bg-[#001632] open:border-cyan-300/60">
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

            {isSignedIn ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <input type="checkbox" checked={rememberExplanation} onChange={(event) => setRememberExplanation(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#55ff3b]" />
                  <span><strong className="block text-sm">I understand how extra entries work.</strong><span className="mt-0.5 block text-xs leading-5 text-white/60">Please stop showing this explanation again.</span></span>
                </label>
                {preferenceError ? <p role="alert" className="mt-3 rounded-xl border border-[#ff796c]/40 bg-[#4b1c25] p-3 text-sm">{preferenceError}</p> : null}
                <button type="button" onClick={acknowledgeAndAddEntry} disabled={!rememberExplanation || preferenceSaving} className="w-full rounded-xl bg-[#00b9ff] px-4 py-3.5 font-extrabold text-[#00132e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-[#0b668b] disabled:text-white/55">{preferenceSaving ? "Saving your choice…" : "I understand — save my choice"}</button>
              </>
            ) : (
              <>
                <p className="text-xs leading-5 text-white/60">Sign in to choose extra entries and save this explanation preference.</p>
                <Link href={entryLoginHref} className="grid w-full place-items-center rounded-xl bg-[#00b9ff] px-4 py-3.5 font-extrabold text-[#00132e] transition hover:bg-cyan-200">Sign in to add entries</Link>
              </>
            )}
            </div>
          </section>
        </div>
      ), document.body) : null}

      {sharePromptOpen ? createPortal((
        <div className="fixed inset-0 z-[210] grid place-items-center bg-[#000914]/80 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSharePromptOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="crew-share-title" className="w-full max-w-md rounded-2xl border border-cyan-300/60 bg-[#072744] p-5 text-white shadow-[0_20px_70px_#000a,0_0_25px_#00b9ff44] sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-cyan-300">One last choice</p>
            <h2 id="crew-share-title" className="mt-2 text-2xl font-black">Share this pick with your Crew?</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">Only people you approve for your Crew can see that you picked <strong className="text-white">{productTitle}</strong>. They won’t see your payment details or wallet. This does not change your entry or chances.</p>
            <p className="mt-3 text-xs leading-5 text-white/60">You can turn sharing on or off for each entry anytime in <Link href="/account/crew" className="font-bold text-cyan-300 underline">Account → Your Crew</Link>. Nothing is shared publicly.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => chooseEntrySharing(false)} className="min-h-12 rounded-lg border border-cyan-300/50 bg-[#0c3154] px-4 py-2 font-bold hover:bg-[#13547a]">Keep private &amp; enter</button>
              <button type="button" onClick={() => chooseEntrySharing(true)} className="min-h-12 rounded-lg bg-[#55ee43] px-4 py-2 font-black text-[#052329] hover:bg-[#8bff7c]">Share with Crew &amp; enter</button>
            </div>
            <button type="button" onClick={() => setSharePromptOpen(false)} className="mt-3 w-full py-2 text-sm text-white/60 hover:text-white">Cancel</button>
          </section>
        </div>
      ), document.body) : null}

      <p className="mt-4 text-center text-[11px] leading-5 text-white/45">Preview-only activity. The debit, entry and result are written atomically to the development/test database. No real reward is issued.</p>
    </aside>
  );
}
