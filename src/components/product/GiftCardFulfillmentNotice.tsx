import Link from "next/link";

type GiftCardFulfillmentNoticeProps = {
  productTitle: string;
  retailer: string;
  value: number;
  isGiftCardOffering: boolean;
};

export function GiftCardFulfillmentNotice({ productTitle, retailer, value, isGiftCardOffering }: GiftCardFulfillmentNoticeProps) {
  return (
    <section aria-label="Prize fulfillment" className="mt-4 overflow-hidden rounded-2xl bg-white text-[#102044]">
      <div className="bg-[#0872fb] px-4 py-3 sm:px-5 sm:py-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-white">Prize issued as</p>
        <p className="mt-1 text-lg font-extrabold leading-[1.3] text-white sm:mt-2 sm:text-xl sm:leading-[1.45]">
          a <mark className="box-decoration-clone bg-[#ff7417] px-1.5 py-0.5 text-[#142047]">${value.toLocaleString()} {retailer} digital gift card</mark>
        </p>
      </div>
      <div className="px-4 py-3 text-sm leading-5 text-[#4c6282] sm:px-5 sm:py-4 sm:leading-6">
        <p>
          {!isGiftCardOffering && <>Zero Loss does not ship the {productTitle}. </>}
          If you win or complete your purchase, find your gift card details in{" "}
          <Link href="/account/wallet" className="font-extrabold text-[#bd4b00] underline-offset-2 hover:underline focus-visible:underline">Gift Cards &amp; Rewards</Link>.
          {isGiftCardOffering && <> It is not Playable Balance or withdrawable cash.</>}
          {" "}Use it online or in store where accepted, subject to {retailer}&apos;s terms.
        </p>
      </div>
    </section>
  );
}
