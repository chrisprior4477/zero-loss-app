import Link from "next/link";

/**
 * Homepage hero (spec §8).
 *
 * Replaces the deleted HomeHero, which was unused and carried a headline with
 * no supporting copy and no call-to-action.
 *
 * Headline is the Brand Promise. `marketplace-financial-rules-spec.md`
 * (Purpose) makes the Brand Promise governing where a rule and the promise
 * could read as conflicting, so it leads and the spec §8 line
 * ("Win what you were already planning to buy") supports it beneath.
 *
 * Copy constraint: financial rules §5.1 — public-facing content must never
 * mention or imply cash redemption of a prize.
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(165deg,var(--surface-elevated)_0%,var(--surface)_48%,var(--background)_100%)] px-4 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10"
    >
      <h1
        id="home-hero-heading"
        className="max-w-xl text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl lg:text-[2rem] lg:leading-tight"
      >
        Shopping should never feel like losing.
      </h1>

      <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:text-base">
        Win what you were already planning to buy — and if you don&apos;t win,
        what you spent goes toward buying it instead.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/browse"
          className="inline-flex items-center rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Browse the marketplace
        </Link>
        <Link
          href="/how-it-works"
          className="inline-flex items-center rounded-md border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]"
        >
          How it works
        </Link>
      </div>
    </section>
  );
}
