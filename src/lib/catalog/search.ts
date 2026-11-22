import type { DemoProduct } from "./demo-products";
import { isGiftCardListing } from "./navigation";
import { productSearchTerms, retailerDiscoveryTerms } from "./search-vocabulary";
import { maxCatalogSearchLength, maxCatalogSearchTerms, normalizeSearch, queryWords, searchWords, searchWordScore } from "./search-text";
import { catalogMerchant, matchesCatalogMerchant, searchDenominations, remainingTicketsRange, smallNumberWords, spokenValue } from "./search-denomination";

export type CatalogSearchMatch = { product: DemoProduct; kind: "product" | "retailer" };

const spokenMeasurement = new RegExp(String.raw`\b(${smallNumberWords})[ -]+(inches|inch|terabytes?|gigabytes?|quarts?|ounces?|people|persons?)\b`, "gi");

export function searchCatalogMatches(
  products: readonly DemoProduct[],
  rawQuery: string,
  parsedDenomination?: ReturnType<typeof searchDenominations>,
  { includeLowerGiftCards = false } = {},
): CatalogSearchMatch[] {
  if (rawQuery.length > maxCatalogSearchLength) return [];
  const query = rawQuery.replace(spokenMeasurement, (_, number: string, unit: string) => String(spokenValue(number)) + " " + unit)
    .replace(/^\s*any\s+(?=gift\s*cards?\b)/i, "")
    .replace(/\bfrom\s+(\$\s*\d+(?:\.\d{1,2})?)\s+and\s+up\b/gi, "at least $1")
    .replace(/\bnot including\s+(?=[a-z])/gi, "excluding ")
    .replace(/\bnot sold by\s+/gi, "excluding from ")
    .replace(/^(\$\s*\d+(?:\.\d{1,2})?)\s+or less in\s+(.+\bgift\s*cards?\b)[.!?]?$/i, "$2 up to $1")
    .replace(/\bgift\s*cards?\s+that\s+aren[’']t\s+from\b/i, "gift cards except")
    .replace(/^(TVs?|televisions?)\s+by\s+either\s+(.+\s+or\s+.+)$/i, "$2 $1");
  if (query.length > maxCatalogSearchLength || queryWords(query).length > maxCatalogSearchTerms) return [];
  const multiBrandTelevisions = /^(\S+)\s+(?:and|or|&)\s+(\S+)\s+(\d+\s*[- ]?\s*(?:inch(?:es)?|in\b|")\s+(?:tvs?|televisions?))\s*[.!?]?$/i.exec(query.trim());
  const hasBrand = (name: string) => products.some(product => normalizeSearch(product.brand) === normalizeSearch(name));
  if (multiBrandTelevisions && hasBrand(multiBrandTelevisions[1]) && hasBrand(multiBrandTelevisions[2])) {
    const scoped = products.filter(product => !isGiftCardListing(product) && [multiBrandTelevisions[1], multiBrandTelevisions[2]]
      .some(brand => normalizeSearch(product.brand) === normalizeSearch(brand)));
    return searchCatalogMatches(scoped, multiBrandTelevisions[3], undefined, { includeLowerGiftCards });
  }
  const standaloneConsole = /^(.*\b(?:p[.\s-]*s|play[\s-]*station)[.\s-]*5\b.*?)\s*,?\s+(?:but\s+)?(?:no|not|without|excluding)\s+(?:(?:a|any)\s+)?(?:game\s+)?bundles?\s*[.!?]?$/i.exec(query);
  if (standaloneConsole) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product) && !/\bbundle\b/.test(normalizeSearch(product.title))), standaloneConsole[1], undefined, { includeLowerGiftCards });
  }
  const ticketsRange = remainingTicketsRange.exec(query.trimEnd());
  if (ticketsRange) {
    const minimum = Math.max(1, Number(ticketsRange[1]));
    const maximum = Number(ticketsRange[2]);
    return searchCatalogMatches(products.filter(product => {
      const remaining = product.capacity - product.sold;
      return remaining >= minimum && remaining <= maximum;
    }), query.slice(0, ticketsRange.index), undefined, { includeLowerGiftCards });
  }
  const ticketsCondition = /\s+(fewer than|less than|at most|at least|more than|exactly)\s+(\d+)\s+(?:tickets?|entries)\s+left[.!?]?$/i.exec(query);
  if (ticketsCondition) {
    const threshold = Number(ticketsCondition[2]);
    const comparison = ticketsCondition[1].toLowerCase();
    const scoped = products.filter(product => {
      const left = product.capacity - product.sold;
      if (left <= 0) return false;
      switch (comparison) {
        case "at most": return left <= threshold;
        case "at least": return left >= threshold;
        case "more than": return left > threshold;
        case "exactly": return left === threshold;
        default: return left < threshold;
      }
    });
    return searchCatalogMatches(scoped, query.slice(0, ticketsCondition.index), undefined, { includeLowerGiftCards });
  }
  const denomination = query === rawQuery && parsedDenomination ? parsedDenomination : searchDenominations(query, products);
  const { values, budget, exactOnly, conflictingBudget, entryPrice, entryPriceIsMaximum, exclusiveEntryPrice, screenSize, excludedValues } = denomination;
  const qualifier = /\s+(?:from|at|sold by)\s+(.+)$/i.exec(denomination.text);
  const qualifiedMerchant = qualifier && !catalogMerchant(denomination.text, products) ? catalogMerchant(qualifier[1], products) : null;
  const qualifiedText = qualifiedMerchant && qualifier ? denomination.text.slice(0, qualifier.index) : denomination.text;
  const brandQualifier = /\s+by\s+(.+)$/i.exec(qualifiedText);
  const brandName = brandQualifier ? normalizeSearch(brandQualifier[1]) : "";
  const isBrand = (product: DemoProduct) => {
    const actual = normalizeSearch(product.brand);
    return actual === brandName || actual.startsWith(brandName + " ");
  };
  const branded = Boolean(brandName) && products.some(isBrand);
  const brandedText = branded && brandQualifier ? qualifiedText.slice(0, brandQualifier.index) : qualifiedText;
  const dimensions = /\b(\d+)\s*(?:inch(?:es)?|")?\s*(?:to|[-–—])\s*(\d+)\s*(?:inch(?:es)?\b|")/i.exec(brandedText);
  const screenRange = dimensions && /\b(?:tvs?|televisions?)\b/i.test(brandedText) ? dimensions : null;
  const text = screenRange ? brandedText.replace(screenRange[0], " ") : brandedText;
  const merchant = denomination.merchant ?? qualifiedMerchant;
  if (conflictingBudget || denomination.unsupportedCurrency) return [];
  const withoutGiftCards = query.replace(/\s*,?\s+(?:(?:but\s+)?no|not|without|excluding|except)\s+(?:(?:a|any)\s+)?gift\s*cards?\s*[.!?]?$/i, "");
  if (withoutGiftCards !== query) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product)), withoutGiftCards, undefined, { includeLowerGiftCards });
  }
  const retailerExclusion = /(?:\s*[,;]\s*no|(?:^|\s*,?\s+)(?:(?:from\s+)?(?:anybody|anyone|anywhere)\s+but|(?:from\s+)?(?:retailers?\s+)?other\s+than|but\s+(?:not|no)|excluding|(?:everywhere\s+)?except(?: for)?|without|not))\s+(.+?)\s*[.!?]?$/i.exec(query);
  if (retailerExclusion) {
    const retailerSpecified = /^from\s+/i.test(retailerExclusion[1]);
    const suffix = retailerExclusion[1].replace(/^from\s+/i, "");
    const qualified = retailerExclusion.index === 0 && /\s+gift\s*cards?$/i.test(suffix);
    const names = qualified ? suffix.replace(/\s+gift\s*cards?$/i, "") : suffix;
    const positive = query.slice(0, retailerExclusion.index).trim()
      .replace(/(\bgift\s*cards?)\s+(?:(?:from\s+)?all\s+retailers)$/i, "$1");
    if (!retailerSpecified && /\b(?:tvs?|televisions?)\b/i.test(positive) && !/\bgift\s*cards?\b/i.test(positive)) {
      const brand = normalizeSearch(names);
      if (products.some(product => normalizeSearch(product.brand) === brand)) {
        const eligible = products.filter(product => !isGiftCardListing(product) && normalizeSearch(product.brand) !== brand);
        return searchCatalogMatches(eligible, positive, undefined, { includeLowerGiftCards });
      }
    }
    const whole = catalogMerchant(names, products);
    const excluded = whole ? [whole] : names.split(/\s*,\s*|\s+(?:or|and)\s+/i)
      .map(name => catalogMerchant(name.replace(/^(?:or|and)\s+/i, ""), products));
    if (excluded.length && excluded.every((name): name is string => Boolean(name))) {
      const picturedTelevision = /\b(?:tvs?|televisions?)\b/i.test(positive) && !/\bgift\s*cards?\b/i.test(positive);
      const remaining = products.filter(product => (!picturedTelevision || !isGiftCardListing(product))
        && !excluded.some(name => matchesCatalogMerchant(product.retailer, name)));
      if (positive || qualified) return searchCatalogMatches(remaining, positive || "gift cards", undefined, { includeLowerGiftCards });
      return remaining.map(product => ({ product, kind: "product" }));
    }
  }
  const specificRetailers = /\bgift cards?\s+(?:for|from|at)\s+(?:both\s+|either\s+)?(.+)$/i.exec(query);
  if (specificRetailers) {
    const names = specificRetailers[1].split(/\s+(?:or|and|&)\s+/i).map(part => catalogMerchant(part, products));
    if (names.length > 1 && names.every(name => name !== null)) {
      return products.filter(product => isGiftCardListing(product) && names.some(name => name && matchesCatalogMerchant(product.retailer, name)))
        .map(product => ({ product, kind: "product" }));
    }
  }
  if (denomination.values.size > 1 && !denomination.budget && normalizeSearch(denomination.text) === "gift card") {
    return products.filter(product => isGiftCardListing(product) && denomination.values.has(product.value) &&
      (!merchant || matchesCatalogMerchant(product.retailer, merchant)) &&
      !excludedValues.has(product.value) &&
      queryWords(denomination.text).every(word => ["gift", "card"].includes(word) || queryWords(`${product.title} ${product.retailer} ${product.brand}`).includes(word)))
      .map(product => ({ product, kind: "product" }));
  }
  const alternatives = catalogAlternatives(query, products, denomination);
  if (alternatives) {
    const matches = new Map<string, CatalogSearchMatch>();
    const options = /^\d+ inch(?: or \d+ inch)+ (?:tvs?|televisions?)$/i.test(normalizeSearch(query))
      ? products.filter(product => !isGiftCardListing(product)) : products;
    for (const part of alternatives) {
      for (const match of searchCatalogMatches(options, part.text, part, { includeLowerGiftCards: !values.size && includeLowerGiftCards })) {
        if (!matches.has(match.product.slug) || match.kind === "product") matches.set(match.product.slug, match);
      }
    }
    return [...matches.values()].sort((first, second) => Number(first.kind === "retailer") - Number(second.kind === "retailer"));
  }
  const normalizedQuery = normalizeSearch(text);
  const tokens = queryWords(text);
  if ((!tokens.length && !values.size && !budget && entryPrice === null && !excludedValues.size) || tokens.length > maxCatalogSearchTerms) return [];
  const giftCards = /\bgift card\b/.test(normalizedQuery);
  const television = tokens.includes("tv") || tokens.includes("television");
  const accessoryQuery = television ? /\b(?:tv|television)s?\s+(?:(?:wall|table)\s+)?(stand|mount|remote|antenna)s?\b|\b(stand|mount|remote|antenna)s?\s+for\s+(?:(?:a|the)\s+)?(?:tv|television)s?\b/.exec(normalizedQuery) : null;
  const televisionAccessory = accessoryQuery?.[1] ?? accessoryQuery?.[2];
  const televisionSize = television ? /\b\d+ inch\b/.exec(normalizedQuery)?.[0] : undefined;
  const exactScreenSize = televisionSize ? new RegExp(`\\b${televisionSize}\\b`) : null;
  const appStoreGiftCard = giftCards && /\b(?:app store|itunes)\b/.test(normalizedQuery);
  const includeLower = includeLowerGiftCards && !exactOnly && Boolean(merchant) && values.size === 1;
  const requestedMax = Math.max(...values);
  const candidates = products.filter(product => (entryPrice === null || (exclusiveEntryPrice ? product.entryPrice < entryPrice : entryPriceIsMaximum ? product.entryPrice <= entryPrice : product.entryPrice === entryPrice))
    && !excludedValues.has(product.value)
    && (!values.size || values.has(product.value)
      || (includeLower && product.value < requestedMax && isGiftCardListing(product)))
    && (budget?.minimum === undefined || (budget.exclusiveMinimum ? product.value > budget.minimum : product.value >= budget.minimum))
    && (budget?.maximum == null || (budget.inclusive ? product.value <= budget.maximum : product.value < budget.maximum))
    && (!giftCards || isGiftCardListing(product))
    && (!appStoreGiftCard || /\b(?:app store|itunes)\b/.test(normalizeSearch(`${product.title} ${product.retailer}`)))
    && (!merchant || matchesCatalogMerchant(product.retailer, merchant))
    && (!branded || isBrand(product))
    && (!screenSize || (!isGiftCardListing(product) && /\b(?:tv|television)\b/.test(normalizeSearch(product.title))
      && [...normalizeSearch(product.title).matchAll(/\b(\d+) inch\b/g)].some(([, size]) =>
        screenSize.upper ? (screenSize.inclusive ? Number(size) <= screenSize.size : Number(size) < screenSize.size)
          : (screenSize.inclusive ? Number(size) >= screenSize.size : Number(size) > screenSize.size))))
    && (!screenRange || (!isGiftCardListing(product) && /\b(?:tv|television)\b/.test(normalizeSearch(product.title))
      && [...normalizeSearch(product.title).matchAll(/\b(\d+) inch\b/g)].some(([, size]) =>
        Number(size) >= Math.min(Number(screenRange[1]), Number(screenRange[2])) && Number(size) <= Math.max(Number(screenRange[1]), Number(screenRange[2])))))
    && (!exactScreenSize || televisionAccessory || isGiftCardListing(product) || exactScreenSize.test(normalizeSearch(product.title)))
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

export function catalogAlternatives(query: string, products: readonly DemoProduct[], denomination: ReturnType<typeof searchDenominations>) {
  const giftCards = /\bgift card\b/.test(normalizeSearch(query));
  if (giftCards) query = query.replace(/(\$\s*\d[\d,.]*)\s+plus\s+(?=\$\s*\d)/gi, "$1 or ");
  const orSeparator = /\s+or\s+(?!(?:equal\s+to|less|lower|more|below|above|under|higher|up|cheaper)\b)/i;
  const hasOr = orSeparator.test(query);
  if (!hasOr && (!giftCards || !/\s+(?:and|&)\s+/i.test(query) || catalogMerchant(query, products))) return null;
  const clauses = query.split(hasOr ? new RegExp(/\s*,(?!\d)\s*(?:or\s+)?/.source + "|" + orSeparator.source, "i") : /\s+(?:and|&)\s+/i);
  const parts = clauses.map(clause => {
    const parsed = searchDenominations(clause.trim(), products);
    const retailerClause = parsed.text.replace(/^(?:gift\s+card\s+)?(?:from\s+)?either\s+/i, "");
    return { ...parsed, merchant: parsed.merchant ?? catalogMerchant(retailerClause, products) };
  });
  if (hasOr && giftCards && parts[0].text && parts.some(part => part.budget)
    && parts.slice(1).every(part => !part.text && (part.budget || part.values.size))) {
    return parts.map(part => ({ ...part, text: parts[0].text, merchant: parts[0].merchant, exactOnly: true }));
  }
  const last = parts.at(-1);
  const sharedScreenType = last && /^\d+ inch (tvs?|televisions?)$/i.exec(normalizeSearch(last.text));
  if (hasOr && sharedScreenType && parts.slice(0, -1).every(part => /^\d+ inch$/i.test(normalizeSearch(part.text)))) {
    return parts.map((part, index) => ({ ...part, text: index === parts.length - 1 ? part.text : `${part.text} ${sharedScreenType[1]}` }));
  }
  const retailerSuffix = /\s+(?:at|from)\s+(.+)$/i.exec(clauses.at(-1) ?? "");
  const scopedRetailer = retailerSuffix && catalogMerchant(retailerSuffix[1], products);
  if (hasOr && giftCards && scopedRetailer && parts.every(part => part.budget)
    && parts.slice(0, -1).every(part => !part.merchant)) {
    return parts.map(part => ({ ...part, text: "gift card", merchant: scopedRetailer }));
  }
  const televisionSuffix = last && /^\S+\s+(tvs?|televisions?)$/i.exec(last.text);
  if (hasOr && televisionSuffix && parts.slice(0, -1).every(part =>
    /^\S+$/.test(part.text) && products.some(product => normalizeSearch(product.brand) === normalizeSearch(part.text)))) {
    return parts.map((part, index) => ({
      ...part, text: index === parts.length - 1 ? part.text : part.text + " " + televisionSuffix[1],
    }));
  }
  if (hasOr && parts.every(part => part.budget) && parts[0].text && parts.slice(1).every(part => !part.text)) {
    return parts.map(part => ({ ...part, text: parts[0].text, merchant: parts[0].merchant }));
  }
  if (!hasOr && !parts.every(part => part.merchant)) {
    if (!giftCards || !denomination.budget || !/\bbetween\b/i.test(query)) return null;
    const merchants = denomination.text.split(/\s+(?:and|&)\s+/i).map(part => catalogMerchant(part, products));
    if (merchants.length < 2 || merchants.some(merchant => !merchant)) return null;
    return merchants.map(merchant => ({ ...denomination, text: "gift card", merchant }));
  }
  if (denomination.budget && !parts.some(part => part.budget)) return null;
  const merchants = new Set(parts.flatMap(part => part.merchant ? [part.merchant] : []));
  const priced = parts.filter(part => part.values.size);
  const sharedMerchant = merchants.size === 1 ? [...merchants][0] : null;
  const sharedValues = priced.length === 1 ? priced[0].values : null;
  const trailing = parts.at(-1);
  const sharedBudget = trailing?.budget && parts.slice(0, -1).every(part => !part.budget && !part.values.size)
    ? trailing.budget : null;
  if (giftCards && merchants.size && parts.every(part => part.merchant || (sharedMerchant && part.values.size && queryWords(part.text).every(word => word === "gift" || word === "card")))) {
    const scoped = parts.map(part => ({ ...part, text: "gift card", merchant: part.merchant ?? sharedMerchant,
      budget: part.budget ?? sharedBudget, values: part.values.size ? part.values : sharedValues ?? part.values, exactOnly: Boolean(denomination.values.size) }));
    if (!denomination.values.size || scoped.every(part => part.values.size)) return scoped;
  }
  if (parts.every(part => queryWords(part.text).length > 0)
    && (!denomination.values.size || parts.every(part => part.values.size && queryWords(part.text).some(word => word !== "gift" && word !== "card")))) return parts;
  if (hasOr && parts.some(part => part.values.size || part.budget) && parts.every(part => queryWords(part.text).length)) return parts;
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
