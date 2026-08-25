import Link from "next/link";
import { PoolProgress } from "@/components/product/PoolProgress";
import type { PlaceholderProduct } from "@/lib/home/placeholder-data";

/**
 * Product card (homepage spec §15).
 *
 * Presentational only — every value arrives as a prop. The card never reads
 * the catalog, a pool, or the ledger, and it never derives an entry count
 * from anything (financial rules §1.1: entries come from displayed face
 * value only, and acquisition cost must never be customer-inferable).
 *
 * Imagery: renders a neutral category tile rather than product photography.
 * Financial rules §2.3 prohibits scraping or reproducing brand product
 * photos, so no <Image> is wired up until licensed or generated art exists.
 */

type ProductCardProps = {
  product: PlaceholderProduct;
  /** Where the card navigates. Spec §16 — no intermediate screens. */
  href?: string;
};

function EntryBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]">
      {label}
    </span>
  );
}

function PlaceholderArt() {
  return (
    <div
      aria-hidden="true"
      className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[linear-gradient(150deg,var(--surface-elevated)_0%,var(--surface)_100%)]"
    >
      <span className="h-7 w-7 rounded-md border border-dashed border-[var(--section-line)]" />
    </div>
  );
}

export function ProductCard({ product, href = "/browse" }: ProductCardProps) {
  return (
    <article className="group h-full">
      <Link
        href={href}
        className="flex h-full flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 transition-colors hover:bg-[var(--surface-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:p-4"
      >
        <PlaceholderArt />

        <p className="mt-3 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
          {product.category}
        </p>

        <h3 className="mt-1 text-sm font-semibold leading-snug text-[var(--foreground)]">
          {product.title}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <EntryBadge label={product.entryPriceLabel} />
          <span className="text-xs text-[var(--muted)]">
            {product.faceValueLabel} value
          </span>
        </div>

        <div className="mt-auto pt-3">
          <PoolProgress
            ticketsSold={product.ticketsSold}
            ticketCapacity={product.ticketCapacity}
          />
        </div>
      </Link>
    </article>
  );
}
