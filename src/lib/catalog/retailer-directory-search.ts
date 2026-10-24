import type { RetailerFilterGroup } from "./browse-filters";
import { categorySearchTerms, retailerDiscoveryTerms, searchMetadataKey } from "./search-vocabulary";
import { normalizeSearch, queryWords, searchWords, searchWordScore } from "./search-text";

/** The same spelling, prefix and synonym matching as the product results. */
export function searchRetailerDirectory(groups: readonly RetailerFilterGroup[], query: string, limit = 4): RetailerFilterGroup[] {
  if (query.length > 120 || limit <= 0 || normalizeSearch(query).length < 2) return [];
  const tokens = queryWords(query);
  if (!tokens.length || tokens.length > 32) return [];
  const documents = groups.map(group => ({ group,
    category: new Set(searchWords(`${group.category} ${categorySearchTerms[searchMetadataKey(group.category)] ?? ""}`)),
    retailers: group.options.map(option => new Set(searchWords(`${option.label} ${retailerDiscoveryTerms(option.value, group.category)}`))),
  }));
  const vocabulary = new Set(documents.flatMap(({ category, retailers }) => [...category, ...retailers.flatMap(words => [...words])]));
  const score = (words: ReadonlySet<string>) => {
    const scores = tokens.map(token => searchWordScore(token, words, vocabulary));
    return scores.every(Boolean) ? scores.reduce<number>((sum, value) => sum + value, 0) : 0;
  };
  return documents.map(({ group, category, retailers }) => ({ group,
    score: Math.max(score(category) * 100, ...retailers.map(words => score(words) * 40)),
  })).filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.group.category.localeCompare(right.group.category))
    .slice(0, limit).map(result => result.group);
}
