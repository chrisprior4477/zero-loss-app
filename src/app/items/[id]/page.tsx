import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoParticipationPanel } from "@/components/product/DemoParticipationPanel";
import { ProductGallery } from "@/components/product/ProductGallery";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";

type PageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return demoProducts.map((product) => ({ id: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getDemoProduct(id);
  if (!product) return {};
  return { title: product.title, description: product.summary };
}

export default async function ItemPage({ params }: PageProps) {
  const { id } = await params;
  const product = getDemoProduct(id);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/#ending-soon" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-white">← Back to marketplace</Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:items-start">
          <div>
            <ProductGallery gallery={product.gallery} title={product.title} />
            <section className="mt-8 rounded-3xl border border-white/12 bg-white/5 p-5 sm:p-8">
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
          </div>

          <div className="lg:sticky lg:top-32">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">{product.category}</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">{product.title}</h1>
            <div className="mt-4 rounded-2xl border border-cyan-300/30 bg-cyan-300/8 px-4 py-3">
              <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-cyan-300">Digital retailer fulfillment</p>
              <p className="mt-1 font-bold">Issued through {product.retailer}</p>
              <p className="mt-1 text-xs leading-5 text-white/60">If awarded or completed, this offering is delivered as a retailer-specific digital gift card to the Rewards &amp; Fulfillment area of your Zero Loss Wallet—not as Playable Balance or withdrawable cash.</p>
            </div>
            <div className="my-6 flex items-baseline gap-2 border-y border-white/12 py-4">
              <span className="text-sm text-white/60">Retail value</span>
              <strong className="text-2xl">${product.value.toLocaleString()}</strong>
            </div>
            <DemoParticipationPanel productTitle={product.title} retailer={product.retailer} productValue={product.value} entryPrice={product.entryPrice} sold={product.sold} capacity={product.capacity} />
            <details className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-4 open:border-cyan-300/35">
              <summary className="cursor-pointer font-bold text-white">Prefer to enter without a purchase?</summary>
              <p className="mt-3 text-sm leading-6 text-white/65">No purchase is necessary. Review the proposed mail-in alternative method of entry and printable postcard insert. The prototype does not create an entry.</p>
              <Link href={`/free-entry?offering=${product.slug}`} className="mt-3 inline-block font-bold text-cyan-300 hover:text-white">View free-entry instructions →</Link>
            </details>
          </div>
        </div>

        <section className="mt-10 grid gap-4 rounded-3xl border border-white/12 bg-[#001b3d] p-6 sm:grid-cols-3 sm:p-8">
          <div><strong className="text-cyan-300">Transparent capacity</strong><p className="mt-2 text-sm leading-6 text-white/65">Entry totals and remaining capacity are shown directly from this demo pool.</p></div>
          <div><strong className="text-cyan-300">Official rules stay accessible</strong><p className="mt-2 text-sm leading-6 text-white/65">Eligibility, free-entry details, and completion terms will remain one tap away.</p></div>
          <div><strong className="text-cyan-300">Digital delivery by default</strong><p className="mt-2 text-sm leading-6 text-white/65">Rewards appear in the Wallet&apos;s Rewards &amp; Fulfillment area. A physical one-off item is delivered only when its offering clearly says so.</p></div>
        </section>
      </div>
    </main>
  );
}
