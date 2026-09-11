"use client";

export function PrintSheetButton({ pdfHref }: { pdfHref: string }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <a href={pdfHref} target="_blank" rel="noreferrer" className="rounded-xl bg-[#00b9ff] px-6 py-3 font-extrabold text-[#00132e] shadow-lg transition hover:bg-cyan-200">
        Open printable PDF
      </a>
      <button type="button" onClick={() => window.print()} className="rounded-xl border border-white/25 px-5 py-3 font-bold text-white transition hover:bg-white/10">
        Open print dialog
      </button>
    </div>
  );
}
