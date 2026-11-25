import type { Metadata } from "next";
import Link from "next/link";
import { BrowseResultsLink } from "@/components/catalog/BrowsePrizeLink";
import { CatalogRequestForm } from "@/components/catalog/CatalogRequestForm";
import { productBrowseReturnPath } from "@/lib/catalog/product-return";
import { getAccountContext } from "@/lib/account/context";
import { HelpLandingScroll } from "@/components/help/HelpLandingScroll";
import { maxCatalogSearchLength } from "@/lib/catalog/search-text";

export const metadata: Metadata = {
  title: "Request a Product",
  description: "Tell Zero Loss what products and rewards you would like to see next.",
};

export default async function ProductRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string | string[]; from?: string | string[]; origin?: string | string[] }>;
}) {
  const [query, account] = await Promise.all([searchParams, getAccountContext()]);
  const requestedProducts = [...new Set((Array.isArray(query.product) ? query.product : [query.product])
    .map(value => value?.trim().slice(0, maxCatalogSearchLength) ?? ""))];
  const productConflict = requestedProducts.length > 1;
  const originalQuery = productConflict ? "" : requestedProducts[0];
  const returnPath = productBrowseReturnPath(query.from);
  const browseReturn = returnPath?.startsWith("/browse") || returnPath?.startsWith("/rewards/") ? returnPath : null;
  const fromFaq = query.origin === "faq";
  function requestHref(product?: string) {
    const params = new URLSearchParams();
    if (product) params.set("product", product);
    if (browseReturn) params.set("from", browseReturn);
    if (fromFaq) params.set("origin", "faq");
    return "/contact/product-request" + (params.size ? "?" + params : "") + "#product-request";
  }
  const scope = new URL(browseReturn?.startsWith("/browse") ? browseReturn : "/browse", "https://zeroloss.local").searchParams;
  for (const key of ["q", "batch"]) scope.delete(key);
  scope.sort();
  if (fromFaq) scope.set("origin", "faq");
  const backHref = browseReturn
    ? browseReturn.startsWith("/browse") && !browseReturn.includes("#") ? `${browseReturn}#search-results` : browseReturn
    : originalQuery ? `/browse?${new URLSearchParams({ q: originalQuery })}` : "/browse";
  const searchDraft = browseReturn?.startsWith("/browse") && !productConflict && query.product !== undefined ? originalQuery : undefined;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
      <HelpLandingScroll target="product-request" landingAlias="product-request-heading" visitKey={backHref} />
      <div id="product-request" className="mx-auto max-w-3xl scroll-mt-[calc(var(--site-header-height,100px)+12px)]">
        {fromFaq ? <Link href="/faq#faq-request-product" className="inline-flex min-h-8 items-center text-sm font-bold text-cyan-300 hover:text-white sm:min-h-0">← Back to FAQ</Link> :
          backHref.startsWith("/browse") ? <BrowseResultsLink href={backHref} target="product-request" searchDraft={searchDraft} className="inline-flex min-h-8 items-center text-sm font-bold text-cyan-300 hover:text-white sm:min-h-0">← Back to search</BrowseResultsLink>
            : <Link href={backHref} className="inline-flex min-h-8 items-center text-sm font-bold text-cyan-300 hover:text-white sm:min-h-0">← Back to retailer rewards</Link>}
        <section className="mt-6 overflow-hidden rounded-3xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(5,51,91,.96),rgba(0,24,55,.98))] p-6 shadow-[0_20px_65px_rgba(0,0,0,.3)] sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Help shape the catalog</p>
          <h1 id="product-request-heading" className="mt-3 scroll-mt-[calc(var(--site-header-height,100px)+12px)] text-3xl font-black tracking-[-0.04em] sm:text-5xl">What would you love to see on Zero Loss?</h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/70">We review customer requests when deciding which products, retailers, and rewards to add next.</p>
          <p className="mt-5 text-lg font-black">Shopping should never feel like a <span className="text-[#31e800]">loss.</span></p>
          <div className="my-7 h-px bg-cyan-300/18" />
          {productConflict ? <div>
            <p role="status">This link contains more than one product. Choose the one you want to request or start a new request.</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {requestedProducts.filter(Boolean).map(product => <li key={product}><Link className="inline-flex min-h-11 items-center break-all text-cyan-300 underline" href={requestHref(product)}>{product}</Link></li>)}
              <li><Link className="inline-flex min-h-11 items-center text-cyan-300 underline" href={requestHref()}>Start a new request</Link></li>
            </ul>
          </div> : <CatalogRequestForm initialProduct={originalQuery} ownerId={account?.userId} scope={scope.toString()} />}
        </section>
      </div>
    </div>
  );
}
