import type { Metadata } from "next";
import Link from "next/link";
import { CatalogRequestForm } from "@/components/catalog/CatalogRequestForm";

export const metadata: Metadata = {
  title: "Request a Product",
  description: "Tell Zero Loss what products and rewards you would like to see next.",
};

export default async function ProductRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string | string[] }>;
}) {
  const query = await searchParams;
  const initialProduct = (Array.isArray(query.product) ? query.product[0] : query.product)?.trim().slice(0, 160) ?? "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,#0a3970_0%,#031b44_44%,#00132e_100%)] px-4 py-8 text-white sm:px-7 sm:py-12 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <Link href={initialProduct ? `/browse?${new URLSearchParams({ q: initialProduct })}` : "/browse"} className="text-sm font-bold text-cyan-300 hover:text-white">← Back to search</Link>
        <section className="mt-6 overflow-hidden rounded-3xl border border-cyan-300/30 bg-[linear-gradient(145deg,rgba(5,51,91,.96),rgba(0,24,55,.98))] p-6 shadow-[0_20px_65px_rgba(0,0,0,.3)] sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Help shape the catalog</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">What would you love to see on Zero Loss?</h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/70">We review customer requests when deciding which products, retailers, and rewards to add next.</p>
          <p className="mt-5 text-lg font-black">Shopping should never feel like a <span className="text-[#31e800]">loss.</span></p>
          <div className="my-7 h-px bg-cyan-300/18" />
          <CatalogRequestForm initialProduct={initialProduct} />
        </section>
      </div>
    </main>
  );
}
