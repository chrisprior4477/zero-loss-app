import type { DemoProduct } from "./demo-products";
import { productSearchTerms, retailerSearchTerms, searchSynonyms } from "./search-vocabulary";

const ignoredWords = new Set([
  "a", "an", "and", "for", "of", "or", "the", "to", "i", "im", "am", "is",
  "me", "my", "some", "please", "find", "show", "looking", "look", "want", "need",
  "buy", "get", "stuff", "thing", "item", "product",
]);

function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\bgift\s*cards?\b/g, "gift card")
    .replace(/\bpet\s+smart\b/g, "petsmart")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function wordForm(word: string) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function words(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean).map(wordForm);
}

const synonymLookup = new Map(searchSynonyms.flatMap(group =>
  group.map(term => [wordForm(term), group.map(wordForm)] as const)));

// One insertion, deletion, replacement or adjacent transposition. Never fuzzy
// match short terms or numbers: "gas" must not match "games", nor $25 match $75.
function nearWord(left: string, right: string) {
  if (left.length < 5 || right.length < 5 || /\d/.test(left + right)
    || Math.abs(left.length - right.length) > 1) return false;
  let index = 0;
  while (index < Math.min(left.length, right.length) && left[index] === right[index]) index++;
  if (left.length === right.length) {
    return left.slice(index + 1) === right.slice(index + 1)
      || (left[index] === right[index + 1] && left[index + 1] === right[index]
        && left.slice(index + 2) === right.slice(index + 2));
  }
  return left.length > right.length
    ? left.slice(index + 1) === right.slice(index)
    : left.slice(index) === right.slice(index + 1);
}

function matchWord(token: string, document: ReadonlySet<string>) {
  if (document.has(token)) return 4;
  if (synonymLookup.get(token)?.some(option => document.has(option))) return 3;
  if ([...document].some(word => nearWord(token, word))) return 1;
  return 0;
}

function containsPhrase(text: string, query: string) {
  return ` ${normalize(text)} `.includes(` ${query} `);
}

export type CatalogSearchMatch = { product: DemoProduct; kind: "product" | "retailer" };

export function searchCatalogMatches(products: readonly DemoProduct[], query: string): CatalogSearchMatch[] {
  // Bound untrusted query work without silently dropping meaningful qualifiers.
  if (query.length > 512) return [];
  const normalizedQuery = normalize(query);
  const tokens = [...new Set(words(query).filter(token => !ignoredWords.has(token)))];
  if (!tokens.length || tokens.length > 32) return [];

  return products.map(product => {
    const title = new Set(words(product.title));
    const merchant = new Set(words(`${product.brand} ${product.retailer}`));
    const category = new Set(words(product.category));
    const document = new Set(words([
      product.slug, product.title, product.brand, product.retailer, product.category,
      product.summary, ...product.highlights,
      ...product.specifications.flatMap(item => [item.label, item.value]), ...product.included,
      productSearchTerms[product.slug] ?? "",
    ].join(" ")));
    const direct = tokens.every(token => matchWord(token, document) > 0);
    const giftCard = product.slug.endsWith("-gift-card");
    const expanded = new Set([...document, ...words(giftCard ? retailerSearchTerms[product.retailer] ?? "" : "")]);
    if (!direct && !tokens.every(token => matchWord(token, expanded) > 0)) return null;

    const kind = direct ? "product" as const : "retailer" as const;
    // Direct catalog matches always outrank indirect retailer suggestions.
    let score = direct ? 1000 : 0;
    for (const token of tokens) {
      score += matchWord(token, title) * 20 + matchWord(token, merchant) * 15
        + matchWord(token, category) * 8 + matchWord(token, direct ? document : expanded);
    }
    if (containsPhrase(product.title, normalizedQuery)) score += 100;
    if (normalize(product.brand) === normalizedQuery || normalize(product.retailer) === normalizedQuery) score += 120;
    return { product, kind, score };
  }).filter((match): match is CatalogSearchMatch & { score: number } => match !== null)
    .sort((left, right) => Number(left.kind === "retailer") - Number(right.kind === "retailer")
      || right.score - left.score || left.product.title.localeCompare(right.product.title))
    .map(({ product, kind }) => ({ product, kind }));
}

export function searchCatalog(products: readonly DemoProduct[], query: string) {
  return searchCatalogMatches(products, query).map(match => match.product);
}
