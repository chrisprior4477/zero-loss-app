export const searchExamples = ["TV", "baby stuff", "Publix", "coffee", "sneakers"] as const;
export type MenuPreviewSearchResults = Record<string, { title: string; image: string }[]>;
export function searchResultsHref(query: string) {
  return `/browse?${new URLSearchParams({ q: query.trim() })}#search-results`;
}

export function scrollToCurrentSearch(href: string) {
  const destination = new URL(href, window.location.href);
  const current = new URL(window.location.href);
  destination.searchParams.sort();
  current.searchParams.sort();
  if (destination.pathname !== current.pathname || destination.search !== current.search) return false;
  if (destination.hash !== window.location.hash) {
    const method = window.location.hash.startsWith(destination.hash + "#") ? "replaceState" : "pushState";
    window.history[method](null, "", destination.hash);
  }
  document.getElementById(destination.hash.slice(1))?.scrollIntoView?.({ block: "start" });
  return true;
}
