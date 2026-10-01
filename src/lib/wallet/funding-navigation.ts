const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const entryPattern = /^ent_[a-f0-9]{32}$/;

/** Carry only a catalog identifier, never a caller-provided redirect URL. */
export function fundingHref(productSlug?: string, entryId?: string, quantity?: number): string {
  const params = new URLSearchParams({ view: "history" });
  if (productSlug && productSlugPattern.test(productSlug)) params.set("from", productSlug);
  if (params.has("from") && entryId && entryPattern.test(entryId)) params.set("entry", entryId);
  else if (params.has("from") && typeof quantity === "number" && Number.isInteger(quantity) && quantity > 1 && quantity <= 10) params.set("quantity", String(quantity));
  return `/account/wallet?${params}#add-funds`;
}

/** Exact allowlist for the funding destination used after sign-in. */
export function fundingReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/account\/wallet\?view=history(?:&from=[a-z0-9]+(?:-[a-z0-9]+)*(?:&entry=ent_[a-f0-9]{32}|&quantity=(?:[1-9]|10))?)?#add-funds$/.test(value)
    ? value
    : null;
}
