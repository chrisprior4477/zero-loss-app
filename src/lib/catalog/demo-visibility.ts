import type { AccountActivity } from "@/lib/account/activity";

/** Closed demo prizes are hidden only for the account that has the outcome. */
export function resolvedCatalogSlugs(state: AccountActivity | null | undefined): string[] {
  if (!state || state.source === "unavailable") return [];
  return [...new Set(state.activity
    // The retired direct checkout issued cards without a pool entry.
    .filter(item => item.entryId || item.rewardSource !== "purchase")
    .filter(item => item.status === "prize" || item.status === "completion" || item.status === "completed")
    .map(item => item.slug))];
}

export function catalogSlugFromHref(href: string | undefined): string | null {
  return href?.match(/^\/items\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:[?#]|$)/)?.[1] ?? null;
}

export function isResolvedCatalogHref(href: string | undefined, resolved: ReadonlySet<string>): boolean {
  const slug = catalogSlugFromHref(href);
  return slug !== null && resolved.has(slug);
}
