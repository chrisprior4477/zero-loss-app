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
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">Pick a value to view the complete demo offering, entry choices, completion explanation, and free-entry information.</p>

        <section className="mt-9 grid gap-5 sm:grid-cols-2" aria-label={`${brand.name} gift-card values`}>
          {popularRewardAmounts.map((amount) => (
            <Link key={amount} href={`/items/${popularRewardProductSlug(brand.slug, amount)}`} className="group rounded-3xl border border-white/15 bg-white/6 p-4 transition hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">
              <div className="relative aspect-[8/5] overflow-hidden rounded-2xl bg-white p-2 sm:p-3">
                <Image src={`/catalog/reward-cards/${brand.artFile}`} alt={`${brand.name} gift card`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-contain p-2 sm:p-3" />
                <span className="absolute bottom-3 right-3 grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-[#ff630f] text-xl font-black text-white shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:bottom-5 sm:right-5 sm:h-20 sm:w-20 sm:text-2xl">${amount}</span>
              </div>
              <div className="flex items-center justify-between gap-4 px-2 pb-1 pt-4">
                <div><h2 className="text-xl font-extrabold">${amount} {brand.name} Gift Card</h2><p className="mt-1 text-sm text-white/55">$1 per entry · Investor demo</p></div>
                <span className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-extrabold text-[#00132e] group-hover:bg-[#31e800]">View →</span>
              </div>
            </Link>
          ))}
        </section>

        <p className="mt-8 rounded-2xl border border-white/12 bg-white/5 p-5 text-sm leading-6 text-white/60">These are prototype offerings. Availability, denominations, provider authorization, official rules, and entry capacity require confirmation before activation. No purchase or entry is created in this walkthrough.</p>
      </div>
    </main>
  );
}
