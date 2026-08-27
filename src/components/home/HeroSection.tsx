import { HeroImageFan } from "@/components/home/HeroImageFan";
import { HeroSearchRow } from "@/components/home/HeroSearchRow";
import { HowItWorksToggle } from "@/components/home/HowItWorksToggle";

/**
 * Homepage hero (spec §8), styled to the Checkpoint 2 artboards.
 *
 * Headline is the Brand Promise (C6). The artboards read "Shopping should
 * never feel like a loss"; the approved wording is "...like losing", and
 * marketplace-financial-rules-spec.md makes the Brand Promise governing where
 * a rule and the promise could read as conflicting.
 *
 * Copy constraint: financial rules §5.1 — public-facing content must never
 * mention or imply cash redemption of a prize.
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12"
    >
      <div>
        <h1
          id="home-hero-heading"
          className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--foreground)] text-balance sm:text-[42px] lg:text-[52px]"
        >
          Shopping should never feel like losing.
        </h1>

        <p className="mt-4 max-w-lg text-[15px] leading-[1.55] text-[var(--muted)] sm:text-base">
          Win what you were already planning to buy. Don&apos;t win? What you
          spent still counts toward buying it instead.
        </p>

        {/* No standalone shop CTA here: the hero action row below carries the
            design.s Shop button, so a second one duplicated it. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <HowItWorksToggle />
        </div>

        <div className="mt-6">
          <HeroSearchRow />
        </div>
      </div>

      <HeroImageFan />
    </section>
  );
}
