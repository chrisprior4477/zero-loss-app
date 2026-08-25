import { ProductCard } from "@/components/product/ProductCard";
import type { PlaceholderProduct } from "@/lib/home/placeholder-data";

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
  products: PlaceholderProduct[];
};

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--section-line)] bg-[var(--surface)]/60 p-5">
        <p className="text-sm text-[var(--muted)]">
          Featured opportunities will appear here once the catalog is live.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
