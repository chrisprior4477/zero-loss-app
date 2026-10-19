export const searchExamples = ["TV", "baby stuff", "Publix", "coffee", "sneakers"] as const;
export type MenuPreviewSearchResults = Record<string, { title: string; image: string }[]>;
export function searchResultsHref(query: string) {
  return `/browse?${new URLSearchParams({ q: query.trim() })}#search-results`;
}
