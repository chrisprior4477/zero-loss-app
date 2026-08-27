import { ProductCard } from "@/components/product/ProductCard";
import type { PlaceholderOpportunity } from "@/lib/home/placeholder-data";

/**
 * Featured opportunities (homepage spec §13).
 *
 * Presentational only. Spec §13 requires featured placement to be driven by
 * configurable business rules rather than hard-coded ordering — so this
 * component deliberately does no selection or sorting of its own. It renders
 * whatever ordered list it is handed; the ordering rule belongs server-side
 * when catalog data exists.
 */

type FeaturedProductsProps = {
  opportunities: PlaceholderOpportunity[];
};

export function FeaturedProducts({ opportunities }: FeaturedProductsProps) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--section-line)] bg-[var(--surface)]/50 p-6">
        <p className="text-sm text-[var(--muted)]">
          Featured opportunities will appear here once the catalog is live.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {opportunities.map((opportunity) => (
        <li key={opportunity.id}>
          <ProductCard opportunity={opportunity} />
        </li>
      ))}
    </ul>
  );
}
