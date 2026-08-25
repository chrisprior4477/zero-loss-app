import { ProductCard } from "@/components/product/ProductCard";
import type { PlaceholderProduct } from "@/lib/home/placeholder-data";

/**
 * Product discovery grid (homepage spec §14).
 *
 * Mobile-first per §14 and §24: a dense two-column grid is the DEFAULT, and
 * larger breakpoints expand from it rather than redesigning it.
 */

type ProductDiscoveryGridProps = {
  products: PlaceholderProduct[];
};

export function ProductDiscoveryGrid({ products }: ProductDiscoveryGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--section-line)] bg-[var(--surface)]/60 p-5">
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
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
