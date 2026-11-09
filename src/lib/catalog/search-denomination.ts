import { normalizeSearch } from "./search-text";

const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const wordValues = new Map([...units.map((word, i) => [word, i] as const), ...tens.map((word, i) => [word, 20 + i * 10] as const)]);
const small = `(?:(?:${tens.join("|")})(?:[ -](?:${units.slice(1, 10).join("|")}))?|${units.join("|")})`;
const hundreds = `(?:(?:(?:a|${units.slice(1, 10).join("|")}) )?hundred(?: (?:and )?${small})?|${small})`;
const words = `(?:(?:a|${hundreds}) thousand(?: (?:and )?${hundreds})?|${hundreds})`;
const digits = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const currency = new RegExp(String.raw`(?:\$\s*|\bUSD\s+)(${digits})(?:[ -]+(?:dollars?|USD)\b)?|\b(${digits})[ -]*(?:dollars?|USD)\b|\b(${words})[ -]+dollars?\b`, "gi");

function spokenValue(amount: string) {
  let thousands = 0, group = 0;
  for (const word of amount.toLowerCase().split(/[ -]+/)) {
    if (word === "hundred") group = (group || 1) * 100;
    else if (word === "thousand") { thousands = (group || 1) * 1000; group = 0; }
    else group += word === "a" ? 1 : wordValues.get(word) ?? 0;
  }
  return thousands + group;
}

/** Currency is an exact prize value. Bare numbers beside model names remain product keywords. */
function extractValues(query: string, products: readonly { retailer: string }[]) {
  const values = new Set<number>();
  if (query.length > 512) return { text: query, values };
  const remainder = query.replace(currency, (_match, prefix: string, suffix: string, spoken: string) => {
    values.add(spoken ? spokenValue(spoken) : Number((prefix ?? suffix).replaceAll(",", "")));
    return " ";
  });
  if (values.size) return { text: remainder.replace(/\bfor\s+like\b/gi, " ").trim(), values };
  const bare = query.match(new RegExp(`(?:^|\\s)(${digits})(?=\\s|$)`));
  if (bare) {
    const text = query.replace(bare[0], " ").trim();
    const qualifier = normalizeSearch(text).replace(/\b(?:gift card|for)\b/g, "").trim();
    if (!qualifier || products.some(p => normalizeSearch(p.retailer) === qualifier)) {
      values.add(Number(bare[1].replaceAll(",", "")));
      return { text, values };
    }
  }
  return { text: query, values };
}

export function searchDenominations(query: string, products: readonly { retailer: string }[]) {
  const { text, values } = extractValues(query, products);
  const merchantWords = normalizeSearch(text).replace(/\b(?:gift card|for|from|at|a|an|the)\b/g, " ").replace(/\s+/g, " ").trim();
  const merchant = values.size && merchantWords
    ? products.find(product => normalizeSearch(product.retailer).replace(/^the /, "") === merchantWords)?.retailer
    : undefined;
  const keywords = merchant ? merchant + (/\bgift card\b/.test(normalizeSearch(text)) ? " gift card" : "") : text;
  return { text: keywords, values, merchant: merchant ? normalizeSearch(merchant) : null };
}
