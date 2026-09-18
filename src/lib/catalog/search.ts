import type { DemoProduct } from "./demo-products";

const ignoredWords = new Set(["a", "an", "and", "for", "of", "or", "the", "to"]);

const relatedTerms = [
  ["tv", "tvs", "television", "televisions"],
  ["shoe", "shoes", "sneaker", "sneakers", "footwear"],
  ["gas", "gasoline", "fuel", "petrol"],
  ["coffee", "cafe", "starbucks", "dunkin"],
  ["grocery", "groceries", "food"],
  ["game", "games", "gaming", "console", "playstation", "ps5", "nintendo"],
  ["baby", "babies", "diaper", "diapers", "formula", "pampers", "enfamil"],
  ["vacuum", "cleaner", "cleaning", "dyson"],
  ["electronic", "electronics", "tech", "technology"],
  ["gift", "gifts", "card", "cards", "reward", "rewards"],
] as const;

const relatedTermLookup = new Map<string, readonly string[]>();
for (const group of relatedTerms) {
  for (const term of group) relatedTermLookup.set(term, group);
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function queryTokens(query: string) {
  return normalize(query)
    .split(" ")
    .filter(token => token && !ignoredWords.has(token));
}

function searchableProductText(product: DemoProduct) {
  return normalize([
    product.slug,
    product.title,
    product.brand,
    product.retailer,
    product.category,
    product.summary,
    ...product.highlights,
    ...product.specifications.flatMap(item => [item.label, item.value]),
    ...product.included,
  ].join(" "));
}

function optionsForToken(token: string) {
  return relatedTermLookup.get(token) ?? [token];
}

function scoreProduct(product: DemoProduct, query: string) {
  const normalizedQuery = normalize(query);
  const tokens = queryTokens(query);
  if (!normalizedQuery || tokens.length === 0) return 0;

  const document = searchableProductText(product);
  const title = normalize(product.title);
  const brand = normalize(product.brand);
  const retailer = normalize(product.retailer);
  const category = normalize(product.category);

  let score = 0;
  for (const token of tokens) {
    const options = optionsForToken(token);
    const matched = options.filter(option => document.includes(option));
    if (matched.length === 0) return 0;
    score += 10 + matched.length;
    if (options.some(option => title.includes(option))) score += 18;
    if (options.some(option => brand.includes(option) || retailer.includes(option))) score += 14;
    if (options.some(option => category.includes(option))) score += 8;
  }

  if (title.includes(normalizedQuery)) score += 70;
  if (brand === normalizedQuery || retailer === normalizedQuery) score += 90;
  if (category === normalizedQuery) score += 45;
  return score;
}

export function searchCatalog(products: readonly DemoProduct[], query: string) {
  return products
    .map(product => ({ product, score: scoreProduct(product, query) }))
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.product.title.localeCompare(right.product.title))
    .map(result => result.product);
}
