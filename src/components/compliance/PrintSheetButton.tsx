"use client";

export function PrintSheetButton({ offering, name, account, reference }: {
  offering: string; name: string; account: string; reference: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form action="/api/free-entry-pdf" method="post" target="_blank" rel="noopener noreferrer">
        <input type="hidden" name="offering" value={offering} />
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="account" value={account} />
        <input type="hidden" name="reference" value={reference} />
        <button type="submit" className="rounded-xl bg-[#00b9ff] px-6 py-3 font-extrabold text-[#00132e] shadow-lg transition hover:bg-cyan-200">Open printable PDF</button>
      </form>
      <button type="button" onClick={() => window.print()} className="rounded-xl border border-white/25 px-5 py-3 font-bold text-white transition hover:bg-white/10">
        Open print dialog
      </button>
    </div>
  );
}
