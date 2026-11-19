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

const initialCurrency = new RegExp(`^(?:${currency.source})`, "i");
const initialDigits = new RegExp(`^(${digits})(?=\\s|$)`, "i");

function spokenValue(amount: string) {
  let thousands = 0, group = 0;
  for (const word of amount.toLowerCase().split(/[ -]+/)) {
    if (word === "hundred") group = (group || 1) * 100;
    else if (word === "thousand") { thousands = (group || 1) * 1000; group = 0; }
    else group += word === "a" ? 1 : wordValues.get(word) ?? 0;
  }
  return thousands + group;
}

function retailerName(value: string) {
  return normalizeSearch(value).replace(/^the /, "");
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
    if (!qualifier || products.some(p => retailerName(p.retailer) === retailerName(qualifier))) {
      values.add(Number(bare[1].replaceAll(",", "")));
      return { text, values };
    }
  }
  return { text: query, values };
}

function leadingAmount(text: string) {
  const value = text.trim();
  const match = initialCurrency.exec(value) ?? initialDigits.exec(value);
  if (!match) return null;
  const amount = match[3] ? spokenValue(match[3]) : Number((match[1] ?? match[2]).replaceAll(",", ""));
  return Number.isFinite(amount) ? { amount, text: value.slice(match[0].length).trim() } : null;
}

type PrizeBudget = { minimum?: number; exclusiveMinimum?: boolean; maximum: number | null; inclusive: boolean };

function searchBudget(normalized: string, products: readonly { retailer: string }[]): { text: string; budget: PrizeBudget } | null {
  const range = /^(.*?)(?:\bpriced\s+)?\b(between|from)\s+(.+)$/i.exec(normalized);
  const first = range && leadingAmount(range[3]);
  const connector = range?.[2].toLowerCase() === "from" ? /^to\s+/i : /^and\s+/i;
  const last = first && connector.test(first.text) ? leadingAmount(first.text.replace(connector, "")) : null;
  if (range && first && last) return {
    text: `${range[1]} ${last.text}`.trim(),
    budget: { minimum: Math.min(first.amount, last.amount), maximum: Math.max(first.amount, last.amount), inclusive: true },
  };
  const minimumPhrase = /^(.*?)\s+(?:and (?:up|over|above)|or more)\s*$/i.exec(normalized);
  const minimumValue = minimumPhrase ? extractValues(minimumPhrase[1], products) : null;
  if (minimumValue?.values.size === 1) {
    const minimum = [...minimumValue.values][0];
    if (Number.isFinite(minimum)) return { text: minimumValue.text, budget: { minimum, maximum: null, inclusive: true } };
  }
  const lower = /^(.*?)\b(above|over|more than|greater than|at least)\s+(.+)$/i.exec(normalized);
  const lowerAmount = lower && leadingAmount(lower[3]);
  if (lower && lowerAmount) return {
    text: `${lower[1]} ${lowerAmount.text}`.trim(),
    budget: { minimum: lowerAmount.amount, exclusiveMinimum: lower[2].toLowerCase() !== "at least", maximum: null, inclusive: true },
  };
  const leading = /^(.*?)\b(under|below|less than|up to|at most)\s+(.+)$/i.exec(normalized);
  const trailing = /^(.*)\b(?:and|or)\s+(under|below|less)\s*$/i.exec(normalized);
  const boundText = leading?.[3].trim().replace(/[.!?]$/, "");
  const bareBound = boundText?.match(new RegExp(`^(${digits})(?=\\s|$)`, "i"));
  const parsedBound = bareBound && boundText ? { text: boundText.slice(bareBound[0].length).trim(), values: new Set([Number(bareBound[1].replaceAll(",", ""))]) } : boundText ? extractValues(boundText, []) : trailing ? extractValues(trailing[1], products) : null;
  if (parsedBound?.values.size !== 1 || (boundText && parsedBound.text && !bareBound && !initialCurrency.test(boundText))) return null;
  const maximum = [...parsedBound.values][0];
  if (!Number.isFinite(maximum)) return null;
  return {
    text: (leading ? `${leading[1]} ${parsedBound.text}` : parsedBound.text).trim(),
    budget: { maximum, inclusive: !leading || /^(?:up to|at most)$/i.test(leading[2]) },
  };
}

export function searchDenominations(query: string, products: readonly { retailer: string }[]) {
  const normalized = query.replace(/[\u2010-\u2015]/g, "-").replace(/\bgift cards\b/gi, "gift card");
  const range = normalized.length <= 512 ? searchBudget(normalized, products) : null;
  const budget = range?.budget ?? null;
  const exactPhrase = normalized.replace(/\s+only[.!?]?\s*$/i, "");
  const exact = exactPhrase !== normalized ? extractValues(exactPhrase, products) : null;
  const exactOnly = !budget && Boolean(exact?.values.size);
  const { text, values } = range
    ? { text: range.text, values: new Set<number>() }
    : exactOnly && exact ? exact : extractValues(normalized, products);
  const merchantWords = normalizeSearch(text).replace(/\b(?:gift card|for|from|at|a|an|the)\b/g, " ").replace(/\s+/g, " ").trim();
  const merchant = (values.size || budget) && merchantWords
    ? products.find(product => retailerName(product.retailer) === merchantWords)?.retailer
    : undefined;
  const keywords = merchant ? merchant + (/\bgift card\b/.test(normalizeSearch(text)) ? " gift card" : "") : text;
  return { text: keywords, values, budget, exactOnly, merchant: merchant ? normalizeSearch(merchant) : null };
}
