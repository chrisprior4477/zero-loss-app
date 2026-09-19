import Link from "next/link";

export function SocialActivityFeed() {
  return (
    <section aria-labelledby="social-activity-title" className="relative min-w-0 overflow-hidden rounded-[22px] border border-orange-300/45 bg-[radial-gradient(ellipse_at_8%_-15%,rgba(255,176,58,.78)_0%,transparent_36%),radial-gradient(ellipse_at_92%_115%,rgba(255,67,8,.7)_0%,transparent_43%),linear-gradient(125deg,#d94b0b_0%,#f65c0d_42%,#c9400a_72%,#10254a_100%)] shadow-[0_16px_40px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,220,166,.28)]">
      <svg aria-hidden="true" viewBox="0 0 1000 220" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
        <path d="M-25 31C92 2 171 18 258 70S432 108 548 55 706 26 799 83 918 153 1025 31 M-20 91C105 156 199 143 301 105S470 152 583 146 720 49 823 67 923 146 1024 185" fill="none" stroke="#fff0a6" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="relative z-10 flex min-h-[152px] flex-col justify-center gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
        <div className="min-w-0">
          <span className="inline-block rounded-full border border-white/55 bg-[#071426]/45 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white">Coming soon · no live posts</span>
          <h2 id="social-activity-title" className="mt-2 text-[18px] font-extrabold tracking-tight text-white">Community stories</h2>
          <p className="mt-1 max-w-[470px] text-[12px] leading-snug text-white/90">Member posts will appear here only when they are real and shared with permission. The story cards below are illustrative previews.</p>
        </div>
        <Link href="/#meet-winners-heading" className="inline-flex shrink-0 items-center self-start rounded-xl border border-white/55 bg-[#071426]/75 px-4 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#071426] sm:self-auto">Explore story previews →</Link>
      </div>
    </section>
  );
}
