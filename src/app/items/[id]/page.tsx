import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoParticipationPanel } from "@/components/product/DemoParticipationPanel";
import { ResetDemoPoolButton } from "@/components/product/ResetDemoPoolButton";
import { GiftCardFulfillmentNotice, SignedOutRewardSummary } from "@/components/product/GiftCardFulfillmentNotice";
import { ProductGallery } from "@/components/product/ProductGallery";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";
import { getAccountContext } from "@/lib/account/context";
import { randomUUID } from "node:crypto";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { parseEntryQuantity } from "@/lib/entries/return-intent";
import { productBrowseReturnHref, productBrowseReturnLabel } from "@/lib/catalog/product-return";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/supabase/server";
import { getEntryRequestHead, type EntryRequestHead } from "@/lib/entries/request-head";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ quantity?: string | string[]; from?: string | string[] }> };

export function generateStaticParams() {
  return demoProducts.map((product) => ({ id: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getDemoProduct(id);
  if (!product) return {};
  return { title: product.title, description: product.summary };
}

export default async function ItemPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const requestedQuantity = parseEntryQuantity(query.quantity) ?? 1;
  const browseReturnHref = productBrowseReturnHref(query.from);
  const browseReturnLabel = productBrowseReturnLabel(browseReturnHref);
  const product = getDemoProduct(id);
  if (!product) notFound();
  const [account, availability] = await Promise.all([getAccountContext(), getOfferingAvailability()]);
  const requestHead: EntryRequestHead = account?.wallet?.scope === "demo" && isPreviewDataEnvironment()
    ? await getEntryRequestHead(await createClient(), product.slug)
    : { ready: true, requestId: null };
  const current = availability?.[product.slug];
  const isGiftCardOffering = /gift card|shopping reward/i.test(product.title);
  const entryPrice = current ? current.entryPriceCents / 100 : product.entryPrice;
  const participationPanel = (
    <DemoParticipationPanel key={`${product.slug}:${requestedQuantity}`} productSlug={product.slug} requestKey={randomUUID()} requestHead={requestHead} productTitle={product.title} retailer={product.retailer} productValue={product.value} entryPrice={entryPrice} sold={current?.sold ?? product.sold} capacity={current?.capacity ?? product.capacity} initialQuantity={requestedQuantity} availabilityConfirmed={Boolean(current)} balanceLabel={account?.balanceLabel ?? "Sign in to view"} balanceCents={account?.wallet?.balanceCents ?? null} isDemoWallet={account?.wallet?.scope === "demo"} isPreviewExperience={isPreviewDataEnvironment()} isSignedIn={Boolean(account)} extraEntryExplainerAcknowledged={account?.extraEntryExplainerAcknowledged ?? false} signedOutCompact={!account} />
  );
  const productDetails = (
    <section className="rounded-3xl border border-white/12 bg-white/5 p-5 sm:p-8">
      <h2 className="text-2xl font-extrabold">Product details</h2>
      <p className="mt-3 max-w-3xl leading-7 text-white/75">{product.summary}</p>
      <div className="mt-7 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="font-bold text-cyan-300">Highlights</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-white/80">
            {product.highlights.map((highlight) => <li key={highlight} className="flex gap-2"><span className="text-[#31e800]">✓</span><span>{highlight}</span></li>)}
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-cyan-300">What&apos;s included</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-white/80">
            {product.included.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>
      <dl className="mt-8 grid gap-x-8 sm:grid-cols-2">
        {product.specifications.map((specification) => (
          <div key={specification.label} className="flex justify-between gap-4 border-t border-white/12 py-3 text-sm">
            <dt className="text-white/55">{specification.label}</dt>
            <dd className="text-right font-semibold text-white/90">{specification.value}</dd>
          </div>
        ))}
      </dl>
      {product.note && <p className="mt-5 rounded-xl bg-white/6 p-4 text-xs leading-5 text-white/60">{product.note}</p>}
      <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block text-xs font-bold text-cyan-300 hover:text-white">View {product.sourceLabel} ↗</a>
    </section>
  );
  const freeEntryDetails = (
    <Link href={`/free-entry?offering=${product.slug}`} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#31e800] px-5 py-3 text-center font-extrabold text-[#002719] transition hover:bg-[#66f34c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
      Prefer to enter without a purchase?
    </Link>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-4 text-white sm:px-7 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href={browseReturnHref} className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-white">← Back to {browseReturnLabel}</Link>

        {account ? <div className="mt-3 flex flex-col gap-4 sm:mt-6 sm:gap-8 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:items-start">
          <div className="contents lg:block">
            <ProductGallery gallery={product.gallery} title={product.title} slug={product.slug} />
            <div className="order-3 lg:mt-8">{productDetails}</div>
          </div>

          <div className="order-2 lg:sticky lg:top-32 lg:order-none">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{product.category}</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{product.title}</h1>
            <GiftCardFulfillmentNotice productTitle={product.title} retailer={product.retailer} value={product.value} isGiftCardOffering={isGiftCardOffering} />
            {participationPanel}
            <div className="mt-4">{freeEntryDetails}</div>
            {isPreviewDataEnvironment() && account.wallet?.scope === "demo" && current?.remaining === 0 && !current.repeatableScenario ? <ResetDemoPoolButton slug={product.slug} /> : null}
          </div>
        </div> : <div className="mt-3 grid min-w-0 gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:items-start lg:gap-8">
          <ProductGallery gallery={product.gallery} title={product.title} slug={product.slug} signedOutCompact />
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{product.category}</p>
              <h1 className="mt-1 text-[1.65rem] font-extrabold leading-tight sm:text-4xl">{product.title}</h1>
            </div>
            <SignedOutRewardSummary productTitle={product.title} retailer={product.retailer} value={product.value} isGiftCardOffering={isGiftCardOffering} />
            {participationPanel}
            <details className="group rounded-2xl border border-cyan-300/30 bg-[#0a2b51] open:border-cyan-300/60">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-extrabold text-white marker:hidden focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden sm:text-base">
                How entries and completion work <span aria-hidden="true" className="text-cyan-300 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-3 border-t border-cyan-300/20 px-4 py-4 text-sm leading-6 text-white/75">
                <p>Each ${entryPrice.toFixed(2)} entry is a separate chance. Entries never combine into a larger payment or a better chance for one ticket.</p>
                <p>A non-selected paid entry has its own optional 30-day right to complete this {product.retailer} offer by paying the remaining ${(Math.max(0, product.value - entryPrice)).toFixed(2)}. The option and its deadline appear in My Activity after the outcome. Completing it issues the same ${product.value.toLocaleString()} {product.retailer} digital gift card.</p>
                <p>Entry payments and completion options do not stack with one another or with Playable Balance. An expired or declined option is not a general-purpose credit.</p>
                <p>{isGiftCardOffering ? "This gift card is not Playable Balance or withdrawable cash." : `Zero Loss does not ship the ${product.title} directly.`} Find an issued card in <Link href="/account/wallet" className="font-bold text-cyan-300 underline-offset-2 hover:underline">Gift Cards &amp; Rewards</Link> and use it online or in store where accepted, subject to {product.retailer}&apos;s terms.</p>
                <Link href="/terms" className="inline-block font-bold text-cyan-300 underline-offset-2 hover:underline">Read the preview terms and Official Rules status →</Link>
              </div>
            </details>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/75">
              <span>No purchase necessary.</span>
              <Link href={`/free-entry?offering=${product.slug}`} className="font-bold text-cyan-300 underline-offset-2 hover:underline">Free-entry instructions →</Link>
              <Link href="/terms" className="font-bold text-cyan-300 underline-offset-2 hover:underline">Preview terms and Official Rules status →</Link>
            </p>
            {freeEntryDetails}
            {productDetails}
          </div>
        </div>}

        <section className="mt-10 grid gap-4 rounded-3xl border border-white/12 bg-[#001b3d] p-6 sm:grid-cols-3 sm:p-8">
          <div><strong className="text-cyan-300">Transparent capacity</strong><p className="mt-2 text-sm leading-6 text-white/65">Entry totals and remaining capacity are shown directly from this demo pool.</p></div>
          <div><strong className="text-cyan-300">Official rules stay accessible</strong><p className="mt-2 text-sm leading-6 text-white/65">Eligibility, free-entry details, and completion terms will remain one tap away.</p></div>
          <div><strong className="text-cyan-300">Retailer gift-card fulfillment</strong><p className="mt-2 text-sm leading-6 text-white/65">Zero Loss issues the advertised retailer gift-card value. Product selection, inventory, checkout and shipping remain with the retailer.</p></div>
        </section>
      </div>
    </main>
  );
}
