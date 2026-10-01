const favoriteHrefPattern = /^\/items\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export function favoriteSlugFromHref(href: string | undefined): string | null {
  return typeof href === "string" ? favoriteHrefPattern.exec(href)?.[1] ?? null : null;
}
