const productSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Carry only a catalog identifier, never a caller-provided redirect URL. */
export function fundingHref(productSlug?: string): string {
  const params = new URLSearchParams({ view: "history" });
  if (productSlug && productSlugPattern.test(productSlug)) params.set("from", productSlug);
  return `/account/wallet?${params}#add-funds`;
}

/** Exact allowlist for the funding destination used after sign-in. */
export function fundingReturnPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\/account\/wallet\?view=history(?:&from=[a-z0-9]+(?:-[a-z0-9]+)*)?#add-funds$/.test(value)
    ? value
    : null;
}
