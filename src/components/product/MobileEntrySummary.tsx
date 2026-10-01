import Link from "next/link";

type MobileEntrySummaryProps = {
  entryPrice: number;
  giftCardValue: number;
  retailer: string;
  remaining: number | null;
};

export function MobileEntrySummary({ entryPrice, giftCardValue, retailer, remaining }: MobileEntrySummaryProps) {
  return (
    <section aria-label="Entry at a glance" className="mt-4 rounded-2xl bg-white p-4 text-[#102044] sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <p><strong className="text-2xl font-black">${entryPrice.toFixed(2)}</strong><span className="ml-1 text-sm font-bold">per entry</span></p>
        {remaining !== null ? <span className="text-right text-xs font-extrabold text-[#b9470a]">{remaining === 0 ? "No entries left" : `${remaining.toLocaleString()} left`}</span> : null}
      </div>
      <p className="mt-1 text-sm leading-5 text-[#4c6282]">Win or complete to receive a <strong className="text-[#102044]">${giftCardValue.toLocaleString()} {retailer} digital gift card</strong>.</p>
      <Link href="#enter-entry" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-[#00b9ff] px-4 py-2 text-base font-extrabold text-[#00132e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0872fb]">
        {remaining === 0 ? "View entry status ↓" : `See $${entryPrice.toFixed(2)} entry ↓`}
      </Link>
    </section>
  );
}
