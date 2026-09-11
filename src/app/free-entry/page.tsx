import type { Metadata } from "next";
import Link from "next/link";
import { FreeEntryPrintCard } from "@/components/compliance/FreeEntryPrintCard";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";

export const metadata: Metadata = { title: "Free Entry Information" };

type Props = { searchParams: Promise<{ offering?: string }> };

export default async function FreeEntryPage({ searchParams }: Props) {
  const { offering } = await searchParams;
  const product = (offering ? getDemoProduct(offering) : undefined) ?? demoProducts[0];

  return (
    <main className="min-h-screen bg-[#00132e] px-4 py-10 text-white sm:px-7">
      <div className="mx-auto max-w-4xl">
        <Link href={`/items/${product.slug}`} className="text-sm font-bold text-cyan-300 hover:text-white">← Back to {product.title}</Link>
        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.15em] text-[#31e800]">Alternative method of entry prototype</p>
        <h1 className="mt-2 text-3xl font-black sm:text-5xl">Enter without a purchase</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/75">No purchase is necessary. This page demonstrates a proposed mail-in entry workflow for counsel and operational review. It does not currently submit, reserve, or create an entry.</p>

        <section className="mt-8 rounded-3xl border border-cyan-300/30 bg-[#06264d] p-5 sm:p-7">
          <h2 className="text-xl font-extrabold">Proposed steps</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-white/75">
            <li><strong className="text-white">1.</strong> Confirm the offering shown below and enter the name and account reference that must match your eligible Zero Loss account.</li>
            <li><strong className="text-white">2.</strong> Print the sheet, cut around the dotted outline, and securely attach the insert to a standard rectangular postcard.</li>
            <li><strong className="text-white">3.</strong> Keep the entry barcode uncovered, flat, and readable. Secure the insert at its edges; do not place tape over either the Zero Loss barcode or postal markings.</li>
            <li><strong className="text-white">4.</strong> Add one current domestic postcard stamp. USPS currently lists standard postcard postage at $0.65; verify the rate when mailing.</li>
            <li><strong className="text-white">5.</strong> Mail only after the Official Rules publish the processing address, entry period, received-by deadline, and per-person limit.</li>
          </ol>
        </section>

        <FreeEntryPrintCard offeringTitle={product.title} offeringSlug={product.slug} />

        <section className="print:hidden mt-8 rounded-3xl border border-white/12 bg-white/5 p-5 text-sm leading-6 text-white/65">
          <h2 className="text-lg font-extrabold text-white">Still awaiting approval</h2>
          <p className="mt-2">Counsel must approve eligibility, equal treatment, the maximum number of entries across paid and free methods, timing, required handwriting or printing, duplicate prevention, privacy disclosures, and state-specific restrictions. Operations must approve the physical address, scanning equipment, exception handling, audit trail, and retention policy.</p>
        </section>
      </div>
    </main>
  );
}
