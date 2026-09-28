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
      <div className="bg-[#0872fb] px-4 py-5 sm:px-5">
        <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-white">Prize issued as</p>
        <p className="mt-2 text-lg font-extrabold leading-[1.45] text-white sm:text-xl">
          a <mark className="box-decoration-clone bg-[#ff7417] px-1.5 py-0.5 text-[#142047]">${value.toLocaleString()} {retailer} digital gift card</mark>
        </p>
      </div>
      <div className="px-4 py-4 text-sm leading-6 text-[#4c6282] sm:px-5">
        <p>
          {!isGiftCardOffering && <>Zero Loss does not ship the {productTitle}. </>}
          If you win or complete your purchase, find your card number and barcode in{" "}
          <Link href="/account/wallet" className="font-extrabold text-[#bd4b00] underline-offset-2 hover:underline focus-visible:underline">Gift Cards &amp; Rewards</Link>.
          {isGiftCardOffering && <> This is not Playable Balance or withdrawable cash.</>}
        </p>
        <hr className="my-4 border-0 border-t-2 border-dotted border-[#b9cde6]" />
        <p>Use it according to {retailer}&apos;s redemption terms, online or in store where accepted.</p>
      </div>
    </section>
  );
}
