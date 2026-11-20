import { normalizeSearch } from "./search-text";

const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const wordValues = new Map([...units.map((word, i) => [word, i] as const), ...tens.map((word, i) => [word, 20 + i * 10] as const)]);
const small = `(?:(?:${tens.join("|")})(?:[ -](?:${units.slice(1, 10).join("|")}))?|${units.join("|")})`;
const hundreds = `(?:(?:(?:a|${units.slice(1, 10).join("|")}) )?hundred(?: (?:and )?${small})?|${small})`;
const words = `(?:(?:a|${hundreds}) thousand(?: (?:and )?${hundreds})?|${hundreds})`;
const digits = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const currency = new RegExp(String.raw`(?:\$\s*|\bUSD\s+)(${digits})(?:[ -]+(?:dollars?|bucks?|USD)\b)?|\b(${digits})[ -]*(?:dollars?|bucks?|USD)\b|\b(${words})[ -]+(?:dollars?|bucks?)\b`, "gi");

const entryPricePattern = new RegExp(String.raw`(?:\bwith\s+)?(?:\$\s*|\bUSD\s+)?\b(${digits})(?:\s+(?:dollars?|USD))?(?:\s+per\s+|\s*\/\s*)(?:entry|ticket)\b`, "i");
const excludedValuePattern = new RegExp(String.raw`\s*,?\s+(?:and\s+(?=(?:not|excluding|except)\b))?(?:not|excluding|except(?: for)?)\s+(?:\$\s*|USD\s+)(${digits})(?=\s|,|$)`, "gi");

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

export function catalogMerchant(text: string, products: readonly { retailer: string }[]): string | null {
  const direct = retailerName(text).replace(/\bgift card\b/g, " ").replace(/\s+/g, " ").trim();
  if (!direct) return null;
  const exact = products.find(product => retailerName(product.retailer) === direct);
  if (exact) return normalizeSearch(exact.retailer);
  const name = direct.replace(/^(?:(?:for|from|at|a|an|the)\s+)+/, "");
  if (name === "walmart" && products.some(product => matchesCatalogMerchant(product.retailer, name))) return name;
  const match = products.find(product => retailerName(product.retailer) === name
    || (name === "apple" && retailerName(product.retailer) === "apple gift card"));
  return match ? normalizeSearch(match.retailer) : null;
}

export function matchesCatalogMerchant(retailer: string, merchant: string) {
  const name = normalizeSearch(retailer);
  return name === merchant || (merchant === "walmart" && name.startsWith("walmart "));
}

/** Currency is an exact prize value. Bare numbers beside model names remain product keywords. */
function extractValues(query: string, products: readonly { retailer: string }[]) {
  const values = new Set<number>();
  if (query.length > 512) return { text: query, values };
  const joinedValues = /\bgift card\b/i.test(query)
    ? new RegExp(String.raw`(?:^|\s)(\$?\s*${digits}(?:\s+(?:or|and)\s+\$?\s*${digits})+)(?=\s|$)`, "i").exec(query)
    : null;
  if (joinedValues && joinedValues[1].includes("$")) {
    for (const value of joinedValues[1].split(/\s+(?:or|and)\s+/i)) values.add(Number(value.replace(/[$,\s]/g, "")));
    return { text: query.replace(joinedValues[0], " ").trim(), values };
  }
  const spokenList = /\bgift card\b/i.test(query)
    ? new RegExp(String.raw`\b(${words}(?:\s*,\s*(?:and\s+|or\s+)?${words})*(?:\s+(?:and|or)\s+${words})+)\s+(?:dollars?|bucks?)\b`, "i").exec(query)
    : null;
  if (spokenList) {
    for (const amount of spokenList[1].split(/\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+/i)) values.add(spokenValue(amount));
    return { text: query.replace(spokenList[0], " ").trim(), values };
  }
  const remainder = query.replace(currency, (_match, prefix: string, suffix: string, spoken: string) => {
    values.add(spoken ? spokenValue(spoken) : Number((prefix ?? suffix).replaceAll(",", "")));
    return " ";
  });
  if (values.size) return { text: remainder.replace(/\bfor\s+like\b/gi, " ").trim(), values };
  const alternatives = /\b(?:gift card|gc)\b/i.test(query)
    ? new RegExp(String.raw`\b${digits}(?:\s+(?:or|and)\s+${digits})+\b`, "i").exec(query)
    : null;
  if (alternatives) {
    const text = query.replace(alternatives[0], " ").trim();
    const qualifier = normalizeSearch(text).replace(/\b(?:gift card|gc|for|from|at)\b/g, " ").trim().replace(/\s+/g, " ");
    if (!qualifier || products.some(product => retailerName(product.retailer) === retailerName(qualifier))) {
      for (const amount of alternatives[0].split(/\s+(?:or|and)\s+/i)) values.add(Number(amount.replaceAll(",", "")));
      return { text, values };
    }
  }
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
  // Interpret a k suffix only inside an explicit budget phrase.
  const shorthand = /^\$?\s*(\d+(?:\.\d+)?)\s*k(?=\s|$)/i.exec(value);
  if (shorthand) {
    const amount = Number(shorthand[1]) * 1000;
    return Number.isFinite(amount) ? { amount, text: value.slice(shorthand[0].length).trim() } : null;
  }
  const match = initialCurrency.exec(value) ?? initialDigits.exec(value);
  if (!match) return null;
  const amount = match[3] ? spokenValue(match[3]) : Number((match[1] ?? match[2]).replaceAll(",", ""));
  return Number.isFinite(amount) ? { amount, text: value.slice(match[0].length).trim() } : null;
}

const inclusiveLowerPhrases = "greater than or equal to|more than or equal to|at least|no less than|not less than|no lower than|not below";
const inclusiveUpperPhrases = "less than or equal to|no more than|no higher than|not over|not above|not more than|up to|at most|max(?:imum)?";
const lowerBound = inclusiveLowerPhrases + "|above|over|more than|greater than";
const upperBound = inclusiveUpperPhrases + "|under|below|less than";
const boundPattern = new RegExp(`\\b(${upperBound}|${lowerBound})\\s+`, "i");
const upperBoundPattern = new RegExp(`^(?:${upperBound})$`, "i");
const inclusiveLower = new RegExp(`^(?:${inclusiveLowerPhrases})$`, "i");
const inclusiveUpper = new RegExp(`^(?:${inclusiveUpperPhrases})$`, "i");

type PrizeBudget = { minimum?: number; exclusiveMinimum?: boolean; maximum: number | null; inclusive: boolean };

function addBound(budget: PrizeBudget, amount: number, upper: boolean, inclusive: boolean) {
  if (upper) {
    if (budget.maximum === null || amount < budget.maximum) {
      budget.maximum = amount;
      budget.inclusive = inclusive;
    } else if (amount === budget.maximum) budget.inclusive &&= inclusive;
  } else if (budget.minimum === undefined || amount > budget.minimum) {
    budget.minimum = amount;
    budget.exclusiveMinimum = !inclusive;
  } else if (amount === budget.minimum) budget.exclusiveMinimum ||= !inclusive;
}

function searchBudget(normalized: string, products: readonly { retailer: string }[]): { text: string; budget: PrizeBudget } | null {
  const comparison = /^(.*?)\s*(>=|<=|≥|≤|>|<)\s*(.+)$/.exec(normalized);
  const compared = comparison && leadingAmount(comparison[3]);
  if (comparison && compared) {
    const operator = comparison[2];
    const lower = operator.startsWith(">") || operator === "≥";
    const inclusive = operator.endsWith("=") || operator === "≥" || operator === "≤";
    const nextOperator = /^(?:and\s*|,\s*)?(>=|<=|≥|≤|>|<)\s*(.+)$/i.exec(compared.text);
    const nextAmount = nextOperator && /^(?:>|≥)/.test(nextOperator[1]) !== lower ? leadingAmount(nextOperator[2]) : null;
    const nextInclusive = nextOperator ? /[=≥≤]/.test(nextOperator[1]) : true;
    return { text: `${comparison[1]} ${nextAmount?.text ?? compared.text}`.trim(), budget: lower
      ? { minimum: compared.amount, exclusiveMinimum: !inclusive, maximum: nextAmount?.amount ?? null, inclusive: nextAmount ? nextInclusive : true }
      : { minimum: nextAmount?.amount, exclusiveMinimum: nextAmount ? !nextInclusive : undefined, maximum: compared.amount, inclusive } };
  }
  const plusMinimum = new RegExp(String.raw`^(.*?)(\$\s*${digits})\s*\+(?=\s|$)(.*)$`, "i").exec(normalized);
  if (plusMinimum) {
    const minimum = leadingAmount(plusMinimum[2])?.amount;
    if (minimum !== undefined) return {
      text: (plusMinimum[1] + " " + plusMinimum[3]).trim(),
      budget: { minimum, maximum: null, inclusive: true },
    };
  }
  const range = /^(.*?)(?:\bpriced\s+)?\b(between|from)\s+(.+)$/i.exec(normalized);
  const first = range && leadingAmount(range[3]);
  const connector = range?.[2].toLowerCase() === "from" ? /^(?:to|through|thru)\s+/i : /^and\s+/i;
  const last = first && connector.test(first.text) ? leadingAmount(first.text.replace(connector, "")) : null;
  if (range && first && last) return {
    text: `${range[1]} ${last.text.replace(/^inclusive\b/i, "")}`.trim(),
    budget: { minimum: Math.min(first.amount, last.amount), maximum: Math.max(first.amount, last.amount), inclusive: true },
  };
  const bareRange = /^(.*?)(?:\bbetween\s+)?(\$?\d[\d,.]*)\s*(?:to|through|thru|-)\s*(\$?\d[\d,.]*)(?=\s|$)(.*)$/i.exec(normalized);
  if (bareRange && (bareRange[2].startsWith("$") || bareRange[3].startsWith("$") || /\bgift card\b/i.test(normalized))) {
    const low = leadingAmount(bareRange[2]);
    const high = leadingAmount(bareRange[3]);
    if (low && high) return {
      text: `${bareRange[1]} ${bareRange[4].replace(/^\s*(?:(?:dollars?|bucks?|USD)\b\s*)?(?:inclusive\b\s*)?/i, "")}`.trim(),
      budget: { minimum: Math.min(low.amount, high.amount), maximum: Math.max(low.amount, high.amount), inclusive: true },
    };
  }
  const bound = boundPattern.exec(normalized);
  const firstBound = bound && leadingAmount(normalized.slice(bound.index + bound[0].length).replace(/[.!?]$/, ""));
  if (bound && firstBound) {
    const budget: PrizeBudget = { maximum: null, inclusive: true };
    const apply = (phrase: string, amount: number) => {
      const upper = upperBoundPattern.test(phrase);
      addBound(budget, amount, upper, (upper ? inclusiveUpper : inclusiveLower).test(phrase));
    };
    apply(bound[1], firstBound.amount);
    let remaining = firstBound.text;
    while (remaining) {
      const joined = /^(?:,\s*(?:(?:and|but)\s+)?|(?:and|but)\s+)/i.exec(remaining);
      if (!joined) break;
      const next = remaining.slice(joined[0].length);
      const phrase = boundPattern.exec(next);
      const amount = phrase?.index === 0 && leadingAmount(next.slice(phrase[0].length));
      if (!phrase || !amount) break;
      apply(phrase[1], amount.amount);
      remaining = amount.text;
    }
    return { text: `${normalized.slice(0, bound.index)} ${remaining}`.trim(), budget };
  }
  const minimumPhrase = /^(.*?)\s+(?:and (?:up|over|above|higher)|or (?:more|higher|above))(?=\s|$)(.*)$/i.exec(normalized);
  const minimumValue = minimumPhrase ? extractValues(minimumPhrase[1], products) : null;
  if (minimumValue?.values.size === 1) {
    const minimum = [...minimumValue.values][0];
    if (Number.isFinite(minimum)) return { text: `${minimumValue.text} ${minimumPhrase?.[2] ?? ""}`.trim(), budget: { minimum, maximum: null, inclusive: true } };
  }
  const leadingCeiling = new RegExp(String.raw`^((?:${currency.source}))\s+(?:or|and)\s+(?:less|under|below)\s+(.+)$`, "i").exec(normalized);
  if (leadingCeiling) {
    const amount = leadingAmount(leadingCeiling[1]);
    if (amount) return { text: leadingCeiling.at(-1)!, budget: { maximum: amount.amount, inclusive: true } };
  }
  const trailing = /^(.*?)(?:(?:\b(?:and|or)|&)\s+(?:under|below|less)|\s+(?:max|maximum))\s*$/i.exec(normalized);
  const maximum = trailing && extractValues(trailing[1], products);
  if (maximum?.values.size !== 1) return null;
  const amount = [...maximum.values][0];
  return Number.isFinite(amount) ? { text: maximum.text, budget: { maximum: amount, inclusive: true } } : null;
}

export function searchDenominations(query: string, products: readonly { retailer: string }[]) {
  let normalized = query.trim().replace(/[,.!?]+$/, "").replace(/[\u2010-\u2015]/g, "-").replace(/\bgift cards\b/gi, "gift card");
  const entryMatch = entryPricePattern.exec(normalized);
  const entryPrice = entryMatch ? Number(entryMatch[1].replaceAll(",", "")) : null;
  if (entryMatch) normalized = normalized.replace(entryMatch[0], " ").trim().replace(/\s+/g, " ");
  const excludedValues = new Set<number>();
  normalized = normalized.replace(excludedValuePattern, (_match, amount: string) => {
    excludedValues.add(Number(amount.replaceAll(",", "")));
    return " ";
  }).trim().replace(/\s+/g, " ");
  if (normalized.length <= 512 && /\bgc\b/i.test(normalized)) {
    const expanded = normalized.replace(/\bgc\b/gi, "gift card");
    const amountText = searchBudget(expanded, products)?.text ?? extractValues(expanded, products).text;
    const retailer = retailerName(normalizeSearch(amountText).replace(/\bgift card\b/g, "").trim());
    if (products.some(product => retailerName(product.retailer) === retailer)) normalized = expanded;
  }
  const exactPhrase = normalized.replace(/\b(?:only|exactly)\b[.!?]?/gi, " ").trim();
  const strippedOnly = /\b(?:only|exactly)\b/i.test(normalized);
  const range = normalized.length <= 512 ? searchBudget((strippedOnly ? exactPhrase : normalized).replace(/\s*,?\s+please$/i, ""), products) : null;
  const budget = range?.budget ?? null;
  const exact = strippedOnly ? extractValues(exactPhrase, products) : null;
  const exactOnly = !budget && (Boolean(exact?.values.size) || excludedValues.size > 0);
  const { text, values } = range
    ? { text: range.text, values: new Set<number>() }
    : exact?.values.size && exactOnly ? exact : extractValues(/\bgift card\b/i.test(normalized) || (strippedOnly && catalogMerchant(exactPhrase, products)) ? exactPhrase : normalized, products);
  const merchant = values.size || budget || strippedOnly ? catalogMerchant(text, products) : null;
  const keywords = merchant ? merchant + (/\bgift card\b/.test(normalizeSearch(text)) ? " gift card" : "") : text;
  const conflictingBudget = Boolean(budget?.minimum !== undefined && budget.maximum !== null
    && (budget.minimum > budget.maximum || (budget.minimum === budget.maximum && (budget.exclusiveMinimum || !budget.inclusive))));
  return { text: keywords, values, budget, exactOnly, conflictingBudget, entryPrice, excludedValues, merchant: merchant ? normalizeSearch(merchant) : null };
}
