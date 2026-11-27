import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";
import { SharedProductControls } from "@/components/product/SharedProductControls";
import { shareUuid } from "@/lib/sharing/saved-shares";
import { getSharedProductContext } from "@/lib/sharing/receiving-reader";
import type { Metadata } from "next";
import { matchingQueryValue } from "@/lib/navigation/query-value";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { DemoParticipationPanel } from "@/components/product/DemoParticipationPanel";
import { FreeEntryLink, ProductEntrySelection } from "@/components/product/ProductEntrySelection";
import { RememberViewedProduct } from "@/components/product/RememberViewedProduct";
import { GiftCardFulfillmentNotice } from "@/components/product/GiftCardFulfillmentNotice";
import { ProductInfoDialog } from "@/components/product/ProductInfoDialog";
import { ProductEntryAutoScroll } from "@/components/product/ProductEntryAutoScroll";
import entryStyles from "@/components/product/product-entry-layout.module.css";
import { ProductGallery } from "@/components/product/ProductGallery";
import { SiteBreadcrumbs } from "@/components/layout/SiteBreadcrumbs";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";
import { buildProductMetadata } from "@/lib/catalog/product-metadata";
import { randomUUID } from "node:crypto";
import { getShoppingCatalog } from "@/lib/catalog/shopping-catalog";
import { parseEntryQuantity } from "@/lib/entries/return-intent";
import { productBrowseReturnHref, productBrowseReturnLabel, productBrowseReturnPath } from "@/lib/catalog/product-return";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { createClient } from "@/lib/personal-demo/shopper";
import { getEntryRequestHead, type EntryRequestHead } from "@/lib/entries/request-head";
import { resolvedProductDestination } from "@/lib/catalog/resolved-destination";
import { transactionOriginHref, transactionOriginParams } from "@/lib/wallet/ledger-return";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ share?: string | string[]; shared?: string | string[]; saveShared?: string | string[]; reviewShare?: string | string[]; quantity?: string | string[]; from?: string | string[]; funded?: string | string[]; transaction?: string | string[]; walletView?: string | string[]; fromOrders?: string | string[]; orderFilter?: string | string[] }> };

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
  const quantity = matchingQueryValue(query.quantity);
  const requestedQuantity = parseEntryQuantity(quantity);
  const transactionReturn = transactionOriginHref(query);
  const browseReturnHref = productBrowseReturnHref(transactionReturn ?? query.from);
  const browseReturnLabel = productBrowseReturnLabel(browseReturnHref);
  const product = getDemoProduct(id.toLowerCase());
  if (!product) notFound();
  const repeatedQuantity = Array.isArray(query.quantity) && requestedQuantity !== null;
  if (id !== product.slug || repeatedQuantity) {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) {
      if (name === "quantity" && repeatedQuantity && quantity) {
        params.set(name, quantity);
        continue;
      }
      for (const part of typeof value === "string" ? [value] : value ?? []) params.append(name, part);
    }
    permanentRedirect(`/items/${product.slug}${params.size ? `?${params}` : ""}${repeatedQuantity ? "#enter-entry" : ""}`);
  }
  const { account, availability, hidden, unavailable, unverifiedSlugs } = await getShoppingCatalog();
  const savedResult = resolvedProductDestination(account?.activity, product.slug);
  const hiddenPool = hidden.has(product.slug);
  const current = availability?.[product.slug];
  const remaining = current?.remaining ?? product.capacity - product.sold;
  const savedQuantityTooHigh = requestedQuantity !== null && Boolean(current) && requestedQuantity > remaining;
  const invalidBookmark = query.quantity !== undefined && (requestedQuantity === null || savedQuantityTooHigh)
    ? (typeof query.quantity === "string" ? query.quantity.slice(0, 32) : "") : null;
  const initialQuantity = invalidBookmark === null ? requestedQuantity ?? 1 : 1;
  const selectionKey = `${product.slug}:${initialQuantity}:${invalidBookmark ?? "valid"}`;
  const bookmarkedQuantityMessage = invalidBookmark === null ? undefined : savedQuantityTooHigh
    ? `You requested ${requestedQuantity?.toLocaleString("en-US")} entries. ${remaining.toLocaleString("en-US")} are available. Choose a quantity to continue.`
    : Array.isArray(query.quantity) && quantity === undefined
      ? "This link contains different ticket quantities. Choose one quantity to continue."
      : "This link contains an invalid quantity. Enter a whole number of tickets to continue.";
  const requestHead: EntryRequestHead = account && (hiddenPool || account.wallet?.scope === "demo") && isPreviewDataEnvironment()
    ? await getEntryRequestHead(await createClient(), product.slug)
    : { ready: true, requestId: null };
  // A holder of the last ticket still needs the existing confirm and undo controls.
  if (hiddenPool && ((!unavailable && !unverifiedSlugs?.has(product.slug)) || savedResult) && requestHead.ready && !requestHead.validating) {
    if (savedResult) {
      const origin = transactionOriginParams(query);
      const destination = new URL(savedResult.href, "https://navigation.invalid");
      const shoppingReturn = productBrowseReturnPath(query.from);
      if (!origin && shoppingReturn && destination.pathname === "/account/wallet" && destination.searchParams.has("rewardId")) {
        destination.searchParams.set("rewardBrowse", shoppingReturn);
      }
      for (const [key, value] of Object.entries(origin ?? {})) destination.searchParams.set(key, value);
      redirect(`${destination.pathname}${destination.search}${destination.hash}`);
    }
    const back = browseReturnHref.startsWith("/rewards/") && !browseReturnHref.includes("#") ? `${browseReturnHref}#reward-values` : browseReturnHref;
    return <div className="mx-auto max-w-3xl px-5 py-9 text-white">
      <HelpLandingScroll target="closed-prize" focusAnchor="closed-prize" />
      <h1 id="closed-prize" tabIndex={-1} className="text-3xl font-black">{product.title}</h1>
      <p role="status" className="mt-3 text-white/80">This offering is closed. Choose an available prize to enter.</p>
      <Link href={back} className="mt-5 inline-block font-bold text-cyan-300 underline">← Back to {browseReturnLabel}</Link>
    </div>;
  }
  const browseOrigin = new URL(browseReturnHref, "https://navigation.invalid");
  const shareId = browseOrigin.pathname === "/account/favorites" && browseOrigin.searchParams.get("tab") === "shared"
    ? browseOrigin.searchParams.get("share") : null;
  const savedShareId = account && shareId && shareUuid.test(shareId) ? shareId : undefined;
  const sharedContext = await getSharedProductContext(product.slug, query.share, Boolean(account), savedShareId);
  const unavailableShare = query.share !== undefined && !sharedContext;
  const shareToken = unavailableShare ? undefined : query.share;
  const shareReview = query.reviewShare === "options" || query.reviewShare === "membership" ? query.reviewShare : undefined;
  const sharedControls = unavailableShare ? (
    <p role="status" className="mb-3 rounded-lg bg-[#103757] px-4 py-3 text-sm text-white">This shared link couldn’t be opened. You can still view the prize below.</p>
  ) : sharedContext || savedShareId || query.shared === "1" ? <SharedProductControls key={`${account?.userId ?? "guest"}:${sharedContext?.token ?? product.slug}`} slug={product.slug} initial={sharedContext} signedIn={Boolean(account)} fromSavedShare={Boolean(savedShareId)} browseReturnHref={query.from !== undefined || transactionReturn ? browseReturnHref : undefined} saveOnReturn={query.saveShared === "1"} reviewOnReturn={shareReview} /> : null;
  const isGiftCardOffering = /gift card|shopping reward/i.test(product.title);
  const entryPrice = current ? current.entryPriceCents / 100 : product.entryPrice;
  const participationPanel = (
    <DemoParticipationPanel ownerId={account?.userId} compact key={selectionKey} productSlug={product.slug} shareToken={shareToken} browseReturnHref={query.from === undefined && !transactionReturn ? undefined : browseReturnHref} requestKey={randomUUID()} requestHead={requestHead} productTitle={product.title} retailer={product.retailer} productValue={product.value} entryPrice={entryPrice} sold={current?.sold ?? product.sold} capacity={current?.capacity ?? product.capacity} initialQuantity={initialQuantity} bookmarkedQuantityMessage={bookmarkedQuantityMessage} availabilityConfirmed={Boolean(current)} balanceLabel={account?.balanceLabel ?? "Sign in to view"} balanceCents={account?.wallet?.balanceCents ?? null} isDemoWallet={account?.wallet?.scope === "demo"} isPreviewExperience={isPreviewDataEnvironment()} isSignedIn={Boolean(account)} highlightAfterFunding={query.funded === "1"} extraEntryExplainerAcknowledged={account?.extraEntryExplainerAcknowledged ?? false} signedOutCompact={!account} />
  );
  const productDetails = (
    <section className={entryStyles.productInfoContent} aria-label={`${product.title} information`}>
      <p className={entryStyles.infoSummary}>{product.summary}</p>
      <div className={entryStyles.infoSections}>
        <div>
          <h3>Highlights</h3>
          <ul>
            {product.highlights.map((highlight) => <li key={highlight} className={entryStyles.infoHighlight}><span aria-hidden="true">✓</span><span>{highlight}</span></li>)}
          </ul>
        </div>
        <div>
          <h3>What&apos;s included</h3>
          <ul>
            {product.included.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>
      <dl className={entryStyles.infoSpecifications}>
        {product.specifications.map((specification) => (
          <div key={specification.label}>
            <dt>{specification.label}</dt>
            <dd>{specification.value}</dd>
          </div>
        ))}
      </dl>
      {product.note && <p className={entryStyles.infoNote}>{product.note}</p>}
      <a href={product.sourceUrl} target="_blank" rel="noreferrer" className={entryStyles.infoSource}>View {product.sourceLabel} ↗</a>
    </section>
  );
  const entryDetails = <>
    <p>Each ${entryPrice.toFixed(2)} entry is a separate chance. Entries never combine into a larger payment or a better chance for one ticket.</p>
    <p>A non-selected paid entry has its own optional 30-day right to complete this {product.retailer} offer by paying the remaining ${(Math.max(0, product.value - entryPrice)).toFixed(2)}. The option and its deadline appear in My Activity after the outcome. Completing it issues the same ${product.value.toLocaleString()} {product.retailer} digital gift card.</p>
              <p>Each entry’s dollar applies only to its own purchase option. You can pay that option’s remaining amount from your Playable Wallet. Separate entries and options cannot be combined. An expired or declined option is not a general-purpose credit.</p>
    <p>{isGiftCardOffering ? "This gift card is not Playable Balance or withdrawable cash." : `Zero Loss does not ship the ${product.title} directly.`} Find an issued card in <Link href="/account/wallet" className="font-bold text-cyan-300 underline">Gift Cards &amp; Rewards</Link> and use it online or in store where accepted, subject to {product.retailer}&apos;s terms.</p>
    {!hiddenPool && <p>No purchase necessary. <FreeEntryLink slug={product.slug} from={transactionReturn ?? query.from} share={shareToken} className="font-bold text-cyan-300 underline">Free-entry instructions →</FreeEntryLink></p>}
    <p><Link href="/terms" className="font-bold text-cyan-300 underline">Preview terms and Official Rules status →</Link></p>
  </>;

  return <><SiteBreadcrumbs product={{ slug: product.slug, title: product.title, returnHref: browseReturnHref }} /><div className={entryStyles.page}>
    {!hiddenPool ? <RememberViewedProduct slug={product.slug} browseReturn={query.from === undefined ? undefined : browseReturnHref} /> : null}
    <ProductEntryAutoScroll productKey={`${selectionKey}:${query.funded ?? ""}`} />
    <ProductEntrySelection key={selectionKey} slug={product.slug} initialQuantity={initialQuantity} invalidBookmark={invalidBookmark} remaining={current ? remaining : Math.max(remaining, initialQuantity)}>
    <section id="product-entry-card" className={entryStyles.card} aria-label={`${product.title} entry details`}>
      <div className={entryStyles.nav}>
        <Link href={transactionReturn ?? browseReturnHref}>← Back to {transactionReturn ? "this transaction" : browseReturnLabel}</Link>
        <ProductInfoDialog title="How entries and completion work" label="Entry details">{entryDetails}</ProductInfoDialog>
      </div>
      {sharedControls ? <div className={entryStyles.shared}>{sharedControls}</div> : null}
      <ProductGallery compact gallery={product.gallery} title={product.title} slug={product.slug} productInfo={productDetails} />
      <div className={entryStyles.heading}><p>{product.category}</p><h1>{product.title}</h1></div>
      {account && !hiddenPool ? <ProductShareButton label="Share" className={entryStyles.share} product={{ slug: product.slug, title: product.title, image: product.gallery[0]?.src, retailer: product.retailer, value: product.value }} /> : null}
      <GiftCardFulfillmentNotice compact productTitle={product.title} retailer={product.retailer} value={product.value} isGiftCardOffering={isGiftCardOffering} />
      {participationPanel}
      <div className={entryStyles.more}>
        {!hiddenPool ? <FreeEntryLink className={entryStyles.freeEntry} slug={product.slug} from={transactionReturn ?? query.from} share={shareToken}>Prefer to enter without a purchase?</FreeEntryLink> : null}
      </div>
    </section>
    </ProductEntrySelection>
    <section className={`${entryStyles.after} grid gap-4 rounded-3xl border border-white/12 bg-[#001b3d] p-6 sm:grid-cols-3 sm:p-8`}>
      <div><strong className="text-cyan-300">Transparent capacity</strong><p className="mt-2 text-sm leading-6 text-white/65">Entry totals and remaining capacity are shown directly from this demo pool.</p></div>
      <div><strong className="text-cyan-300">Official rules stay accessible</strong><p className="mt-2 text-sm leading-6 text-white/65">Eligibility, free-entry details, and completion terms will remain one tap away.</p></div>
      <div><strong className="text-cyan-300">Retailer gift-card fulfillment</strong><p className="mt-2 text-sm leading-6 text-white/65">Zero Loss issues the advertised retailer gift-card value. Product selection, inventory, checkout and shipping remain with the retailer.</p></div>
    </section>
  </div></>;
}
