import type { RetailerFilterGroup } from "./browse-filters";

// Discovery words point to directory categories, not to products or a promise
// that any listed retailer currently has an offer.
const categorySearchTerms: Readonly<Record<string, readonly string[]>> = {
  automotive: ["auto", "car", "car parts", "vehicle", "spark plug", "spark plugs", "brake", "oil change"],
  "babies-and-kids": ["baby", "infant", "children", "kids", "toys"],
  groceries: ["grocery", "food", "supermarket"],
  pharmacy: ["medicine", "drugstore", "prescriptions"],
  gas: ["fuel", "gas station", "petrol"],
  "home-furnishings": ["furniture", "home decor"],
  "home-improvement": ["hardware", "tools", "power tools", "renovation", "home repair"],
  pets: ["pet", "dog", "cat"],
  "food-and-restaurants": ["restaurant", "dining", "coffee"],
  "travel-and-entertainment": ["hotel", "flight", "cruise", "travel"],
};

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreTerm(term: string, query: string) {
  if (term === query) return 4;
  if (term.startsWith(query)) return 3;
  if (term.split(" ").some(word => word.startsWith(query))) return 2;
  if (term.includes(query)) return 1;
  return 0;
}

/** Find directory destinations for both Browse search and header-search results. */
export function searchRetailerDirectory(groups: readonly RetailerFilterGroup[], query: string, limit = 4): RetailerFilterGroup[] {
  if (query.length > 120 || limit <= 0) return [];
  const term = normalize(query);
  if (term.length < 2) return [];

  return groups.map(group => {
    const categoryScore = scoreTerm(normalize(group.category), term) * 100;
    const aliasScore = Math.max(0, ...(categorySearchTerms[group.id] ?? []).map(alias => scoreTerm(normalize(alias), term))) * 80;
    const retailerScore = Math.max(0, ...group.options.map(option => scoreTerm(normalize(option.label), term))) * 40;
    return { group, score: Math.max(categoryScore, aliasScore, retailerScore) };
  }).filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.group.category.localeCompare(right.group.category))
    .slice(0, limit).map(result => result.group);
}
