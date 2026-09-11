import type { Metadata } from "next";
import Link from "next/link";
import { Barcode } from "@/components/compliance/FreeEntryPrintCard";
import { PrintSheetButton } from "@/components/compliance/PrintSheetButton";
import { demoProducts, getDemoProduct } from "@/lib/catalog/demo-products";

export const metadata: Metadata = { title: "Print AMOE Entry Insert" };

type Props = {
  searchParams: Promise<{
    offering?: string;
    name?: string;
    account?: string;
    reference?: string;
  }>;
};

function safeText(value: string | undefined, fallback: string, maxLength: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

export default async function PrintFreeEntryPage({ searchParams }: Props) {
  const params = await searchParams;
  const product = (params.offering ? getDemoProduct(params.offering) : undefined) ?? demoProducts[0];
  const name = safeText(params.name, "Chris P.", 80);
  const account = safeText(params.account, "DEMO-ACCOUNT-001", 80);
  const reference = safeText(params.reference, "ZL-DEMO001", 24).toUpperCase();
  const pdfParams = new URLSearchParams({
    offering: product.slug,
    name,
    account,
    reference,
  });

  return (
    <main className="amo-print-document-page min-h-screen bg-slate-200 px-4 py-6 text-[#00132e]">
      <div className="amo-print-controls mx-auto mb-5 flex max-w-[8.5in] flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#001b3d] p-4 text-white shadow-lg">
        <div>
          <Link href={`/free-entry?offering=${product.slug}`} className="text-sm font-bold text-cyan-300 hover:text-white">← Back to entry instructions</Link>
          <p className="mt-1 text-xs text-white/65">The white page below represents one actual letter-size 8.5 × 11 sheet. If this preview blocks printing, download the PDF.</p>
        </div>
        <PrintSheetButton pdfHref={`/api/free-entry-pdf?${pdfParams.toString()}`} />
      </div>

      <section className="amo-paper-preview" aria-label="Letter-size print preview">
        <article className="amo-postcard-cutout">
          <div className="amo-postcard-inner">
            <p className="text-center text-[8pt] font-black uppercase tracking-[0.18em] text-[#067abb]">Zero Loss AMOE entry insert</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-[8pt] leading-4 text-slate-700">
              <strong className="text-[#00132e]">Entrant:</strong><span>{name}</span><span aria-hidden="true">•</span>
              <strong className="text-[#00132e]">Account:</strong><span>{account}</span><span aria-hidden="true">•</span>
              <strong className="text-[#00132e]">Offering:</strong><span>{product.title}</span>
            </div>

            <div className="mt-2 flex flex-col items-center">
              <Barcode value={reference} />
              <span className="mt-0.5 font-mono text-[8pt] font-bold">{reference}</span>
            </div>

            <p className="mt-1 text-center text-[6.5pt] leading-3 text-slate-600">Attach securely to a standard postcard. Keep the barcode flat, uncovered, and readable.</p>
            <p className="mt-1 text-center text-[6.5pt] font-black uppercase tracking-[0.1em] text-[#b43d00]">Prototype — do not mail</p>
          </div>
          <span className="amo-cut-label">Cut along dotted line</span>
        </article>
      </section>
    </main>
  );
}
