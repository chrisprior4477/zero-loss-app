import Link from "next/link";

type GiftCardFulfillmentNoticeProps = {
  productTitle: string;
  retailer: string;
  value: number;
  isGiftCardOffering: boolean;
};

export function GiftCardFulfillmentNotice({ productTitle, retailer, value, isGiftCardOffering }: GiftCardFulfillmentNoticeProps) {
  return (
    <section aria-label="Prize fulfillment" className="mt-4">
      <details className="group overflow-hidden rounded-xl bg-white text-[#102044]">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 bg-[#0872fb] px-4 py-2.5 text-sm font-extrabold leading-5 text-white marker:hidden focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden sm:px-5">
          <span>Prize issued as a <strong>${value.toLocaleString()} {retailer} digital gift card</strong></span>
          <span aria-hidden="true" className="shrink-0 text-xl leading-none transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="px-4 py-3 text-sm leading-5 text-[#4c6282] sm:px-5">
          <p>
            {!isGiftCardOffering && <>Zero Loss does not ship the {productTitle}. </>}
            If you win or complete your purchase, find your gift card details in{" "}
            <Link href="/account/wallet" className="font-extrabold text-[#bd4b00] underline-offset-2 hover:underline focus-visible:underline">Gift Cards &amp; Rewards</Link>.
            {isGiftCardOffering && <> It is not Playable Balance or withdrawable cash.</>}
            {" "}Use it online or in store where accepted, subject to {retailer}&apos;s terms.
          </p>
        </div>
      </details>
    </section>
  );
}

export function SignedOutRewardSummary({ retailer, value, isGiftCardOffering }: GiftCardFulfillmentNoticeProps) {
  return (
    <section aria-label="Prize fulfillment" className="rounded-2xl bg-[#0872df] px-4 py-3 text-white sm:px-5 sm:py-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-white/80">If you win or complete</p>
      <p className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">${value.toLocaleString()} {retailer} digital gift card</p>
      <p className="mt-1 text-sm leading-5 text-white/90">
        {isGiftCardOffering
          ? `Use it for eligible purchases at ${retailer}.`
          : `Use it for the pictured product or another eligible purchase at ${retailer}.`}
      </p>
    </section>
  );
}
