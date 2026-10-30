import { SharedProductControls } from "@/components/product/SharedProductControls";
import { getSharedProductContext } from "@/lib/sharing/receiving-reader";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoParticipationPanel } from "@/components/product/DemoParticipationPanel";
import { RememberViewedProduct } from "@/components/product/RememberViewedProduct";
import { ResetDemoPoolButton } from "@/components/product/ResetDemoPoolButton";
import { GiftCardFulfillmentNotice } from "@/components/product/GiftCardFulfillmentNotice";
import { ProductInfoDialog } from "@/components/product/ProductInfoDialog";
import { ProductEntryAutoScroll } from "@/components/product/ProductEntryAutoScroll";
import entryStyles from "@/components/product/product-entry-layout.module.css";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";
import { buildProductMetadata } from "@/lib/catalog/product-metadata";
import { getAccountContext } from "@/lib/account/context";
import { randomUUID } from "node:crypto";
import { getOfferingAvailability } from "@/lib/catalog/availability-reader";
import { parseEntryQuantity } from "@/lib/entries/return-intent";
import { freeEntryHref, productBrowseReturnHref, productBrowseReturnLabel } from "@/lib/catalog/product-return";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/supabase/server";
import { getEntryRequestHead, type EntryRequestHead } from "@/lib/entries/request-head";
import { resolvedCatalogSlugs } from "@/lib/catalog/demo-visibility";
import { resolvedProductDestination } from "@/lib/catalog/resolved-destination";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ share?: string | string[]; shared?: string | string[]; saveShared?: string | string[]; quantity?: string | string[]; from?: string | string[]; funded?: string | string[] }> };

export function generateStaticParams() {
  return demoProducts.map((product) => ({ id: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getDemoProduct(id);
  if (!product) return {};
  return buildProductMetadata(product);
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
  const sharedContext = await getSharedProductContext(product.slug, query.share, Boolean(account));
  const sharedControls = sharedContext || query.shared === "1" ? <SharedProductControls key={sharedContext?.token ?? product.slug} slug={product.slug} initial={sharedContext} signedIn={Boolean(account)} saveOnReturn={query.saveShared === "1"} /> : null;
  const alreadyResolved = resolvedCatalogSlugs(account?.activity).includes(product.slug);
  const savedResult = resolvedProductDestination(account?.activity, product.slug);
  const requestHead: EntryRequestHead = !alreadyResolved && account?.wallet?.scope === "demo" && isPreviewDataEnvironment()
    ? await getEntryRequestHead(await createClient(), product.slug)
    : { ready: true, requestId: null };
  const current = availability?.[product.slug];
  const isGiftCardOffering = /gift card|shopping reward/i.test(product.title);
  const entryPrice = current ? current.entryPriceCents / 100 : product.entryPrice;
  const participationPanel = alreadyResolved ? (
    <section className="mt-5 rounded-2xl border border-cyan-300/40 bg-[#073665] p-5" role="status">
      <h2 className="text-lg font-extrabold">You already took part in this prize</h2>
      <p className="mt-2 text-sm leading-6 text-white/75">{savedResult?.description}</p>
      <Link href={savedResult?.href ?? "/account/entries"} className="mt-4 inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-center text-sm font-extrabold leading-5 text-[#00132e]"><span>{savedResult?.label ?? "View your saved result"}</span><span aria-hidden="true">→</span></Link>
    </section>
  ) : (
    <DemoParticipationPanel compact key={`${product.slug}:${requestedQuantity}`} productSlug={product.slug} browseReturnHref={query.from === undefined ? undefined : browseReturnHref} requestKey={randomUUID()} requestHead={requestHead} productTitle={product.title} retailer={product.retailer} productValue={product.value} entryPrice={entryPrice} sold={current?.sold ?? product.sold} capacity={current?.capacity ?? product.capacity} initialQuantity={requestedQuantity} availabilityConfirmed={Boolean(current)} balanceLabel={account?.balanceLabel ?? "Sign in to view"} balanceCents={account?.wallet?.balanceCents ?? null} isDemoWallet={account?.wallet?.scope === "demo"} isPreviewExperience={isPreviewDataEnvironment()} isSignedIn={Boolean(account)} highlightAfterFunding={query.funded === "1"} extraEntryExplainerAcknowledged={account?.extraEntryExplainerAcknowledged ?? false} signedOutCompact={!account} />
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
  const entryDetails = <>
    <p>Each ${entryPrice.toFixed(2)} entry is a separate chance. Entries never combine into a larger payment or a better chance for one ticket.</p>
    <p>A non-selected paid entry has its own optional 30-day right to complete this {product.retailer} offer by paying the remaining ${(Math.max(0, product.value - entryPrice)).toFixed(2)}. The option and its deadline appear in My Activity after the outcome. Completing it issues the same ${product.value.toLocaleString()} {product.retailer} digital gift card.</p>
    <p>Entry payments and completion options do not stack with one another or with Playable Balance. An expired or declined option is not a general-purpose credit.</p>
    <p>{isGiftCardOffering ? "This gift card is not Playable Balance or withdrawable cash." : `Zero Loss does not ship the ${product.title} directly.`} Find an issued card in <Link href="/account/wallet" className="font-bold text-cyan-300 underline">Gift Cards &amp; Rewards</Link> and use it online or in store where accepted, subject to {product.retailer}&apos;s terms.</p>
    <p>No purchase necessary. <Link href={freeEntryHref(product.slug, query.from)} className="font-bold text-cyan-300 underline">Free-entry instructions →</Link></p>
    <p><Link href="/terms" className="font-bold text-cyan-300 underline">Preview terms and Official Rules status →</Link></p>
  </>;

  return <div className={entryStyles.page}>
    {!alreadyResolved ? <RememberViewedProduct slug={product.slug} browseReturn={query.from === undefined ? undefined : browseReturnHref} /> : null}
    <ProductEntryAutoScroll productKey={`${product.slug}:${requestedQuantity}:${query.funded ?? ""}`} />
    <section id="product-entry-card" className={entryStyles.card} aria-label={`${product.title} entry details`}>
      <div className={entryStyles.nav}>
        <Link href={browseReturnHref}>← Back to {browseReturnLabel}</Link>
        <ProductInfoDialog title="How entries and completion work" label="Entry details">{entryDetails}</ProductInfoDialog>
      </div>
      {sharedControls ? <div className={entryStyles.shared}>{sharedControls}</div> : null}
      <ProductGallery compact gallery={product.gallery} title={product.title} slug={product.slug} />
      <div className={entryStyles.heading}><p>{product.category}</p><h1>{product.title}</h1></div>
      {account ? <ProductShareButton className={entryStyles.share} product={{ slug: product.slug, title: product.title, image: product.gallery[0]?.src, retailer: product.retailer, value: product.value }} /> : null}
      <GiftCardFulfillmentNotice compact productTitle={product.title} retailer={product.retailer} value={product.value} isGiftCardOffering={isGiftCardOffering} />
      {alreadyResolved ? <div className={entryStyles.resolved}>{participationPanel}</div> : participationPanel}
      <div className={entryStyles.more}>
        <ProductInfoDialog title="Product details" label="Product details">{productDetails}</ProductInfoDialog>
        {!alreadyResolved ? <Link href={freeEntryHref(product.slug, query.from)}>Prefer to enter without a purchase?</Link> : null}
      </div>
      {isPreviewDataEnvironment() && account?.wallet?.scope === "demo" && current?.remaining === 0 && !current.repeatableScenario ? <div className={entryStyles.poolReset}><ResetDemoPoolButton slug={product.slug} /></div> : null}
    </section>
    <section className={`${entryStyles.after} grid gap-4 rounded-3xl border border-white/12 bg-[#001b3d] p-6 sm:grid-cols-3 sm:p-8`}>
      <div><strong className="text-cyan-300">Transparent capacity</strong><p className="mt-2 text-sm leading-6 text-white/65">Entry totals and remaining capacity are shown directly from this demo pool.</p></div>
      <div><strong className="text-cyan-300">Official rules stay accessible</strong><p className="mt-2 text-sm leading-6 text-white/65">Eligibility, free-entry details, and completion terms will remain one tap away.</p></div>
      <div><strong className="text-cyan-300">Retailer gift-card fulfillment</strong><p className="mt-2 text-sm leading-6 text-white/65">Zero Loss issues the advertised retailer gift-card value. Product selection, inventory, checkout and shipping remain with the retailer.</p></div>
    </section>
  </div>;
}
