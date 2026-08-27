import { ProductCard } from "@/components/product/ProductCard";
import type { PlaceholderOpportunity } from "@/lib/home/placeholder-data";

/**
 * Product discovery grid (homepage spec §14).
 *
 * Mobile-first per §14 and §24: a dense two-column grid is the DEFAULT, and
 * larger breakpoints expand from it rather than redesigning it.
 */

type ProductDiscoveryGridProps = {
  opportunities: PlaceholderOpportunity[];
};

export function ProductDiscoveryGrid({ opportunities }: ProductDiscoveryGridProps) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--section-line)] bg-[var(--surface)]/50 p-6">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Nothing to browse just yet.
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
          New items are added regularly — check back shortly.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
      {opportunities.map((opportunity) => (
        <li key={opportunity.id}>
          <ProductCard opportunity={opportunity} />
        </li>
      ))}
    </ul>
  );
}
