import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPopularRewardBrand, popularRewardAmounts, popularRewardBrands, popularRewardProductSlug } from "@/lib/catalog/popular-rewards";

type Props = { params: Promise<{ brand: string }> };

export function generateStaticParams() {
  return popularRewardBrands.map((brand) => ({ brand: brand.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = getPopularRewardBrand((await params).brand);
  return brand ? { title: `${brand.name} Gift Card Rewards`, description: `Choose a ${brand.name} digital gift-card offering.` } : {};
}

export default async function RewardBrandPage({ params }: Props) {
  const brand = getPopularRewardBrand((await params).brand);
  if (!brand) notFound();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/#popular-rewards" className="text-sm font-bold text-cyan-300 hover:text-white">← Back to Popular Rewards</Link>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.15em] text-[#31e800]">Popular Reward · Digital fulfillment</p>
        <h1 className="mt-2 text-4xl font-black sm:text-6xl">Choose your {brand.name} reward</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">Pick a value to go to its $1 entry area. You can review the complete demo offering before you enter.</p>

        <section className="mt-9 grid gap-5 sm:grid-cols-2" aria-label={`${brand.name} gift-card values`}>
          {popularRewardAmounts.map((amount) => (
            <Link key={amount} href={`/items/${popularRewardProductSlug(brand.slug, amount)}#enter-entry`} className="group rounded-3xl border border-white/15 bg-white/6 p-4 transition hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
              <div className="relative aspect-[8/5] overflow-hidden rounded-2xl bg-white p-2 sm:p-3">
                <Image src={`/catalog/reward-cards/${brand.artFile}`} alt={`${brand.name} gift card`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-contain p-2 sm:p-3" />
                <span className="absolute bottom-3 right-3 grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-[#ff630f] text-xl font-black text-white shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:bottom-5 sm:right-5 sm:h-20 sm:w-20 sm:text-2xl">${amount}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-4 sm:gap-4">
                <div className="min-w-0"><h2 className="text-lg font-extrabold leading-tight sm:text-xl">${amount} {brand.name} Gift Card</h2><p className="mt-1 text-sm text-white/55">$1 per entry · Investor demo</p></div>
                <span className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#31e800] px-3 text-xs font-extrabold text-[#00132e] transition-colors group-hover:bg-[#72ff4e] sm:px-4 sm:text-sm">Enter for $1</span>
              </div>
            </Link>
          ))}
        </section>

        <p className="mt-8 rounded-2xl border border-white/12 bg-white/5 p-5 text-sm leading-6 text-white/60">These are preview offerings. A confirmed preview customer can create one database-backed demo entry per product. No real money, gift card, barcode, or retailer inventory is issued.</p>
      </div>
    </main>
  );
}
