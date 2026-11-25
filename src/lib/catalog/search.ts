import type { DemoProduct } from "./demo-products";
import { retailerFilterGroups } from "./browse-filters";
import { giftCardPartnerGroups } from "./gift-card-partners";
import { isGiftCardListing, productMatchesMarketplaceCategory } from "./navigation";
import { productSearchTerms, retailerDiscoveryTerms } from "./search-vocabulary";
import { maxCatalogSearchLength, maxCatalogSearchTerms, normalizeSearch, queryWords, searchWords, searchWordScore } from "./search-text";
import { catalogMerchant, matchesCatalogMerchant, searchDenominations, remainingTicketFilter, smallNumberWords, spokenValue } from "./search-denomination";

export type CatalogSearchMatch = { product: DemoProduct; kind: "product" | "retailer" };

const allKnownRetailers = (retailers: string, products: readonly DemoProduct[]) => retailers.split(/\s+(?:and|or|&)\s+/i).every(name => catalogMerchant(name, products));

const spokenMeasurement = new RegExp(String.raw`\b(${smallNumberWords})[ -]+(inches|inch|terabytes?|gigabytes?|quarts?|ounces?|people|persons?)\b`, "gi");
const giftCardValue = String.raw`\$\s*\d+(?:\.\d{1,2})?`;
const restrictedGiftAlternatives = new RegExp(String.raw`^gift cards?\s+(${giftCardValue}(?:\s+or\s+${giftCardValue})+)\s+(?:but\s+)?only\s+from\s+(.+?)\s*[.!?]?$`, "i");
const exactGiftCardEach = new RegExp(String.raw`^(.+?)\s+gift cards?\s+at\s+(${giftCardValue})\s+each\s*[.!?]?$`, "i");
const giftCardOptions = new RegExp(String.raw`^(.+?)\s+(${giftCardValue}(?:\s+(?:and|or)\s+${giftCardValue})+)\s+gift card options?\s*[.!?]?$`, "i");

export function searchCatalogMatches(
  products: readonly DemoProduct[],
  rawQuery: string,
  parsedDenomination?: ReturnType<typeof searchDenominations>,
  { includeLowerGiftCards = false } = {},
): CatalogSearchMatch[] {
  if (rawQuery.length > maxCatalogSearchLength) return [];
  const televisedEntry = /^((?:under|less than|at most|up to)\s+\$\s*[\d,.]+)\s+to enter\s+(TVs?|televisions?)\s*[.!?]?$/i.exec(rawQuery.trim());
  if (televisedEntry) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product)),
      televisedEntry[2] + " " + televisedEntry[1] + " per entry", undefined, { includeLowerGiftCards });
  }
  const query = rawQuery.trim().replace(restrictedGiftAlternatives, "$2 gift cards $1")
    .replace(exactGiftCardEach, "$1 gift cards exactly $2")
    .replace(spokenMeasurement, (_, number: string, unit: string) => String(spokenValue(number)) + " " + unit)
    .replace(/^\s*(?:(?:please\s+)?(?:search for|show me|find me|look for))\s+/i, "")
    .replace(/^\s*where\s+(?:are|is)\s+(?:(?:your|the)\s+)?/i, "")
    .replace(giftCardOptions, (phrase, retailer: string, values: string) => catalogMerchant(retailer, products)
      ? retailer + " gift cards " + values.replace(/\s+and\s+/gi, " or ") : phrase)
    .replace(/^gift cards?\s+(?:at|from)\s+(.+?)\s+rather than\s+(.+?)\s*[.!?]?$/i,
      (phrase, preferred: string, excluded: string) => catalogMerchant(preferred, products) && catalogMerchant(excluded, products)
        ? preferred + " gift cards excluding " + excluded : phrase)
    .replace(/^non[ -]+gift[ -]+cards?\s+(?:prizes?|items?|products?)\s+(?:at|from)\s+/i, "pictured ")
    .replace(/\s+(?:and\s+)?within\s+(?=\$\s*\d)/gi, " up to ")
    .replace(/^\s*(?:any|all|retailer)\s+(?=.*\bgift\s*cards?\b)/i, "")
    .replace(/^\s*all\s+(?=electronics\b)/i, "")
    .replace(/^only\s+(\$\s*[\d,.]+?)\s+cards?\s+from\s+(.+?)\s*[.!?]?$/i,
      (phrase, amount: string, retailers: string) => allKnownRetailers(retailers, products) ? retailers + " gift cards exactly " + amount : phrase)
    .replace(/^((?:up to|at most|no more than)\s+\$\s*[\d,.]+)\s+from\s+(.+?),?\s+gift cards?\s+only\s*[.!?]?$/i,
      (phrase, limit: string, retailers: string) => allKnownRetailers(retailers, products) ? retailers + " gift cards " + limit : phrase)
    .replace(/^which\s+(.+?)\s+cards?\s+have\s+an?\s+(\$\s*[\d,.]+)\s+value\s*[.!?]?$/i,
      (phrase, retailer: string, amount: string) => catalogMerchant(retailer, products) ? retailer + " gift cards exactly " + amount : phrase)
    .replace(/^(?:only\s+)?(.+?\bgift cards?)\s+with\s+a\s+balance of\s+(\$\s*[\d,.]+?)\s*[.!?]?$/i, "$1 exactly $2")
    .replace(/(\bgift cards?\b.*?)\s+with\s+(\$\s*[\d,.]+)\s+excluded\s*[.!?]?$/i, "$1 excluding $2")
    .replace(/^(.+?)\s+that costs?\s+(\$\s*[\d,.]+)\s+to enter\s+(?:at|from)\s+(.+?)\s*[.!?]?$/i,
      (phrase, product: string, amount: string, retailer: string) => catalogMerchant(retailer, products) ? retailer + " " + product + " " + amount + " per entry" : phrase)
    .replace(/^\s*gift cards?\s+(?:at|from|sold by)\s+(.+?)\s+that\s+(?:are not|aren[’']t)\s+(?=\$)/i, "$1 gift cards excluding ")
    .replace(/^\s*(.+?)\s+(?:and|or)\s+(.+?)\s+have\s+(\$\s*[\d,.]+?)\s+gift cards?\s*[.!?]?$/i,
      (phrase, first: string, second: string, amount: string) => catalogMerchant(first, products) && catalogMerchant(second, products)
        ? first + " or " + second + " gift cards exactly " + amount : phrase)
    .replace(/^(\s*(?:.*?\s+)?(?:tvs?|televisions?)\s+(?:except(?: for)?|excluding|without)\s+.+?)\s+models\s*[.!?]?$/i, "$1")
    .replace(/\b(tvs?|televisions?)\s+sets?\b/gi, "$1")
    .replace(/\s+(?:that\s+costs?|priced)\s+(?=(?:(?:exactly|up to|at most|no more than|below|under|less than|above|over|at least)\s+)?\$\s*\d)/gi, " ")
    .replace(/\bpriced\s+at\s+(?=(?:over|above|under|below)\s+\$)/gi, "")
    .replace(/^(.*?)\s+no gift cards?\s+(?=(?:under|below|over|above|at least|up to|between)\b)/i, "$1 without gift cards ")
    .replace(/^only\s+(.+?)\s+with photos\b/i, "pictured $1")
    .replace(/^(.+?)\s+pictured\s+((?:products?|items?|prizes?)\b.*)$/i, "pictured $1 $2")
    .replace(/^shown with (?:a )?picture\s+(?:from|at)\s+/i, "pictured ")
    .replace(/^(?:a\s+)?(tvs?|televisions?)\s+measuring\s+(?=between\b)/i, "$1 ")
    .replace(/^(tvs?|televisions?)\s+from\s+(.+?)\s+with\s+screens?\s+(between\s+\d+(?:\.\d+)?\s+and\s+\d+(?:\.\d+)?\s+inch(?:es)?)\s*[.!?]?$/i, "$1 $3 from $2")
    .replace(/^entr(?:y|ies)\s+for\s+((?:under|below|less than|at most|up to)\s+\$\s*[\d,.]+)\s+for\s+(.+)$/i, "$2 $1 per entry")
    .replace(/\b(?:with (?:tickets? available(?:\s+now)?|(?:tickets?|entries)\s+(?:left|still open))|(?:that|which)\s+(?:(?:still\s+)?have\s+available\s+tickets?|still\s+have\s+(?:tickets?|entries)(?:\s+left)?)|(?:has|have)\s+(?:tickets?|entries)\s+left)\s*[.!?]?$/i, " available")
    .replace(/\b(gift cards?)\s+of\s+(?=\$)/i, "$1 ")
    .replace(/(\bgift cards?\s+(?:from|at|sold by)\s+.+?)\s+worth\s+(?=exactly\s+\$)/i, "$1 ")
    .replace(/(\bgift cards?\b.*\$\s*\d[\d,.]*)\s+per (?:gift\s+)?card\s*[.!?]?$/i, "$1")
    .replace(/\b(gift cards?)\s+for\s+(?=(?:less than|under|below|at most|up to)\s+\$)/i, "$1 ")
    .replace(/\bstill open\s*[.!?]?$/i, " available")
    .replace(/\bat\s+(\$\s*\d[\d,.]*?)\s+or\s+below\s*[.!?]?$/i, "up to $1")
    .replace(/\bfor (\$\s*[\d,.]+)\s+entries(?=\s+with\b)/i, "$1 per entry")
    .replace(/\bthat costs?\s+(.+?)\s+to enter\s*[.!?]?$/i, " $1 per entry")
    .replace(/(\b(?:under|below|less than|at most|no more than|up to)\s+\$\s*[\d,.]+?)\s+to enter\s*[.!?]?$/i, "$1 per entry")
    .replace(/\bwhere\s+(?:the\s+)?entry\s+costs?\s+(\$\s*[\d,.]+)\s*[.!?]?$/i, "$1 per entry")
    .replace(new RegExp(String.raw`\bwith (?:a )?face value of\s+(${smallNumberWords})[ -]+(?:dollars?|bucks?)\s*[.!?]?$`, "i"),
      (_, value: string) => "exactly $" + spokenValue(value))
    .replace(/\bwith (?:a )?face value of\s+(?=(?:exactly\s+)?\$)/i, "")
    .replace(/^gift cards?\s+(?:from|at)\s+(.+?),\s*(\$\s*\d[\d,.]*?)\s+face value\s*[.!?]?$/i,
      (phrase, retailers: string, amount: string) => allKnownRetailers(retailers, products) ? retailers + " gift cards exactly " + amount : phrase)
    .replace(/(\bgift cards?\b.*?)\s+with\s+((?:at least|at most|under|over|up to)\s+\$\s*\d[\d,.]*?)\s+of value\s*[.!?]?$/i, "$1 $2")
    .replace(/^excluding\s+(?:the\s+)?(\$\s*\d[\d,.]*?)\s+gift cards?\s+(?:from|at)\s+(.+?)\s*[.!?]?$/i,
      (phrase, amount: string, retailer: string) => catalogMerchant(retailer, products) ? retailer + " gift cards excluding " + amount : phrase)
    .replace(/^(between\s+\$[\d,.]+\s+and\s+\$[\d,.]+)\s+worth of\s+/i, "$1 ")
    .replace(/\bno higher than\s+(?=\$)/i, "up to ")
    .replace(/\bhigher than\s+(?=\$)/i, "over ")
    .replace(/\bwith (?:a )?minimum value of\s+(?=\$)/i, "at least ")
    .replace(/\bwith (?:a )?(\$\s*[\d,.]+)\s+price limit\s*[.!?]?$/i, "up to $1")
    .replace(/(\bgift cards?\b.*?)\s+but\s+leave out\s+(?=(?:the\s+)?\$)/i, "$1 excluding ")
    .replace(/\b(?:without|excluding|except(?: for)?)\s+(?:the\s+)?(\$\s*[\d,.]+?)\s+cards?\s*[.!?]?$/i, "excluding $1")
    .replace(/^up to (\$\s*[\d,.]+)\s+in\s+(gift cards?\b.+)$/i, "$2 up to $1")
    .replace(/^what gift card can I get from (.+?) for (\$\s*[\d,.]+)\s*\??$/i,
      (phrase, retailer: string, amount: string) => catalogMerchant(retailer, products) ? "exactly " + amount + " " + retailer + " gift card" : phrase)
    .replace(/\bgift cards?\s+that\s+(?:aren[’']t|are not)\s+sold (?:by|at)\s+/i, "gift cards excluding ")
    .replace(/\bwith ((?:\d+|one|two|three|four|five)(?:\s+or\s+(?:\d+|one|two|three|four|five))+)\s+left\b/i, "with $1 tickets left")
    .replace(/\s+in value(?=\s*[.!?]?$)/i, "")
    .replace(/\bwith\s+(?=(?:more than|greater than)\s+\$)/i, "")
    .replace(/\bexcept all (?:under|below)\s+(?=\$)/i, "at least ")
    .replace(/^(.+?)\s+both at\s+(\$\s*\d+(?:\.\d{1,2})?)\s+gift cards?\s*[.!?]?$/i, "$2 $1 gift cards")
    .replace(/^\s*(exactly\s+\$\s*\d+(?:\.\d{1,2})?\s+)(.+)\s+cards?\s*$/i,
      (phrase, amount: string, name: string) => catalogMerchant(name, products) ? amount + name + " gift cards" : phrase)
    .replace(/^(?:prizes?|products?|offers?)\s+(?:from|at)\s+|^prizes?\s+for\s+(?=(?!\d|\$)\S)/i, "")
    .replace(/^what (.+?) can I enter for (\$\s*[\d,.]+)\s*[?]?$/i, "$1 $2 per entry")
    .replace(/\bwith (?:a\s+)?(\$\s*[\d,.]+) maximum entry fee\s*[.!?]?$/i, "up to $1 per entry")
    .replace(/\bthat (?:is|are) from\b/gi, "from")
    .replace(/\bwith (\d+|one|two|three|four|five) left\b/i, "with $1 tickets left")
    .replace(/^(\d+|one|two|three|four|five) (tickets?|entries) or (?:less|fewer)\s*[.!?]?$/i, "at most $1 $2 left")
    .replace(/^(\d+(?:\s+(?:or|and)\s+\d+)+)\s+inch(?:es)?(?=\s+(?:tvs?|televisions?)\b)/i,
      (_, sizes: string) => sizes.split(/\s+(?:or|and)\s+/i).map(size => size + "-inch").join(" or "))
    .replace(/^\s*((?:no more than|at most|up to|under|below)\s+\$\s*\d[\d,.]*)\s+in\s+(.+?)\s+gift cards?\s*[.!?]?$/i,
      "$1 gift cards from $2")
    .replace(/\bgift\s*cards?\s+to\s+(?:order|buy)\s+groceries\b/i, "grocery gift cards")
    .replace(/\bwith\s+(?=(?:under|below|less than|at most)\s+\$[\d,.]+\s+face value\b)/i, "")
    .replace(/\bfrom\s+(\$\s*\d+(?:\.\d{1,2})?)\s+and\s+up\b/gi, "at least $1")
    .replace(/\bnot including\s+(?=[a-z])/gi, "excluding ")
    .replace(/\bnot sold (?:by|at)\s+/gi, "excluding from ")
    .replace(/^(.+\b(?:tvs?|televisions?)|tvs?|televisions?)\s+not made by\s+/i, "$1 without ")
    .replace(/^(\d+\s*[- ]?\s*inch(?:es)?(?:\s+and\s+\d+\s*[- ]?\s*inch(?:es)?)+)(\s+(?:tvs?|televisions?)\b)/i,
      (_, sizes: string, type: string) => sizes.replace(/\s+and\s+/gi, " or ") + type)
    .replace(/\bneither\s+([^,;]+?)\s+nor\s+(.+)$/i, "excluding $1 and $2")
    .replace(/^(\$\s*\d+(?:\.\d{1,2})?)\s+or less in\s+(.+\bgift\s*cards?\b)[.!?]?$/i, "$2 up to $1")
    .replace(/\bgift\s*cards?\s+that\s+aren[’']t\s+from\b/i, "gift cards except")
    .replace(/\b(anywhere|everywhere)\s+except\b/i, "except")
    .replace(/\b(?:from\s+)?any retailer\s+but\b/i, "excluding")
    .replace(/\b(excluding|without|except(?: for)?)\s+all\s+(?=gift cards?\b)/i, "$1 ")
    .replace(/\bexcluding\s+retailers?\s+/i, "excluding ")
    .replace(/\b(?:one[ -])?dollar entry\s+(?:for|at)\s+(.+)$/i, "$1 $$1 per entry")
    .replace(/\b(headphones?|earbuds?|earphones?|headsets?)\s+(?:made\s+)?by\s+(?:either\s+)?(.+?)\s+((?:under|below|up to|at most|less than|between)\s+\$.+)$/i, "$2 $1 $3")
    .replace(/\b(headphones?|earbuds?|earphones?|headsets?)\s+(?:made\s+)?by\s+(?:either\s+)?(.+)$/i, "$2 $1")
    .replace(/^(TVs?|televisions?)\s+by\s+either\s+(.+\s+or\s+.+)$/i, "$2 $1");
  if (query.length > maxCatalogSearchLength || queryWords(query).length > maxCatalogSearchTerms) return [];
  const pictured = /^pictured\s+(.+)$/i.exec(query.trim());
  if (pictured) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product)), pictured[1], undefined, { includeLowerGiftCards });
  }
  const availableOnly = /^\s*(?:available\s+|open\s+(?!box\b))(.+)$/i.exec(query)
    ?? /^\s*(.+?)\s+(?:(?:that|which)\s+(?:are|is)\s+)?(?:still\s+)?(?:available(?:\s+now)?|in stock)\s*[.!?]?\s*$/i.exec(query)
    ?? /^\s*(.+?)\s+with available (?:tickets?|entr(?:y|ies)|spots?|slots?)\s*[.!?]?\s*$/i.exec(query);
  if (availableOnly && !/\b(?:tickets?|entr(?:y|ies)|spots?|slots?)$/i.test(availableOnly[1].trim())) {
    const open = products.filter(product => product.sold < product.capacity);
    return /^(?:prizes?|products?|offers?)$/i.test(availableOnly[1].trim())
      ? open.map(product => ({ product, kind: "product" }))
      : searchCatalogMatches(open, availableOnly[1], undefined, { includeLowerGiftCards });
  }
  const retailerTvSizes = /^(.+?)\s+(\d+\s*[- ]?\s*inch(?:es)?(?:\s+(?:and|or)\s+\d+\s*[- ]?\s*inch(?:es)?)+)\s+(tvs?|televisions?)\b(.*)$/i.exec(query.trim());
  const tvRetailer = retailerTvSizes && catalogMerchant(retailerTvSizes[1], products);
  if (retailerTvSizes && tvRetailer) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product) && matchesCatalogMerchant(product.retailer, tvRetailer)),
      retailerTvSizes[2].replace(/\s+and\s+/gi, " or ") + " " + retailerTvSizes[3] + retailerTvSizes[4], undefined, { includeLowerGiftCards });
  }
  const multiBrandTelevisions = /^(\S+)\s+(?:and|or|&)\s+(\S+)\s+((?:\d+\s*[- ]?\s*(?:inch(?:es)?|in\b|")\s+)?(?:tvs?|televisions?)\b.*)$/i.exec(query.trim());
  const hasBrand = (name: string) => products.some(product => normalizeSearch(product.brand) === normalizeSearch(name));
  const televisionPairs = /^(.+?\s+(?:and|or|&)\s+.+?)\s+(tvs?|televisions?)\b(.*)$/i.exec(query.trim());
  if (televisionPairs) {
    const [, choices, kind, tail] = televisionPairs;
    const names = choices.split(/\s+(?:and|or|&)\s+/i);
    if (names.every(name => catalogMerchant(name, products))) {
      const priceTail = tail.replace(/^(\s+)priced\s+(?=between\b)/i, "$1");
      return searchCatalogMatches(products, kind + priceTail + " from " + choices, undefined, { includeLowerGiftCards });
    }
    const pairs = names.map(choice => {
      const sizeFirst = /^(\d+)\s*[- ]?\s*(?:inch(?:es)?|["″])\s+(.+)$/i.exec(choice);
      if (sizeFirst) return { size: sizeFirst[1], brand: sizeFirst[2] };
      const brandFirst = /^(.+?)\s+(\d+)\s*[- ]?\s*(?:inch(?:es)?|["″])$/i.exec(choice);
      return brandFirst ? { size: brandFirst[2], brand: brandFirst[1] } : null;
    });
    if (pairs.length > 1 && pairs.every(pair => pair && hasBrand(pair.brand))) {
      const matches = new Map<string, CatalogSearchMatch>();
      for (const pair of pairs) {
        if (!pair) continue;
        const { size, brand } = pair;
        const scoped = products.filter(product => normalizeSearch(product.brand) === normalizeSearch(brand) && !isGiftCardListing(product));
        for (const match of searchCatalogMatches(scoped, size + " inch " + kind + tail)) {
          matches.set(match.product.slug, match);
        }
      }
      return [...matches.values()];
    }
  }
  const audioBrands = /^(.+?)\s+(headphones?|earbuds?|earphones?|headsets?)\b(.*)$/i.exec(query.trim());
  if (audioBrands) {
    const brands = audioBrands[1].split(/\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or|&)\s+/i);
    if (brands.length > 1 && brands.some(hasBrand) && brands.every(brand => /^[\p{L}\d][\p{L}\d -]*$/u.test(brand))) {
      const names = new Set(brands.map(normalizeSearch));
      const scoped = products.filter(product => names.has(normalizeSearch(product.brand)) && !isGiftCardListing(product));
      return searchCatalogMatches(scoped, audioBrands[2] + audioBrands[3]);
    }
  }
  const retailerChoices = /^(.+?)\s+(?:at|from|sold by)\s+(?:either\s+)?(.+\s+(?:or|and|&)\s+.+)$/i.exec(query.trim());
  if (retailerChoices && !/\bgift card\b/.test(normalizeSearch(retailerChoices[1]))) {
    const retailerScope = searchDenominations(retailerChoices[2], products);
    const retailerList = retailerScope.budget ? retailerScope.text : retailerChoices[2];
    const retailers = retailerList.split(/\s*,\s*(?:(?:or|and)\s+)?|\s+(?:or|and|&)\s+/i).map(name => catalogMerchant(name, products));
    if (retailers.length > 1 && retailers.every((name): name is string => Boolean(name))) {
      const productScope = searchDenominations(retailerChoices[1], products);
      const scope = retailerScope.budget
        ? { ...searchDenominations(query, products), text: productScope.text }
        : productScope;
      const generic = !scope.text || /^(?:prizes?|products?|offers?|items?)$/i.test(scope.text);
      if (!generic || scope.budget || scope.values.size || scope.entryPrice !== null) {
        const scoped = products.filter(product => (generic || !isGiftCardListing(product))
          && retailers.some(name => matchesCatalogMerchant(product.retailer, name)));
        const text = generic ? "" : scope.text;
        return searchCatalogMatches(scoped, text, { ...scope, text, merchant: null }, { includeLowerGiftCards });
      }
    }
  }
  const audioChoices = /^(.+?)\s+((?:headphones?|earbuds?|earphones?|headsets?)(?:\s+or\s+(?:headphones?|earbuds?|earphones?|headsets?))+)$/i.exec(query.trim());
  if (audioChoices && hasBrand(audioChoices[1])) {
    const scoped = products.filter(product => !isGiftCardListing(product) && normalizeSearch(product.brand) === normalizeSearch(audioChoices[1]));
    return combineCatalogAlternatives(scoped, audioChoices[2].split(/\s+or\s+/i).map(text => searchDenominations(text, scoped)), false);
  }
  const exclusion = /^(.*\b(?:tvs?|televisions?)\b.*?)\s+(?:excluding|except(?: for)?|without|not)\s+(?:(from)\s+)?(.+)$/i.exec(query.trim());
  if (exclusion && !/\bgift card\b/.test(normalizeSearch(exclusion[1]))) {
    const [, positive, retailerOnly, names] = exclusion;
    if (!retailerOnly && /^(?:tv\s+)?accessories[.!?]?$/i.test(names)) {
      const televisions = products.filter(product => !isGiftCardListing(product)
        && !/\b(?:accessor(?:y|ies)|stands?|mounts?|remotes?|antennas?)\b/i.test(product.title));
      return searchCatalogMatches(televisions, positive, undefined, { includeLowerGiftCards });
    }
    const excluded = names.split(/\s*,\s*(?:(?:or|and)\s+)?|\s+(?:or|and|&)\s+/i).map(name => {
      const retailer = catalogMerchant(name, products);
      const brand = !retailerOnly && !retailer && hasBrand(name) ? normalizeSearch(name) : null;
      return { brand, retailer };
    });
    if (excluded.every(({ brand, retailer }) => brand || retailer)) {
      const eligible = products.filter(product => !isGiftCardListing(product) && !excluded.some(({ brand, retailer }) =>
        brand ? normalizeSearch(product.brand) === brand : retailer && matchesCatalogMerchant(product.retailer, retailer)));
      return searchCatalogMatches(eligible, positive, undefined, { includeLowerGiftCards });
    }
  }
  if (multiBrandTelevisions && hasBrand(multiBrandTelevisions[1]) && hasBrand(multiBrandTelevisions[2])) {
    const scoped = products.filter(product => !isGiftCardListing(product) && [multiBrandTelevisions[1], multiBrandTelevisions[2]]
      .some(brand => normalizeSearch(product.brand) === normalizeSearch(brand)));
    return searchCatalogMatches(scoped, multiBrandTelevisions[3], undefined, { includeLowerGiftCards });
  }
  const standaloneConsole = /^(.*\b(?:p[.\s-]*s|play[\s-]*station)[.\s-]*5\b.*?)\s*,?\s+(?:(?:but\s+)?(?:no|not|without|excluding)\s+(?:(?:a|any)\s+)?(?:game\s+)?bundles?|that\s+is\s+not\s+bundled)\s*[.!?]?$/i.exec(query);
  if (standaloneConsole) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product) && !/\bbundle\b/.test(normalizeSearch(product.title))), standaloneConsole[1], undefined, { includeLowerGiftCards });
  }
  const endingSoon = /^(?:ending soon|almost full|close to selling out)\s+(.+)$/i.exec(query);
  const humanFood = /\bgift\s*cards?\s+for\s+food\b/i;
  const foodScope = /\b(?:grocery|groceries|dining|restaurant|meal)\b/;
  if (endingSoon) {
    return searchCatalogMatches(products.filter(product => productMatchesMarketplaceCategory(product, "ending-soon")), endingSoon[1], undefined, { includeLowerGiftCards });
  }
  const foodDelivery = /\b(?:food|meal) delivery(?:\s+gift cards?\b)?|\bgift cards?\s+(?:from|for)\s+(?:food|meal) delivery\b/i;
  if (/\bgift\s*cards?\b/i.test(query) && foodDelivery.test(query)) {
    const scope = query.replace(foodDelivery, "gift cards");
    const scoped = products.filter(product => isGiftCardListing(product)
      && /\b(?:food|meal) delivery\b/i.test(retailerDiscoveryTerms(product.retailer, product.category)));
    return searchCatalogMatches(scoped, scope, undefined, { includeLowerGiftCards });
  }
  const pharmacy = /\bgift\s*cards?\s+(?:from|at|for)\s+pharmac(?:y|ies)\b/i;
  if (pharmacy.test(query)) {
    const options = retailerFilterGroups(giftCardPartnerGroups, products).find(group => group.id === "pharmacy")?.options ?? [];
    const scoped = products.filter(product => isGiftCardListing(product) && options.some(option => matchesCatalogMerchant(product.retailer, option.value)));
    return searchCatalogMatches(scoped, query.replace(pharmacy, "gift cards"), undefined, { includeLowerGiftCards });
  }
  if (humanFood.test(query)) {
    const scoped = products.filter(product => isGiftCardListing(product)
      && !productMatchesMarketplaceCategory(product, "pets")
      && foodScope.test(normalizeSearch(product.category + " " + retailerDiscoveryTerms(product.retailer, product.category))));
    return searchCatalogMatches(scoped, query.replace(humanFood, "gift cards"), undefined, { includeLowerGiftCards });
  }
  const ticketFilter = remainingTicketFilter(query);
  if (ticketFilter) {
    const scoped = products.filter(product => {
      const left = product.capacity - product.sold;
      return left >= ticketFilter.minimum && left <= ticketFilter.maximum && (!ticketFilter.counts || ticketFilter.counts.has(left));
    });
    return ticketFilter.text ? searchCatalogMatches(scoped, ticketFilter.text.replace(/^(?:from|at|on|sold by)\s+/i, ""), undefined, { includeLowerGiftCards })
      : scoped.map(product => ({ product, kind: "product" }));
  }
  const denomination = query === rawQuery && parsedDenomination ? parsedDenomination : searchDenominations(query, products);
  const { values, budget, exactOnly, conflictingBudget, entryPrice, entryPriceIsMaximum, exclusiveEntryPrice, screenSize, screenRange, excludedValues } = denomination;
  const genericRetailerNoun = /^(.+?)\s+(?:prizes?|offers?|products?)$/i.exec(denomination.text);
  const genericMerchant = genericRetailerNoun && catalogMerchant(genericRetailerNoun[1], products);
  if (genericRetailerNoun && genericMerchant) {
    return searchCatalogMatches(products, genericRetailerNoun[1], { ...denomination, text: genericRetailerNoun[1], merchant: genericMerchant }, { includeLowerGiftCards });
  }
  const qualifier = /\s+(?:from|at|sold by)\s+(.+)$/i.exec(denomination.text);
  const qualifiedMerchant = qualifier && !catalogMerchant(denomination.text, products) ? catalogMerchant(qualifier[1], products) : null;
  const qualifiedText = qualifiedMerchant && qualifier ? denomination.text.slice(0, qualifier.index) : denomination.text;
  const brandQualifier = /\s+by\s+(.+)$/i.exec(qualifiedText)
    ?? (!qualifiedMerchant && !/\bgift cards?\b/i.test(qualifiedText) ? /\s+from\s+(.+)$/i.exec(qualifiedText) : null);
  const brandName = brandQualifier ? normalizeSearch(brandQualifier[1]) : "";
  const isBrand = (product: DemoProduct) => {
    const actual = normalizeSearch(product.brand);
    return actual === brandName || actual.startsWith(brandName + " ");
  };
  const branded = Boolean(brandName) && products.some(isBrand);
  const brandedText = branded && brandQualifier ? qualifiedText.slice(0, brandQualifier.index) : qualifiedText;
  const text = brandedText;
  const merchant = denomination.merchant ?? qualifiedMerchant;
  if (denomination.unsupportedCurrency) return [];
  const qualifiedGifts = qualifiedGiftAlternatives(query, products);
  if (qualifiedGifts) return combineCatalogAlternatives(products, qualifiedGifts, false);
  if (conflictingBudget) return [];
  const withoutGiftCards = query.replace(/\s+without gift cards?\s+(?=(?:under|below|over|above|at least|up to|between)\b)/i, " ").replace(/^(?:anything but|no|without|excluding)\s+gift\s*cards?\s+(?=(?:under|below|over|above|up to|at most|at least|between)\b)/i, "").replace(/\s*,?\s+(?:(?:but\s+)?no|not|without|excluding|except)\s+(?:(?:a|any)\s+)?gift\s*cards?\s*[.!?]?$/i, "");
  if (withoutGiftCards !== query) {
    return searchCatalogMatches(products.filter(product => !isGiftCardListing(product)), withoutGiftCards, undefined, { includeLowerGiftCards });
  }
  const noGasCards = /^no gas\s+(gift\s*cards?\b.*)$/i.exec(query);
  const categoryExclusion = /^(.*?)\s+(?:excluding|without|except|that\s+(?:are not|aren[’']t))\s+((?:gift cards?|games?|gas)(?:\s+and\s+(?:gift cards?|games?|gas))*)(?=\s*$|\s*[.!?]$|\s+(?:under|below|over|above|up to|at most|at least|between)\s+\$)(.*)$/i.exec(query);
  if (noGasCards || (categoryExclusion && /\b(?:prizes?|products?|offers?|gift\s*cards?)\b/i.test(categoryExclusion[1]))) {
    const omissions = noGasCards ? ["gas"] : categoryExclusion![2].toLowerCase().split(/\s+and\s+/);
    const gasOptions = omissions.includes("gas")
      ? retailerFilterGroups(giftCardPartnerGroups, products).find(group => group.id === "gas")?.options ?? [] : [];
    const scoped = products.filter(product => !omissions.some(omission => {
      if (omission.startsWith("gift card")) return isGiftCardListing(product);
      if (omission === "gas") return productMatchesMarketplaceCategory(product, "gas")
        || gasOptions.some(option => matchesCatalogMerchant(product.retailer, option.value));
      return !isGiftCardListing(product) && (/\bgames?\b/i.test(product.title) || /\b(?:card|board|video) games?\b/i.test(product.category));
    }));
    const scope = noGasCards?.[1] ?? categoryExclusion![1] + categoryExclusion![3].replace(/^[.!?]$/, "");
    return searchCatalogMatches(scoped, scope, undefined, { includeLowerGiftCards });
  }
  const exclusionQuery = budget ? denomination.text : query;
  const retailerExclusion = /(?:\s*[,;]\s*no|(?:^|\s*,?\s+)(?:(?:from\s+)?(?:anybody|anyone|anywhere)\s+but|(?:from\s+)?(?:retailers?\s+)?other\s+than|but\s+(?:not|no)|excluding|(?:everywhere\s+)?except(?: for)?|besides|without|not))\s+(.+?)\s*[.!?]?$/i.exec(exclusionQuery);
  if (retailerExclusion) {
    const retailerSpecified = /^from\s+/i.test(retailerExclusion[1]);
    const suffix = retailerExclusion[1].replace(/^from\s+/i, "");
    const everything = /^(?:anything|everything|all\s+(?:items|prizes|products))$/i.test(exclusionQuery.slice(0, retailerExclusion.index).trim());
    const qualified = (retailerExclusion.index === 0 || everything) && /\s+gift\s*cards?$/i.test(suffix);
    const names = qualified ? suffix.replace(/\s+gift\s*cards?$/i, "") : suffix;
    const positive = exclusionQuery.slice(0, retailerExclusion.index).trim()
      .replace(/(\bgift\s*cards?)\s+(?:(?:from\s+)?all\s+retailers)$/i, "$1");
    if (!retailerSpecified && /\b(?:tvs?|televisions?)\b/i.test(positive) && !/\bgift\s*cards?\b/i.test(positive)) {
      const brand = normalizeSearch(names);
      if (products.some(product => normalizeSearch(product.brand) === brand)) {
        const eligible = products.filter(product => !isGiftCardListing(product) && normalizeSearch(product.brand) !== brand);
        return searchCatalogMatches(eligible, positive, budget ? { ...denomination, text: positive, merchant: null } : undefined, { includeLowerGiftCards });
      }
    }
    const whole = catalogMerchant(names, products);
    const excluded = whole ? [whole] : names.split(/\s*,\s*|\s+(?:or|and)\s+/i)
      .map(name => catalogMerchant(name.replace(/^(?:or|and)\s+/i, ""), products));
    if (excluded.length && excluded.every((name): name is string => Boolean(name))) {
      if (everything && qualified) {
        const remaining = products.filter(product => !isGiftCardListing(product)
          || !excluded.some(name => matchesCatalogMerchant(product.retailer, name)));
        return budget ? searchCatalogMatches(remaining, "", { ...denomination, text: "", merchant: null }, { includeLowerGiftCards })
          : remaining.map(product => ({ product, kind: "product" }));
      }
      const picturedTelevision = /\b(?:tvs?|televisions?)\b/i.test(positive) && !/\bgift\s*cards?\b/i.test(positive);
      const remaining = products.filter(product => (!picturedTelevision || !isGiftCardListing(product))
        && !excluded.some(name => matchesCatalogMerchant(product.retailer, name)));
      if (positive || qualified || budget) {
        const scope = positive || (qualified ? "gift cards" : "");
        return searchCatalogMatches(remaining, scope, budget ? { ...denomination, text: scope, merchant: null } : undefined, { includeLowerGiftCards });
      }
      return remaining.map(product => ({ product, kind: "product" }));
    }
    if (!retailerSpecified && positive && !qualified && !/\b(?:and|or)\b|,/.test(names)) {
      const omitted = queryWords(names);
      const containsOmitted = (product: DemoProduct) => {
        const terms = new Set(queryWords(product.title + " " + product.brand));
        return omitted.length > 0 && omitted.every(word => terms.has(word));
      };
      if (products.some(containsOmitted)) {
        return searchCatalogMatches(products.filter(product => !containsOmitted(product)), positive,
          budget ? { ...denomination, text: positive, merchant: null } : undefined, { includeLowerGiftCards });
      }
    }
  }
  const retailerQuery = budget || excludedValues.size || values.size || entryPrice !== null ? denomination.text : query;
  const sharedGiftCard = budget && !values.size || excludedValues.size || values.size && !budget && /^\s*\$\s*\d+(?:[.,]\d+)*\s+/.test(query)
    ? /^(.+?)\s+gift cards?$/i.exec(denomination.text.trim()) : null;
  if (sharedGiftCard) {
    const retailers = sharedGiftCard[1].split(/\s*,\s*(?:(?:or|and)\s+)?|\s+(?:or|and|&)\s+/i).map(name => catalogMerchant(name, products));
    if (retailers.length > 1 && retailers.every((name): name is string => Boolean(name))) {
      const scoped = products.filter(product => isGiftCardListing(product) && retailers.some(name => matchesCatalogMerchant(product.retailer, name)));
      return searchCatalogMatches(scoped, "gift card", { ...denomination, text: "gift card", merchant: null, exactOnly: true }, { includeLowerGiftCards: false });
    }
  }
  const specificRetailers = /\bgift cards?\s+(?:for|from|at|sold by)\s+(?:both\s+|either\s+)?(.+)$/i.exec(retailerQuery);
  if (specificRetailers) {
    const retailerList = budget || values.size ? specificRetailers[1].replace(/\s+for$/i, "") : specificRetailers[1];
    const names = retailerList.split(/\s*,\s*(?:(?:or|and)\s+)?|\s+(?:or|and|&)\s+/i).map(part => catalogMerchant(part, products));
    if ((names.length > 1 || exactOnly && values.size > 0) && names.every(name => name !== null)) {
      const scoped = products.filter(product => isGiftCardListing(product) && names.some(name => name && matchesCatalogMerchant(product.retailer, name)));
      const scope = retailerQuery.slice(0, specificRetailers.index) + "gift cards";
      return searchCatalogMatches(scoped, scope, { ...denomination, text: scope, merchant: null }, { includeLowerGiftCards: false });
    }
  }
  if (denomination.values.size > 1 && !denomination.budget && normalizeSearch(denomination.text) === "gift card") {
    return products.filter(product => isGiftCardListing(product) && denomination.values.has(product.value) &&
      (!merchant || matchesCatalogMerchant(product.retailer, merchant)) &&
      !excludedValues.has(product.value) &&
      queryWords(denomination.text).every(word => ["gift", "card"].includes(word) || queryWords(`${product.title} ${product.retailer} ${product.brand}`).includes(word)))
      .map(product => ({ product, kind: "product" }));
  }
  const giftCardAmountsOnly = /^(.*?)\s+\$\s*\d+(?:\.\d{1,2})?(?:\s+or\s+\$\s*\d+(?:\.\d{1,2})?)+\s*$/i.exec(query);
  if (giftCardAmountsOnly && /\bgift cards?\b/i.test(giftCardAmountsOnly[1]) && values.size > 1) {
    const scope = denomination.merchant ? denomination.text : giftCardAmountsOnly[1].replace(/\s+worth$/i, "");
    return searchCatalogMatches(products, scope, { ...denomination, text: scope, exactOnly: true });
  }
  const sharedRetailer = /^(.+\s+or\s+.+?)\s+(?:at|from|sold by)\s+(.+?)\s*[.!?]?$/i.exec(query);
  const sharedMerchant = sharedRetailer && catalogMerchant(sharedRetailer[2], products);
  if (sharedMerchant && sharedRetailer) {
    const brands = sharedRetailer[1].split(/\s+or\s+/i).map(normalizeSearch);
    const hasBrand = (product: DemoProduct, brand: string) => {
      const name = normalizeSearch(product.brand);
      return name === brand || name.startsWith(brand + " ");
    };
    if (brands.every(brand => products.some(product => hasBrand(product, brand)) || catalogMerchant(brand, products))) {
      return products.filter(product => !isGiftCardListing(product) && matchesCatalogMerchant(product.retailer, sharedMerchant)
        && brands.some(brand => hasBrand(product, brand))).map(product => ({ product, kind: "product" }));
    }
  }
  const alternatives = catalogAlternatives(query, products, denomination);
  if (alternatives) {
    const options = /^\d+ inch(?: or \d+ inch)+ (?:tvs?|televisions?)\b/i.test(normalizeSearch(query))
      ? products.filter(product => !isGiftCardListing(product)) : products;
    return combineCatalogAlternatives(options, alternatives, !values.size && includeLowerGiftCards);
  }
  const normalizedQuery = normalizeSearch(text);
  const tokens = queryWords(text);
  if ((!tokens.length && !values.size && !budget && entryPrice === null && !excludedValues.size) || tokens.length > maxCatalogSearchTerms) return [];
  const giftCards = /\bgift card\b/.test(normalizedQuery);
  const headphones = /\bheadphones?\b/.test(normalizedQuery);
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
    && (!headphones || giftCards || !isGiftCardListing(product))
    && (!television || televisionAccessory || giftCards || !(qualifiedMerchant || budget || values.size) || !isGiftCardListing(product))
    && (!appStoreGiftCard || /\b(?:app store|itunes)\b/.test(normalizeSearch(`${product.title} ${product.retailer}`)))
    && (!merchant || matchesCatalogMerchant(product.retailer, merchant))
    && (!branded || isBrand(product))
    && (!screenSize || (!isGiftCardListing(product) && /\b(?:tv|television)\b/.test(normalizeSearch(product.title))
      && [...normalizeSearch(product.title).matchAll(/\b(\d+) inch\b/g)].some(([, size]) =>
        screenSize.upper ? (screenSize.inclusive ? Number(size) <= screenSize.size : Number(size) < screenSize.size)
          : (screenSize.inclusive ? Number(size) >= screenSize.size : Number(size) > screenSize.size))))
    && (!screenRange || (!isGiftCardListing(product) && /\b(?:tv|television)\b/.test(normalizeSearch(product.title))
      && [...normalizeSearch(product.title).matchAll(/\b(\d+) inch\b/g)].some(([, size]) =>
        (screenRange.exclusiveLow ? Number(size) > screenRange.low : Number(size) >= screenRange.low) && (screenRange.exclusiveHigh ? Number(size) < screenRange.high : Number(size) <= screenRange.high))))
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
  const results = documents.map(({ product, title, merchant, category, document, expanded }) => {
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
  if (results.length || giftCards || budget || values.size) return results;
  const list = /^(\S+)\s+([^&]+?)\s+and\s+([^&]+?)\s*[.!?]?$/i.exec(query.trim());
  if (!list || !hasBrand(list[1]) || list.slice(2).some(part => /\band\b/i.test(part))) return results;
  const brandedProducts = candidates.filter(product => normalizeSearch(product.brand) === normalizeSearch(list[1]));
  const groups = list.slice(2).map(part => {
    const words = queryWords(part);
    return brandedProducts.filter(product => {
      const titleWords = searchWords(product.title);
      return words.length > 0 && words.every(word => titleWords.includes(word));
    });
  });
  return groups.every(group => group.length)
    ? [...new Set(groups.flat())].map(product => ({ product, kind: "product" }))
    : results;
}

function combineCatalogAlternatives(products: readonly DemoProduct[], alternatives: ReturnType<typeof searchDenominations>[], includeLowerGiftCards: boolean) {
  const matches = new Map<string, CatalogSearchMatch>();
  for (const part of alternatives) {
    for (const match of searchCatalogMatches(products, part.text, part, { includeLowerGiftCards })) {
      if (!matches.has(match.product.slug) || match.kind === "product") matches.set(match.product.slug, match);
    }
  }
  return [...matches.values()].sort((first, second) => Number(first.kind === "retailer") - Number(second.kind === "retailer"));
}

function qualifiedGiftAlternatives(query: string, products: readonly DemoProduct[]) {
  if (!/\bgift card\b/.test(normalizeSearch(query))) return null;
  const shared = /^(.+?)\s+(?:from|at)\s+(?:either|both)\s+(.+)$/i.exec(query.trim());
  if (shared && /\bgift card\b/.test(normalizeSearch(shared[1]))) {
    const price = searchDenominations(shared[1], products);
    const retailers = shared[2].split(/\s+(?:or|and|&)\s+/i).map(name => catalogMerchant(name, products));
    if (price.values.size && retailers.length > 1 && retailers.every((name): name is string => Boolean(name))) {
      return retailers.map(merchant => ({ ...price, text: "gift card", merchant, exactOnly: true }));
    }
  }
  const soldBy = /^gift cards?\s+sold by\s+(.+)$/i.exec(query.trim());
  const clauses = (soldBy?.[1] ?? query).split(/\s+(?:or|and)\s+/i);
  if (clauses.length < 2) return null;
  if (soldBy) {
    const amounts = clauses.map(clause => /^(?:by\s+)?(.+?)\s+for\s+(\$\s*[\d,.]+)\s*[.!?]?$/i.exec(clause));
    if (!amounts.every(clause => clause && catalogMerchant(clause[1], products))) return null;
    return qualifiedGiftAlternatives(amounts.map(clause => clause![2] + " " + clause![1] + " gift card").join(" or "), products);
  }
  if (!/\bgift card\b/.test(normalizeSearch(clauses[0]))) return null;
  const parts = clauses.map(clause => {
    const part = searchDenominations(clause, products);
    const terms = normalizeSearch(part.text);
    const giftTerms = /^gift card(?: (?:for|from|at|sold by) (.+))?$/.exec(terms);
    const merchant = giftTerms
      ? part.merchant ?? catalogMerchant(giftTerms[1] ?? "", products)
      : catalogMerchant(part.text, products);
    return { ...part, merchant };
  });
  return parts.every(part => part.merchant && (part.values.size || part.budget) && !part.conflictingBudget && !part.unsupportedCurrency)
    ? parts.map(part => ({ ...part, text: "gift card", exactOnly: true })) : null;
}

export function catalogAlternatives(query: string, products: readonly DemoProduct[], denomination: ReturnType<typeof searchDenominations>) {
  if (denomination.excludedValues.size && !/\bor\b/i.test(denomination.text)) return null;
  query = remainingTicketFilter(query)?.text ?? query;
  const qualifiedGifts = qualifiedGiftAlternatives(query, products);
  if (qualifiedGifts) return qualifiedGifts;
  const giftCards = /\bgift card\b/.test(normalizeSearch(query));
  if (giftCards) query = query.replace(/(\$\s*\d[\d,.]*)\s+plus\s+(?=\$\s*\d)/gi, "$1 or ");
  const orSeparator = /(?<!\bat)\s+or\s+(?=(?:under|below|over|above)\s+\$)|\s+or\s+(?!(?:equal\s+to|less|lower|more|below|above|under|higher|up|cheaper)\b|(?:larger|bigger)\b(?!\s+than\b))/i;
  const hasOr = orSeparator.test(query);
  if (!hasOr && (!giftCards || !/\s+(?:and|&)\s+/i.test(query) || catalogMerchant(query, products))) return null;
  const clauses = query.split(hasOr ? new RegExp(/\s*,(?!\d)\s*(?:or\s+)?/.source + "|" + orSeparator.source, "i") : /\s+(?:and|&)\s+/i);
  const parts = clauses.map(clause => {
    const parsed = searchDenominations(clause.trim(), products);
    const retailerClause = parsed.text.replace(/^(?:gift\s+card\s+)?(?:from\s+)?either\s+/i, "");
    return { ...parsed, merchant: parsed.merchant ?? catalogMerchant(retailerClause, products) };
  });
  if (hasOr && /\bexact(?:ly)?\b/i.test(clauses[0]) && parts[0].values.size === 1 && parts[0].merchant
    && parts.slice(1).every(part => part.merchant && !part.values.size && !part.budget)) {
    return parts.map(part => ({ ...part, text: giftCards ? "gift card" : "", values: parts[0].values, exactOnly: true }));
  }
  if (hasOr && giftCards && parts[0].text && parts.some(part => part.budget)
    && parts.slice(1).every(part => !part.text && (part.budget || part.values.size))) {
    return parts.map(part => ({ ...part, text: parts[0].text, merchant: parts[0].merchant, exactOnly: true }));
  }
  const last = parts.at(-1);
  const sharedBudget = last?.budget && parts.slice(0, -1).every(part => !part.budget && !part.values.size) ? last.budget : null;
  const sharedScreenType = last && /^\d+ inch (tvs?|televisions?)$/i.exec(normalizeSearch(last.text));
  if (hasOr && sharedScreenType && parts.slice(0, -1).every(part => /^\d+ inch$/i.test(normalizeSearch(part.text)))) {
    return parts.map((part, index) => ({
      ...part, budget: part.budget ?? sharedBudget,
      text: index === parts.length - 1 ? part.text : part.text + " " + sharedScreenType[1],
    }));
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
      ...part, text: index === parts.length - 1 ? part.text : part.text + " " + televisionSuffix[1], budget: part.budget ?? sharedBudget,
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
  if (giftCards && merchants.size && parts.every(part => part.merchant || (sharedMerchant && part.values.size && queryWords(part.text).every(word => word === "gift" || word === "card")))) {
    const sharedExclusions = last?.excludedValues.size && parts.slice(0, -1).every(part => !part.excludedValues.size)
      && /\b(?:except|excluding|not)\s+(?:for\s+)?\$\s*[\d,.]+\s*[.!?]?$/i.test(clauses.at(-1) ?? "")
      ? last.excludedValues : null;
    const scoped = parts.map(part => ({ ...part, text: "gift card", merchant: part.merchant ?? sharedMerchant,
      budget: part.budget ?? sharedBudget, values: part.values.size ? part.values : sharedValues ?? part.values,
      excludedValues: sharedExclusions ?? part.excludedValues, exactOnly: Boolean(denomination.values.size) }));
    if (!denomination.values.size || scoped.every(part => part.values.size)) return scoped;
  }
  if (parts.every(part => queryWords(part.text).length > 0)
    && (!denomination.values.size || parts.every(part => part.values.size && queryWords(part.text).some(word => word !== "gift" && word !== "card"))
      || hasOr && parts.some(part => part.values.size || part.budget))) {
    return hasOr && sharedBudget ? parts.map(part => ({ ...part, budget: part.budget ?? sharedBudget })) : parts;
  }
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
