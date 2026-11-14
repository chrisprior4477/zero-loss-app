import type { DemoProduct } from "./demo-products";
import { isGiftCardListing } from "./navigation";
import { productSearchTerms, retailerDiscoveryTerms } from "./search-vocabulary";
import { maxCatalogSearchLength, maxCatalogSearchTerms, normalizeSearch, queryWords, searchWords, searchWordScore } from "./search-text";
import { searchDenominations } from "./search-denomination";

export type CatalogSearchMatch = { product: DemoProduct; kind: "product" | "retailer" };

export function searchCatalogMatches(
  products: readonly DemoProduct[],
  query: string,
  denomination = searchDenominations(query, products),
  { includeLowerGiftCards = false } = {},
): CatalogSearchMatch[] {
  if (query.length > maxCatalogSearchLength) return [];
  const { text, values, budget, merchant } = denomination;
  const normalizedQuery = normalizeSearch(text);
  const tokens = queryWords(text);
  if ((!tokens.length && !values.size && !budget) || tokens.length > maxCatalogSearchTerms) return [];
  const giftCards = /\bgift card\b/.test(normalizedQuery);
  const includeLower = includeLowerGiftCards && Boolean(merchant) && values.size > 0;
  const requestedMax = Math.max(...values);
  const candidates = products.filter(product => (!values.size || values.has(product.value)
      || (includeLower && product.value < requestedMax && isGiftCardListing(product)))
    && (!budget || (budget.inclusive ? product.value <= budget.maximum : product.value < budget.maximum))
    && (!giftCards || isGiftCardListing(product))
    && (!merchant || normalizeSearch(product.retailer) === merchant || normalizeSearch(product.retailer).startsWith(merchant + " ")));
  if (!tokens.length) return candidates.map(product => ({ product, kind: "product" }));
  const documents = candidates.map(product => {
    const giftCard = product.slug.endsWith("-gift-card");
    const title = new Set(searchWords(product.title));
    const merchant = new Set(searchWords(`${product.brand} ${product.retailer}`));
    const category = new Set(searchWords(product.category));
    const document = new Set(searchWords([
      product.slug, product.title, product.brand, product.retailer,
      // Do not combine Dog Haus with its Food category to invent "dog food".
      !giftCard || tokens.length === 1 ? product.category : "",
      product.summary, ...product.highlights,
      ...product.specifications.flatMap(item => [item.label, item.value]), ...product.included,
      productSearchTerms[product.slug] ?? "",
    ].join(" ")));
    const expanded = new Set([...document, ...searchWords(giftCard ? retailerDiscoveryTerms(product.retailer, product.category) : "")]);
    return { product, title, merchant, category, document, expanded };
  });
  const vocabulary = new Set(documents.flatMap(({ expanded }) => [...expanded]));
  const matchWord = (token: string, document: ReadonlySet<string>) => searchWordScore(token, document, vocabulary);
  return documents.map(({ product, title, merchant, category, document, expanded }) => {
    const direct = tokens.every(token => matchWord(token, document) > 0);
    if (!direct && !tokens.every(token => matchWord(token, expanded) > 0)) return null;
    const kind = direct ? "product" as const : "retailer" as const;
    let score = direct ? 1000 : 0;
    for (const token of tokens) score += matchWord(token, title) * 20 + matchWord(token, merchant) * 15
      + matchWord(token, category) * 8 + matchWord(token, direct ? document : expanded);
    if (` ${normalizeSearch(product.title)} `.includes(` ${normalizedQuery} `)) score += 100;
    if (normalizeSearch(product.brand) === normalizedQuery || normalizeSearch(product.retailer) === normalizedQuery) score += 120;
    const giftCardRank = includeLower && isGiftCardListing(product) ? values.has(product.value) ? 0 : 1 : 2;
    return { product, kind, score, giftCardRank };
  }).filter((match): match is NonNullable<typeof match> => match !== null)
    .sort((left, right) => left.giftCardRank - right.giftCardRank
      || (left.giftCardRank < 2 && right.giftCardRank < 2 ? right.product.value - left.product.value : 0)
      || Number(left.kind === "retailer") - Number(right.kind === "retailer")
      || Number(left.product.slug.endsWith("-gift-card")) - Number(right.product.slug.endsWith("-gift-card"))
      || right.score - left.score || left.product.title.localeCompare(right.product.title))
    .map(({ product, kind }) => ({ product, kind }));
}

export function searchCatalog(products: readonly DemoProduct[], query: string) {
  return searchCatalogMatches(products, query).map(match => match.product);
}

/** A menu topic narrows its parent department using the same catalog vocabulary. */
export function filterCatalogSubcategory(products: readonly DemoProduct[], subcategory: string): DemoProduct[] {
  if (!subcategory) return [...products];
  const topics = subcategory.replace(/&amp;/g, "&").split(/\s*&\s*/);
  const matching = new Set(topics.flatMap(topic => searchCatalogMatches(products, topic).map(match => match.product.slug)));
  return products.filter(product => matching.has(product.slug));
}
