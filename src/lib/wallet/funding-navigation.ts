import { isEntryQuantity, parseEntryQuantity } from "@/lib/entries/quantity";
import { browseReturnPath } from "@/lib/catalog/product-return";

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entryPattern = /^ent_[a-f0-9]{32}$/;

/** Carry only a catalog identifier, never a caller-provided redirect URL. */
export function fundingHref(productSlug?: string, entryId?: string, quantity?: number, extraEntries = false, browseFrom?: string): string {
  const params = new URLSearchParams({ view: "history" });
  if (productSlug && productSlugPattern.test(productSlug)) params.set("from", productSlug);
  if (params.has("from") && entryId && entryPattern.test(entryId)) params.set("entry", entryId);
  if (params.has("entry") && extraEntries && isEntryQuantity(quantity)) {
    params.set("quantity", String(quantity));
    params.set("resume", "extra-entries");
  }
  else if (!params.has("entry") && params.has("from") && isEntryQuantity(quantity) && quantity > 1) params.set("quantity", String(quantity));
  const shop = browseReturnPath(browseFrom);
  if (params.has("from") && shop) params.set("shop", shop);
  return `/account/wallet?${params}#add-funds`;
}

/** Exact allowlist for the funding destination used after sign-in. */
export function fundingReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/account/wallet?")) return null;
  const query = new URL(value, "https://navigation.invalid").searchParams;
  const quantity = query.has("quantity") ? parseEntryQuantity(query.get("quantity")) : undefined;
  if (quantity === null) return null;
  return fundingHref(query.get("from") ?? undefined, query.get("entry") ?? undefined, quantity, query.get("resume") === "extra-entries", query.get("shop") ?? undefined) === value ? value : null;
}

export function extraEntryReturnHref(entryId: string, quantity: number): string {
  return entryPattern.test(entryId) && isEntryQuantity(quantity)
    ? `/account/entries/${entryId}?quantity=${quantity}#additional-entry-checkout`
    : "/account/entries";
}
