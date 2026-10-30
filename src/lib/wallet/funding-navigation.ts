import { isEntryQuantity, parseEntryQuantity } from "@/lib/entries/quantity";
import { productBrowseReturnPath } from "@/lib/catalog/product-return";

const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entryPattern = /^ent_[a-f0-9]{32}$/;

/** Carry catalog identifiers and an allowlisted marketplace address, never an arbitrary redirect. */
export function fundingHref(productSlug?: string, entryId?: string, quantity?: number, browseReturn?: unknown): string {
  const params = new URLSearchParams({ view: "history" });
  if (productSlug && productSlugPattern.test(productSlug)) params.set("from", productSlug);
  if (params.has("from") && entryId && entryPattern.test(entryId)) params.set("entry", entryId);
  else if (params.has("from") && isEntryQuantity(quantity) && quantity > 1) params.set("quantity", String(quantity));
  const browse = productBrowseReturnPath(browseReturn);
  if (params.has("from") && !params.has("entry") && browse) params.set("browse", browse);
  return `/account/wallet?${params}#add-funds`;
}

/** Exact allowlist for the funding destination used after sign-in. */
export function fundingReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 4096 || /[\\\s\u0000-\u001f]/.test(value)) return null;
  if (!/^\/account\/wallet\?view=history(?:&from=[a-z0-9]+(?:-[a-z0-9]+)*(?:&entry=ent_[a-f0-9]{32}|&quantity=[1-9]\d*)?(?:&browse=[^&#]+)?)?#add-funds$/.test(value)) return null;
  const params = new URL(value, "https://navigation.invalid").searchParams;
  if (params.has("browse") && (params.has("entry") || !productBrowseReturnPath(params.get("browse")))) return null;
  const selected = params.get("quantity");
  return selected === null || parseEntryQuantity(selected) !== null ? value : null;
}
