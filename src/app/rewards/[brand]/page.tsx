import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getPopularRewardBrand, popularRewardAmounts, popularRewardBrands, popularRewardProductSlug, popularRewardsReturnHref } from "@/lib/catalog/popular-rewards";
import { productHrefWithBrowseReturn } from "@/lib/catalog/product-return";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { DemoOutcomeLetter } from "@/components/catalog/DemoOutcomeLetter";
import { demoProducts } from "@/lib/catalog/demo-products";
import { matchesCatalogMerchant } from "@/lib/catalog/search-denomination";
import { isGiftCardListing } from "@/lib/catalog/navigation";

type Props = { params: Promise<{ brand: string }> };

export function generateStaticParams() {
  return popularRewardBrands.map((brand) => ({ brand: brand.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const brand = getPopularRewardBrand((await params).brand);
  return brand ? { title: `${brand.name} Gift Card Rewards`, description: `Choose a ${brand.name} digital gift-card offering.` } : {};
}

export default async function RewardBrandPage({ params }: Props) {
  const { brand: requestedBrand } = await params;
  const brand = getPopularRewardBrand(requestedBrand.toLowerCase());
  if (!brand) notFound();
  if (requestedBrand !== brand.slug) permanentRedirect(`/rewards/${brand.slug}`);
  const { hidden, unavailable } = await getShoppingCatalog();
  const offers: { amount: number; slug: string; title?: string }[] = popularRewardAmounts.map(amount => ({ amount, slug: popularRewardProductSlug(brand.slug, amount) }))
    .filter(({ amount, slug }) => !hidden.has(slug) || (amount === 100 && !unavailable));
  const values = new Set<number>(popularRewardAmounts);
  for (const product of demoProducts) {
    if (hidden.has(product.slug) || values.has(product.value) || !isGiftCardListing(product)
      || popularRewardProductSlug(brand.slug, product.value) !== product.slug
      || !matchesCatalogMerchant(product.retailer, brand.name)) continue;
    offers.push({ amount: product.value, slug: product.slug, title: product.title });
    values.add(product.value);
  }
  offers.sort((left, right) => right.amount - left.amount);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12">
      <HelpLandingScroll target="" visitKey={brand.slug} focusAnchorPrefix="prize-" focusAnchor="reward-values" missingAnchorTarget="reward-values" />
      <div className="mx-auto max-w-6xl">
        <Link href={popularRewardsReturnHref(brand.slug)} className="text-sm font-bold text-cyan-300 hover:text-white">← Back to Popular Rewards</Link>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.15em] text-[#31e800]">Popular Reward · Digital fulfillment</p>
        <h1 className="mt-2 text-4xl font-black sm:text-6xl">Choose your {brand.name} reward</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">Pick a value to go to its $1 entry area. You can review the complete demo offering before you enter.</p>

        <section id="reward-values" tabIndex={-1} className="mt-9 grid gap-5 sm:grid-cols-2" aria-label={`${brand.name} gift-card values`}>
          {!offers.length && <p role="status">{unavailable ? "Prize availability could not be loaded. Refresh to check again." : "There are no open gift-card offers for this retailer right now."} <Link href="/browse" className="font-bold text-cyan-300">Browse available prizes →</Link></p>}
          {offers.map(({ amount, slug, title }) => {
            const open = !hidden.has(slug);
            const cardClass = "scroll-mt-40 rounded-3xl border border-white/15 bg-white/6 p-4";
            const card = <>
              <div className="relative aspect-[8/5] overflow-hidden rounded-2xl bg-white p-2 sm:p-3">
                {open && <DemoOutcomeLetter product={slug} />}
                <Image src={brand.imagePath} alt={`${brand.name} gift card`} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-contain p-2 sm:p-3" />
                <span className="absolute bottom-3 right-3 grid h-16 w-16 place-items-center rounded-full border-2 border-white bg-[#ff630f] text-xl font-black text-[#00132e] shadow-[0_8px_24px_rgba(0,0,0,.35)] sm:bottom-5 sm:right-5 sm:h-20 sm:w-20 sm:text-2xl">${amount}</span>
              </div>
              <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-4 sm:gap-4">
                <div className="min-w-0"><h2 className="text-lg font-extrabold leading-tight sm:text-xl">{title ?? `$${amount} ${brand.name} Gift Card`}</h2><p className="mt-1 text-sm text-white/65">{open ? "$1 per entry · Investor demo" : "No open entries"}</p></div>
                {open && <span className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#31e800] px-3 text-xs font-extrabold text-[#00132e] transition-colors group-hover:bg-[#72ff4e] sm:px-4 sm:text-sm">Enter for $1</span>}
              </div>
            </>;
            return open ? (
              <Link key={amount} id={`prize-${slug}`} href={`${productHrefWithBrowseReturn(slug, `/rewards/${brand.slug}#prize-${slug}`)}#enter-entry`} className={`${cardClass} group transition hover:-translate-y-1 hover:border-cyan-300/70 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300`}>{card}</Link>
            ) : <article key={amount} tabIndex={-1} id={`prize-${slug}`} className={cardClass}>{card}</article>;
          })}
        </section>

        <p className="mt-8 rounded-2xl border border-white/12 bg-white/5 p-5 text-sm leading-6 text-white/60">These are preview offerings. A confirmed preview customer can choose how many available demo entries to add. Each entry remains a separate chance. No real money, gift card, barcode, or retailer inventory is issued.</p>
      </div>
    </div>
  );
}
