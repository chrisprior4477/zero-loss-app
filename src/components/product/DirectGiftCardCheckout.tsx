"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { purchaseDirectDemoGiftCard } from "@/lib/account/direct-gift-card-actions";
import { fundingHref } from "@/lib/wallet/funding-navigation";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { FundingNoticeDialog } from "@/components/wallet/FundingNoticeDialog";
import styles from "./product-entry-layout.module.css";

type Props = {
  slug: string;
  title: string;
  priceCents: number;
  ownerId?: string;
  balanceCents?: number;
  canFund: boolean;
  returnTo: string;
  browseReturn?: string;
};

type Result = Awaited<ReturnType<typeof purchaseDirectDemoGiftCard>>;
const button = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#31e800] px-4 py-2 text-center font-black text-[#00132e] disabled:opacity-60";

export function DirectGiftCardCheckout({ slug, title, priceCents, ownerId, balanceCents, canFund, returnTo, browseReturn }: Props) {
  const router = useRouter();
  const descriptionId = useId();
  const [review, setReview] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const request = useRef<string | null>(null);
  const price = formatUsdFromCents(priceCents);
  const funding = fundingHref(slug, undefined, undefined, browseReturn);
  const storageKey = `zero-loss-direct-card:${ownerId}:${slug}`;
  const hasBalance = balanceCents !== undefined && balanceCents >= priceCents;

  function openReview() {
    let saved: string | null = null;
    try { saved = sessionStorage.getItem(storageKey); } catch { /* The open form still supports retries. */ }
    request.current = request.current ?? saved ?? crypto.randomUUID();
    setResult(saved ? { status: "uncertain", message: "A previous purchase still needs confirmation. Check its status here." } : null);
    setReview(true);
  }

  function purchase() {
    if (!request.current || inFlight.current) return;
    const requestId = request.current;
    inFlight.current = true;
    try { sessionStorage.setItem(storageKey, requestId); } catch { /* Retain the key in this form. */ }
    startTransition(async () => {
      try {
        const outcome = await purchaseDirectDemoGiftCard(slug, requestId, priceCents);
        setResult(outcome);
        if (outcome.status !== "uncertain") {
          try { sessionStorage.removeItem(storageKey); } catch { /* The original key still prevents duplicate debits. */ }
        }
        if (outcome.status === "succeeded") {
          setReview(false);
          router.push(outcome.href);
        }
      } catch {
        setResult({ status: "uncertain", message: "We couldn’t confirm your purchase. Check this same purchase before starting another." });
      } finally {
        inFlight.current = false;
      }
    });
  }

  return <section id="enter-entry" className={styles.panel} aria-label="Buy gift card">
    <p className="font-bold">{price} from your Playable Wallet</p>
    <p className={styles.terms}>Your demo gift card goes straight to Gift Cards &amp; Rewards after you confirm. Simulation only. The gift card cannot be redeemed.</p>
    {result?.status === "succeeded" ? <Link className={button} href={result.href}>Open your gift card</Link>
      : !ownerId ? <Link className={button} href={authNavigationHref("/login", returnTo)}>Sign in to buy</Link>
      : balanceCents === undefined ? <p role="status">Your demo wallet is unavailable right now.</p>
      : <>
        <p className={styles.terms}>Playable Wallet balance {formatUsdFromCents(balanceCents)}</p>
        <button className={button} type="button" onClick={openReview}>{hasBalance ? "Buy gift card" : "Review gift-card purchase"}</button>
        {!hasBalance && canFund && <Link className="inline-flex min-h-11 items-center font-bold text-cyan-200 underline" href={funding}>Add demo funds</Link>}
      </>}
    {review && <FundingNoticeDialog label="Confirm gift-card purchase" description={descriptionId} closeLabel="Close purchase confirmation" onClose={() => setReview(false)} busy={pending}>
      <h2 className="pr-10 text-xl font-black">Buy {title}?</h2>
      <p id={descriptionId} className="my-3">Pay {price} from your Playable Wallet. We’ll issue the demo gift card immediately.</p>
      {result && result.status !== "succeeded" ? <p className="mb-3 font-bold" role="alert">{result.message}</p> : null}
      {result?.status === "balance" || !hasBalance && result?.status !== "uncertain"
        ? canFund ? <Link className={button} href={funding}>Add demo funds</Link> : <p>Add funds is unavailable for this wallet.</p>
        : <button className={button} type="button" onClick={purchase} disabled={pending}>
          {pending ? "Checking purchase…" : result?.status === "uncertain" ? "Check this purchase" : `Confirm ${price} demo purchase`}
        </button>}
      <button className="ml-3 min-h-11 font-bold underline" type="button" onClick={() => setReview(false)} disabled={pending}>Cancel</button>
    </FundingNoticeDialog>}
  </section>;
}
