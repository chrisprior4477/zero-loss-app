import type { DemoProduct } from "./demo-products";
import { isGiftCardListing } from "./navigation";
import { productSearchTerms, retailerDiscoveryTerms } from "./search-vocabulary";
import { maxCatalogSearchLength, maxCatalogSearchTerms, normalizeSearch, queryWords, searchWords, searchWordScore } from "./search-text";
import { catalogMerchant, matchesCatalogMerchant, searchDenominations } from "./search-denomination";

export type CatalogSearchMatch = { product: DemoProduct; kind: "product" | "retailer" };

export function searchCatalogMatches(
  products: readonly DemoProduct[],
  query: string,
  denomination = searchDenominations(query, products),
  { includeLowerGiftCards = false } = {},
): CatalogSearchMatch[] {
  if (query.length > maxCatalogSearchLength || queryWords(query).length > maxCatalogSearchTerms) return [];
  const { text, values, budget, exactOnly, merchant } = denomination;
  const withoutGiftCards = query.replace(/\s*,?\s+(?:not|without|excluding|except)\s+(?:any\s+)?gift\s*cards?\s*[.!?]?$/i, "");
  if (withoutGiftCards !== query) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product)), withoutGiftCards, undefined, { includeLowerGiftCards });
  }
  const retailerExclusion = /(?:^|\s*,?\s+)(?:excluding|except(?: for)?|without|not)\s+(.+?)\s*[.!?]?$/i.exec(query);
  if (retailerExclusion) {
    const suffix = retailerExclusion[1];
    const qualified = retailerExclusion.index === 0 && /\s+gift\s*cards?$/i.test(suffix);
    const names = qualified ? suffix.replace(/\s+gift\s*cards?$/i, "") : suffix;
    const whole = catalogMerchant(names, products);
    const excluded = whole ? [whole] : names.split(/\s*,\s*|\s+(?:or|and)\s+/i)
      .map(name => catalogMerchant(name.replace(/^(?:or|and)\s+/i, ""), products));
    if (excluded.length && excluded.every((name): name is string => Boolean(name))) {
      const remaining = products.filter(product => !excluded.some(name => matchesCatalogMerchant(product.retailer, name)));
      const positive = query.slice(0, retailerExclusion.index).trim();
      if (positive || qualified) return searchCatalogMatches(remaining, positive || "gift cards", undefined, { includeLowerGiftCards });
      return remaining.map(product => ({ product, kind: "product" }));
    }
  }
  const alternatives = catalogAlternatives(query, products, denomination);
  if (alternatives) {
    const matches = new Map<string, CatalogSearchMatch>();
    for (const part of alternatives) {
      for (const match of searchCatalogMatches(products, part.text, part, { includeLowerGiftCards: !values.size && includeLowerGiftCards })) {
        if (!matches.has(match.product.slug) || match.kind === "product") matches.set(match.product.slug, match);
      }
    }
    return [...matches.values()].sort((first, second) => Number(first.kind === "retailer") - Number(second.kind === "retailer"));
  }
  const normalizedQuery = normalizeSearch(text);
  const tokens = queryWords(text);
  if ((!tokens.length && !values.size && !budget) || tokens.length > maxCatalogSearchTerms) return [];
  const giftCards = /\bgift card\b/.test(normalizedQuery);
  const television = tokens.includes("tv") || tokens.includes("television");
  const accessoryQuery = television ? /\b(?:tv|television)s?\s+(?:(?:wall|table)\s+)?(stand|mount|remote|antenna)s?\b|\b(stand|mount|remote|antenna)s?\s+for\s+(?:(?:a|the)\s+)?(?:tv|television)s?\b/.exec(normalizedQuery) : null;
  const televisionAccessory = accessoryQuery?.[1] ?? accessoryQuery?.[2];
  const appStoreGiftCard = giftCards && /\b(?:app store|itunes)\b/.test(normalizedQuery);
  const includeLower = includeLowerGiftCards && !exactOnly && Boolean(merchant) && values.size === 1;
  const requestedMax = Math.max(...values);
  const candidates = products.filter(product => (!values.size || values.has(product.value)
      || (includeLower && product.value < requestedMax && isGiftCardListing(product)))
    && (budget?.minimum === undefined || (budget.exclusiveMinimum ? product.value > budget.minimum : product.value >= budget.minimum))
    && (budget?.maximum == null || (budget.inclusive ? product.value <= budget.maximum : product.value < budget.maximum))
    && (!giftCards || isGiftCardListing(product))
    && (!appStoreGiftCard || /\b(?:app store|itunes)\b/.test(normalizeSearch(`${product.title} ${product.retailer}`)))
    && (!merchant || matchesCatalogMerchant(product.retailer, merchant))
    && (!televisionAccessory || searchWords(product.title).includes(televisionAccessory)));
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
    if (television && !televisionAccessory && !giftCards && !/\b(?:tv|television)\b/.test(normalizeSearch(product.title)) && !isGiftCardListing(product)) return null;
    const kind = direct && (!television || giftCards || !isGiftCardListing(product)) ? "product" as const : "retailer" as const;
    let score = direct ? 1000 : 0;
    for (const token of tokens) score += matchWord(token, title) * 20 + matchWord(token, merchant) * 15
      + matchWord(token, category) * 8 + matchWord(token, direct ? document : expanded);
    if (` ${normalizeSearch(product.title)} `.includes(` ${normalizedQuery} `)) score += 100;
    if (normalizeSearch(product.brand) === normalizedQuery || normalizeSearch(product.retailer) === normalizedQuery) score += 120;
    const standardExactCard = exactOnly && merchant && values.has(product.value)
      && normalizeSearch(product.title) === `${product.value} ${merchant} gift card`;
    const giftCardRank = standardExactCard ? -1 : includeLower && isGiftCardListing(product) ? values.has(product.value) ? 0 : 1 : 2;
    return { product, kind, score, giftCardRank };
  }).filter((match): match is NonNullable<typeof match> => match !== null)
    .sort((left, right) => left.giftCardRank - right.giftCardRank
      || (left.giftCardRank < 2 && right.giftCardRank < 2 ? right.product.value - left.product.value : 0)
      || Number(left.kind === "retailer") - Number(right.kind === "retailer")
      || Number(left.product.slug.endsWith("-gift-card")) - Number(right.product.slug.endsWith("-gift-card"))
      || right.score - left.score || left.product.title.localeCompare(right.product.title))
    .map(({ product, kind }) => ({ product, kind }));
}

function catalogAlternatives(query: string, products: readonly DemoProduct[], denomination: ReturnType<typeof searchDenominations>) {
  const hasOr = /\s+or\s+/i.test(query);
  const giftCards = /\bgift card\b/.test(normalizeSearch(query));
  if (!hasOr && (!giftCards || !/\s+and\s+/i.test(query))) return null;
  const clauses = query.split(hasOr ? /\s*,(?!\d)\s*(?:or\s+)?|\s+or\s+/i : /\s+and\s+/i);
  const parts = clauses.map(clause => {
    const parsed = searchDenominations(clause.trim(), products);
    return { ...parsed, merchant: parsed.merchant ?? catalogMerchant(parsed.text, products) };
  });
  if (!hasOr && !parts.every(part => part.merchant && part.values.size === 1)) return null;
  if (denomination.budget && !parts.some(part => part.budget)) return null;
  const merchants = new Set(parts.flatMap(part => part.merchant ? [part.merchant] : []));
  const priced = parts.filter(part => part.values.size);
  const sharedMerchant = merchants.size === 1 ? [...merchants][0] : null;
  const sharedValues = priced.length === 1 ? priced[0].values : null;
  if (giftCards && merchants.size && parts.every(part => part.merchant || (sharedMerchant && part.values.size && queryWords(part.text).every(word => word === "gift" || word === "card")))) {
    const scoped = parts.map(part => ({ ...part, text: "gift card", merchant: part.merchant ?? sharedMerchant,
      values: part.values.size ? part.values : sharedValues ?? part.values, exactOnly: Boolean(denomination.values.size) }));
    if (!denomination.values.size || scoped.every(part => part.values.size)) return scoped;
  }
  if (parts.every(part => queryWords(part.text).length > 0)
    && (!denomination.values.size || parts.every(part => part.values.size && queryWords(part.text).some(word => word !== "gift" && word !== "card")))) return parts;
  return null;
}

export function searchCatalog(products: readonly DemoProduct[], query: string) {
  return searchCatalogMatches(products, query).map(match => match.product);
}

/** A menu topic narrows its parent department using the same catalog vocabulary. */
export function filterCatalogSubcategory(products: readonly DemoProduct[], subcategory: string): DemoProduct[] {
  if (!subcategory) return [...products];
  const topics = subcategory.replace(/&amp;/g, "&").split(/\s*&\s*/);
  const matching = new Set(topics.flatMap(topic => {
    const candidates = /^(?:tvs?|televisions?)$/i.test(topic.trim())
      ? products.filter(product => isGiftCardListing(product) || /\b(?:tv|television)\b/i.test(product.title))
      : products;
    return searchCatalogMatches(candidates, topic).map(match => match.product.slug);
  }));
  return products.filter(product => matching.has(product.slug));
}
