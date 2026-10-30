import type { DemoProduct } from "./demo-products";
import { isGiftCardListing } from "./navigation";

const brandKey = (value: string) => value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Featured groceries lead with actual grocery-store cards, retaining every offer. */
export function groceryStoreFirst(products: readonly DemoProduct[], groceryRetailers: readonly string[]): DemoProduct[] {
  const stores = new Set(groceryRetailers.map(brandKey));
  function rank(product: DemoProduct) {
    const retailer = brandKey(product.retailer);
    const groceryStore = stores.has(retailer) || retailer.startsWith("walmart") || retailer === "publix";
    return groceryStore ? isGiftCardListing(product) ? 0 : 1 : 2;
  }
  return [...products].sort((left, right) => rank(left) - rank(right));
}
