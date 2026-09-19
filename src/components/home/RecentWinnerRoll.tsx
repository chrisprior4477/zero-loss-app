import Link from "next/link";

export function RecentWinnerRoll() {
  return (
    <section aria-labelledby="recent-winners-title" className="overflow-hidden rounded-[22px] border border-cyan-300/20 bg-[linear-gradient(135deg,#00142f,#042654)] shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-[#72e82e]/15 text-[14px] text-[#7df33c]">★</span>
          <h2 id="recent-winners-title" className="text-[15px] font-extrabold text-white">Winner updates</h2>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-300/30 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300">Preview</span>
      </div>

      <div className="flex min-h-[118px] items-center gap-3 px-4 py-3 sm:px-5">
        <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-300/55 bg-cyan-300/10 text-[22px] text-cyan-200">✓</span>
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold leading-tight text-white">Real wins, once verified.</p>
          <p className="mt-1 text-[11px] leading-snug text-white/70">Winner updates will appear here when there are real results to share.</p>
          <Link href="/#meet-winners-heading" className="mt-2 inline-block text-[11px] font-bold text-cyan-200 hover:text-white">See story previews →</Link>
        </div>
      </div>
    </section>
  );
}
