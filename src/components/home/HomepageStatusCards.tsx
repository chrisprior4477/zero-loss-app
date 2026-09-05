/**
 * Compact homepage status/promotional row.
 *
 * Winners remains intentionally empty until an authoritative aggregate exists.
 * Premium is a preview only: no enrollment link or unapproved benefit claim is
 * presented while the membership product is still being defined.
 */
export function HomepageStatusCards() {
  return (
    <section
      aria-label="Marketplace and membership previews"
      className="grid grid-cols-[0.9fr_1.1fr] gap-2.5 sm:gap-3"
    >
      <div className="flex min-h-[84px] items-center gap-3 rounded-xl border border-[#98d900] bg-[var(--background)] px-3 sm:px-5">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-9 w-9 shrink-0 text-[#98d900] sm:h-11 sm:w-11"
          aria-hidden="true"
        >
          <path d="M10 4h12v8a6 6 0 0 1-12 0V4Z" />
          <path d="M10 7H5v3c0 4 2 6 6 6M22 7h5v3c0 4-2 6-6 6M16 18v5M11 28h10M13 23h6v5h-6z" />
        </svg>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-none text-white">—</p>
          <p className="mt-2 text-xs font-medium text-[#98d900] sm:text-sm">
            Winners
          </p>
        </div>
      </div>

      <div className="flex min-h-[84px] items-center gap-3 rounded-xl border border-cyan-400 bg-[var(--background)] px-3 sm:px-5">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-9 w-9 shrink-0 text-cyan-300 sm:h-11 sm:w-11"
          aria-hidden="true"
        >
          <path d="M16 3c3 3 7 4 11 5v7c0 7-4 11-11 14C9 26 5 22 5 15V8c4-1 8-2 11-5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m11 16 3 3 7-8" />
        </svg>
        <div className="min-w-0">
          <h2 className="text-[13px] font-extrabold leading-[1.02] tracking-[0.02em] text-white sm:text-base">
            PREMIUM
            <br />
            MEMBERSHIP
          </h2>
          <p className="mt-1 truncate text-[10px] leading-tight text-white/75 sm:text-xs">
            Explore member benefits.
          </p>
        </div>
      </div>
    </section>
  );
}
