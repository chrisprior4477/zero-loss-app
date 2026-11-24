import { normalizeSearch } from "./search-text";

const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tens = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const wordValues = new Map([...units.map((word, i) => [word, i] as const), ...tens.map((word, i) => [word, 20 + i * 10] as const)]);
export const smallNumberWords = `(?:(?:${tens.join("|")})(?:[ -](?:${units.slice(1, 10).join("|")}))?|${units.join("|")})`;
const hundreds = `(?:(?:(?:a|${units.slice(1, 10).join("|")}) )?hundred(?: (?:and )?${smallNumberWords})?|${smallNumberWords})`;
const words = `(?:(?:a|${hundreds}) thousand(?: (?:and )?${hundreds})?|${hundreds})`;
const digits = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const currency = new RegExp(String.raw`(?:\$\s*|\bUSD\s*)(${digits})(?:[ -]+(?:dollars?|bucks?|USD)\b)?|\b(${digits})[ -]*(?:dollars?|bucks?|USD)\b|\b(${words})[ -]+(?:dollars?|bucks?)\b`, "gi");

const entryAmount = String.raw`(?:${currency.source})|(?:\$\s*|\bUSD\s*)?\b${digits}`;
const entryPricePattern = new RegExp([
  String.raw`\bentr(?:y|ies)\s+with\s+(?:an?\s+)?(?<standaloneFee>${entryAmount})\s+fees?\b`,
  String.raw`\b(?:with\s+|for\s+)?(?:an?\s+)?(?:entry\s+(?:price|fee|cost)s?|tickets?\s+cost)\s*:?\s*(?:of\s+)?(?<labeledCeiling>(?:up to|at most|no more than|below|under|less than)\s+)?(?<labeled>${entryAmount})`,
  String.raw`\b(?:with|paying)\s+(?<entryFees>${entryAmount})\s+(?:entry fees?|(?:per|each)\s+entry)\b`,
  String.raw`(?<!\S)(?:with\s+)?(?:an?\s+)?(?<single>${entryAmount})\s+(?:entry|ticket)\s+(?:price|fee|cost)\b|\bwith\s+(?:an?\s+)?(?<singleEntry>${entryAmount})\s+(?:entr(?:y|ies)|tickets?)\b`,
  String.raw`(?:\b(?:costing|costs?|for)\s+|(?<!\w))(?<toEnter>${entryAmount})\s+to enter\b`,
  String.raw`\b(?<spokenEntry>${words})[ -]+(?:dollars?|bucks?)\s+entries\s+for\b`,
  String.raw`\b(?:with\s+)?entr(?:y|ies)\s+at\s+(?<each>${entryAmount})\s+each\b`,
  String.raw`(?:(?<ceiling>\b(?:up to|at most|no more than|less than|under|below)\s+)|\b(?:that\s+costs?|with|for|at)\s+)?(?<per>${entryAmount})(?<trailingCeiling>\s+or\s+(?:less|lower|under))?(?:\s+(?:per|an?|each)\s+|\s*\/\s*|\s+)(?:entry|ticket)\b`,
  String.raw`(?<ticketCost>(?:${currency.source}))\s+tickets?\b`,
].join("|"), "i");
const excludedValue = String.raw`(?:${currency.source})(?:\s+(?:ones?|denominations?)\b)?`;
const valueExclusion = String.raw`(?:not|no|without|excluding|except(?: for)?|other than)`;
const excludedValuePattern = new RegExp(String.raw`\s*,?\s+(?:(?:and|but)\s+(?=${valueExclusion}\b))?${valueExclusion}\s+(?:(?:a|the|both)\s+)*(${excludedValue}(?:(?:\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+)${excludedValue})*)(?=\s|,|$)`, "gi");
const spokenExcludedValues = new RegExp(String.raw`\b(${valueExclusion})\s+(${words}(?:\s+(?:and|or)\s+${words})+)\s+(?:dollars?|bucks?)\b`, "gi");

const initialCurrency = new RegExp(`^(?:${currency.source})`, "i");
const initialDigits = new RegExp(`^(${digits})(?=\\s|$)`, "i");
const initialWords = new RegExp(`^(${words})(?=\\s|$)`, "i");

export function spokenValue(amount: string) {
  let thousands = 0, group = 0;
  for (const word of amount.toLowerCase().split(/[ -]+/)) {
    if (word === "hundred") group = (group || 1) * 100;
    else if (word === "thousand") { thousands = (group || 1) * 1000; group = 0; }
    else group += word === "a" ? 1 : wordValues.get(word) ?? 0;
  }
  return thousands + group;
}

function retailerName(value: string) {
  return normalizeSearch(value).replace(/^the /, "")
    .replace(/\bwal mart\b/g, "walmart").replace(/\bdoor dash\b/g, "doordash").replace(/\bx box\b/g, "xbox");
}

export function catalogMerchant(text: string, products: readonly { retailer: string }[]): string | null {
  const direct = retailerName(text).replace(/\bgift card\b/g, " ").replace(/\s+/g, " ").trim();
  if (!direct) return null;
  const exact = products.find(product => retailerName(product.retailer) === direct);
  if (exact) return normalizeSearch(exact.retailer);
  const name = direct.replace(/^(?:(?:for|from|at|of|sold by|a|an|the)\s+)+/, "").replace(/\s+sold by\s+/, " ").replace(/\s+store$/, "");
  if (name === "walmart" && products.some(product => matchesCatalogMerchant(product.retailer, name))) return name;
  const match = products.find(product => retailerName(product.retailer) === name
    || (name === "apple" && retailerName(product.retailer) === "apple gift card")
    || (name === "officemax" && retailerName(product.retailer) === "office depot officemax"));
  return match ? normalizeSearch(match.retailer) : null;
}

export function matchesCatalogMerchant(retailer: string, merchant: string) {
  const name = retailerName(retailer);
  const expected = retailerName(merchant);
  return name === expected || (expected === "walmart" && name.startsWith("walmart "));
}

/** Currency is an exact prize value. Bare numbers beside model names remain product keywords. */
function extractValues(query: string, products: readonly { retailer: string }[]) {
  const values = new Set<number>();
  if (query.length > 512) return { text: query, values };
  const listSeparator = /\s*,\s+(?:(?:and|or)\s+)?|\s+(?:or|and)\s+/i;
  const joinedValues = /\bgift card\b/i.test(query)
    ? new RegExp(String.raw`(?:^|\s)(\$?\s*${digits}(?:(?:${listSeparator.source})\$?\s*${digits})+)(?=\s|$)`, "i").exec(query)
    : null;
  if (joinedValues && !/^\s+(?:dollars?|bucks?|USD)\b/i.test(query.slice(joinedValues.index + joinedValues[0].length))) {
    for (const value of joinedValues[1].split(listSeparator)) values.add(Number(value.replace(/[$,\s]/g, "")));
    return { text: query.replace(joinedValues[0], " ").trim(), values };
  }
  const numericSeparator = /\s*,(?!\d{3}\b)\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+/i;
  const numericList = /\bgift card\b/i.test(query)
    ? new RegExp(String.raw`\b(${digits}(?:(?:${numericSeparator.source})${digits})+)\s+(?:dollars?|bucks?|USD)\b`, "i").exec(query)
    : null;
  if (numericList) {
    for (const value of numericList[1].split(numericSeparator)) values.add(Number(value.replaceAll(",", "")));
    return { text: query.replace(numericList[0], " ").trim(), values };
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
  if (/\bgift card\b/i.test(query)) {
    const spoken = new RegExp("(?:^|\\s)(" + words + ")(?=\\s|$)", "gi");
    for (const match of query.matchAll(spoken)) {
      const text = query.replace(match[0], " ").trim();
      const qualifier = normalizeSearch(text).replace(/\b(?:gift card|for|from|at)\b/g, " ").trim().replace(/\s+/g, " ");
      if (qualifier && products.some(product => retailerName(product.retailer) === retailerName(qualifier))) {
        values.add(spokenValue(match[1]));
        return { text, values };
      }
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
  if (!match) {
    const spoken = initialWords.exec(value);
    return spoken ? { amount: spokenValue(spoken[1]), text: value.slice(spoken[0].length).trim() } : null;
  }
  const amount = match[3] ? spokenValue(match[3]) : Number((match[1] ?? match[2]).replaceAll(",", ""));
  return Number.isFinite(amount) ? { amount, text: value.slice(match[0].length).trim() } : null;
}

const inclusiveLowerPhrases = "greater than or equal to|more than or equal to|at or above|at least|no less than|not less than|no lower than|not below|not under|starting at";
const inclusiveUpperPhrases = "less than or equal to|at or below|no more than|no higher than|no greater than|not exceeding|not over|not above|not more than|up to|at most|with a maximum of|max(?:imum)?";
const lowerBound = inclusiveLowerPhrases + "|above|over|more than|greater than";
const upperBound = inclusiveUpperPhrases + "|under|below|less than|lower than|cheaper than";
const boundPattern = new RegExp(`\\b(?:(?:prize\\s+value|price|priced)\\s*:?\\s+)?(${upperBound}|${lowerBound})\\s+(?:prize value\\s+(?:of\\s+)?)?`, "i");
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
    const budget: PrizeBudget = { maximum: null, inclusive: true };
    const apply = (operator: string, amount: number) =>
      addBound(budget, amount, /^[<≤]/.test(operator), /[=≥≤]/.test(operator));
    apply(comparison[2], compared.amount);
    let remaining = compared.text;
    for (let next = /^(?:(?:and|but)\s+|,\s*)?(>=|<=|≥|≤|>|<)\s*(.+)$/i.exec(remaining); next;
      next = /^(?:(?:and|but)\s+|,\s*)?(>=|<=|≥|≤|>|<)\s*(.+)$/i.exec(remaining)) {
      const bound = leadingAmount(next[2]);
      if (!bound) break;
      apply(next[1], bound.amount);
      remaining = bound.text;
    }
    return { text: `${comparison[1]} ${remaining}`.trim(), budget };
  }
  const plusMinimum = new RegExp(String.raw`^(.*?)((?:${currency.source}))\s*\+(?=\s|$)(.*)$`, "i").exec(normalized);
  if (plusMinimum) {
    const minimum = leadingAmount(plusMinimum[2])?.amount;
    if (minimum !== undefined) return {
      text: (plusMinimum[1] + " " + plusMinimum.at(-1)).trim(),
      budget: { minimum, maximum: null, inclusive: true },
    };
  }
  for (const range of normalized.matchAll(/\b(?:\b(?:priced|costing)\s+)?(between|from)\s+/gi)) {
    const first = leadingAmount(normalized.slice(range.index + range[0].length));
    if (!first) continue;
    const from = range[1].toLowerCase() === "from";
    const connector = from ? /^(?:up to|to|through|thru)\s+/i : /^(?:and|&)\s+/i;
    if (!connector.test(first.text)) continue;
    const upperText = first.text.replace(connector, "");
    const exclusive = from && /^(?:under|below|less than)\s+/i.test(upperText);
    const last = leadingAmount(exclusive ? upperText.replace(/^(?:under|below|less than)\s+/i, "") : upperText);
    if (last) return {
      text: `${normalized.slice(0, range.index)} ${last.text.replace(/^(?:inclusive|total)\b/i, "")}`.trim(),
      budget: { minimum: exclusive ? first.amount : Math.min(first.amount, last.amount), maximum: exclusive ? last.amount : Math.max(first.amount, last.amount), inclusive: !exclusive },
    };
  }
  const bareRange = /^(.*?)(?:\b(?:between|from)\s+)?(\$?\d[\d,.]*)\s*(?:to|through|thru|-)\s*(\$?\d[\d,.]*)(?=\s|$)(.*)$/i.exec(normalized);
  if (bareRange && (bareRange[2].startsWith("$") || bareRange[3].startsWith("$") || /\bgift card\b/i.test(normalized))) {
    const low = leadingAmount(bareRange[2]);
    const high = leadingAmount(bareRange[3]);
    if (low && high) return {
      text: `${bareRange[1]} ${bareRange[4].replace(/^\s*(?:(?:dollars?|bucks?|USD)\b\s*)?(?:(?:inclusive|total)\b\s*)?/i, "")}`.trim(),
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
      const next = joined ? remaining.slice(joined[0].length) : remaining;
      const phrase = boundPattern.exec(next);
      const amount = phrase?.index === 0 && leadingAmount(next.slice(phrase[0].length));
      if (!phrase || !amount) break;
      apply(phrase[1], amount.amount);
      remaining = amount.text;
    }
    return { text: `${normalized.slice(0, bound.index)} ${remaining}`.trim(), budget };
  }
  const minimumPhrase = /^(.*?)\s+(?:(?:and|or) (?:up|over|above|higher|more)|min(?:imum)?(?=\s*$))(?=\s|$)(.*)$/i.exec(normalized);
  const minimumValue = minimumPhrase ? extractValues(minimumPhrase[1], products) : null;
  if (minimumValue?.values.size === 1) {
    const minimum = [...minimumValue.values][0];
    if (Number.isFinite(minimum)) return { text: `${minimumValue.text} ${minimumPhrase?.[2] ?? ""}`.trim(), budget: { minimum, maximum: null, inclusive: true } };
  }
  const leadingCeiling = new RegExp(String.raw`^((?:${currency.source}))\s+(?:or|and)\s+(?:less|lower|under|below|cheaper)\s+(.+)$`, "i").exec(normalized);
  if (leadingCeiling) {
    const amount = leadingAmount(leadingCeiling[1]);
    if (amount) return { text: leadingCeiling.at(-1)!, budget: { maximum: amount.amount, inclusive: true } };
  }
  const trailing = /^(.*?)(?:(?:\b(?:and|or)|&)\s+(?:under|below|less|lower|cheaper)|\s+(?:max|maximum))\s*$/i.exec(normalized);
  const maximum = trailing && extractValues(trailing[1], products);
  if (maximum?.values.size !== 1) return null;
  const amount = [...maximum.values][0];
  return Number.isFinite(amount) ? { text: maximum.text, budget: { maximum: amount, inclusive: true } } : null;
}

const ticketCount = String.raw`(?:\d+|${words})`;
const ticketNouns = String.raw`(?:tickets?|entr(?:y|ies)|spots?|slots?|spaces?|seats?)`;
const ticketAvailability = String.raw`(?:left|remaining|(?:still\s+)?(?:available|open)|(?:before|until) (?:it is )?full)`;
const ticketUnits = String.raw`\s+(?:more\s+)?${ticketNouns}\s+${ticketAvailability}(?=$|[\s,.!?])(?:\s+and(?=\s))?`;
const ticketPrefix = String.raw`(?:^|[\s,]+)(?:and\s+)?(?:(?:with|that\s+(?:have|has))\s+)?(?:only\s+)?`;
const ticketComparison = "fewer than|less than|under|no more than|at most|at least|more than|exactly";
const ticketsBeforeUpperLimit = new RegExp("\\b(at least|more than)\\s+(" + ticketCount + ")" + ticketUnits
  + "\\s+but\\s+(under|fewer than|less than|at most|no more than)\\s+(" + ticketCount + ")(?=\\s*[.!?]?$)", "i");
const remainingTicketsPattern = new RegExp(String.raw`${ticketPrefix}(?:between\s+(${ticketCount})\s+and\s+(${ticketCount})|(${ticketCount})(?:\s+to\s+|\s*[-–—]\s*)(${ticketCount})|(?:(${ticketComparison})\s+)?(${ticketCount}))${ticketUnits}`, "i");
const compoundTicketsPattern = new RegExp(String.raw`${ticketPrefix}(${ticketComparison})\s+(${ticketCount})\s+(?:and|but)\s+(${ticketComparison})\s+(${ticketCount})${ticketUnits}`, "i");
const ticketMaximum = new RegExp(String.raw`\b(${ticketCount})(?:\s+or fewer${ticketUnits}|${ticketUnits}\s+or fewer\b)`, "i");
const remainingBeforeTicket = new RegExp(String.raw`\b(${ticketCount})\s+remaining\s+(${ticketNouns})\b`, "i");
const trailingTicketMaximum = new RegExp(String.raw`\b(${ticketCount})\s+(${ticketNouns})\s+or\s+(?:fewer|less)\s*[.!?]?$`, "i");
const ticketBeforeMaximum = new RegExp(String.raw`\b(${ticketCount})\s+(${ticketNouns})\s+or\s+(?:fewer|less)\s+(${ticketAvailability})\b`, "i");
const ticketChoices = new RegExp(String.raw`${ticketPrefix}(${ticketCount}(?:\s+or\s+${ticketCount})+)${ticketUnits}`, "i");
const repeatedTicketChoice = new RegExp(String.raw`(\b${ticketCount})${ticketUnits}(?=\s+or\s+${ticketCount}${ticketUnits})`, "gi");
const statedTicketMaximum = new RegExp(String.raw`\b(?:a\s+)?maximum of\s+(?=${ticketCount}\s+${ticketNouns}\s+${ticketAvailability}\b)`, "i");
const ticketPlusMinimum = new RegExp(String.raw`\b(\d+)\+\s+(?=${ticketNouns}\s+${ticketAvailability}\b)`, "gi");

function ticketBounds(comparison: string | undefined, count: string) {
  const value = /^\d+$/.test(count) ? Number(count) : spokenValue(count);
  switch (comparison?.toLowerCase()) {
    case "fewer than":
    case "under":
    case "less than": return { minimum: 1, maximum: value - 1 };
    case "at most":
    case "no more than": return { minimum: 1, maximum: value };
    case "at least": return { minimum: Math.max(1, value), maximum: Infinity };
    case "more than": return { minimum: value + 1, maximum: Infinity };
    default: return { minimum: Math.max(1, value), maximum: value };
  }
}

export function remainingTicketFilter(query: string) {
  query = query.replace(new RegExp(String.raw`\b(${ticketCount})\s+openings?\s*[.!?]?$`, "i"), "$1 tickets left")
    .replace(ticketsBeforeUpperLimit, "$1 $2 but $3 $4 tickets left")
    .replace(remainingBeforeTicket, "$1 $2 remaining")
    .replace(ticketBeforeMaximum, "at most $1 $2 $3")
    .replace(trailingTicketMaximum, "at most $1 $2 left")
    .replace(statedTicketMaximum, "at most ")
    .replace(/\bonly with\s+(?=(?:one|1)\s+spot\b)/i, "with ")
    .replace(/\b(with\s+(?:only\s+)?(?:one|1)\s+spot)\s*[.!?]?$/i, "$1 left");
  if (!/\b(?:left|remaining|available|open|before|until)\b/i.test(query)) return null;
  const trailingComparison = new RegExp(String.raw`\b(${ticketNouns})\s+(${ticketAvailability})\s+(${ticketComparison})\s+(${ticketCount})(?=\s|[,.!?]|$)`, "i");
  query = query.replace(trailingComparison, "$3 $4 $1 $2").replace(ticketMaximum, "at most $1 tickets left")
    .replace(ticketPlusMinimum, "at least $1 ")
    .replace(repeatedTicketChoice, "$1");
  const compound = compoundTicketsPattern.exec(query);
  const choices = ticketChoices.exec(query);
  const match = compound ?? choices ?? remainingTicketsPattern.exec(query);
  if (!match) return null;
  const text = `${query.slice(0, match.index)} ${query.slice(match.index + match[0].length)}`.trim().replace(/^[,\s]+|[,.!?]+$/g, "").trim()
    .replace(/^(?:all\s+)?(?:prizes?|products?|offers?)(?=\s|$)/i, "").trim();
  if (compound) {
    const first = ticketBounds(compound[1], compound[2]);
    const second = ticketBounds(compound[3], compound[4]);
    return { text, minimum: Math.max(first.minimum, second.minimum), maximum: Math.min(first.maximum, second.maximum) };
  }
  if (choices) {
    const counts = new Set(choices[1].split(/\s+or\s+/i).map(value => ticketBounds(undefined, value).maximum).filter(count => count > 0));
    return { text, minimum: 1, maximum: Math.max(...counts), counts };
  }
  const [, betweenFrom, betweenTo, rangeFrom, rangeTo, comparison, count] = match;
  if (betweenFrom || rangeFrom) return {
    text, minimum: ticketBounds(undefined, betweenFrom ?? rangeFrom).minimum, maximum: ticketBounds(undefined, betweenTo ?? rangeTo).maximum,
  };
  return { text, ...ticketBounds(comparison, count) };
}

export function searchDenominations(query: string, products: readonly { retailer: string }[]) {
  const foreignCode = "(?:CAD|AUD|NZD|EUR|GBP|JPY|CHF|MXN|INR)";
  const unsupportedCurrency = new RegExp(String.raw`(?:\b${foreignCode}\s*\$?\s*\d|\d[\d.,]*\s*${foreignCode}\b|\b(?:CA|AU|NZ)\s*\$\s*\d|[€£¥]\s*\d)`, "i").test(query);
  let normalized = (remainingTicketFilter(query)?.text ?? query.trim()).replace(/[,.!?]+$/, "").replace(/\bUS\s*(?=\$)/gi, "").replace(/\bUS\s+(?=dollars?\b)/gi, "").replace(/[\u2010-\u2015]/g, "-")
    .replace(/\bthat\s+(?:are|is)\s+(?=(?:no more than|at most|under|below|over|above)\b)/gi, "")
    .replace(/\b(?:that\s+(?:are|is)\s+)?worth\s+(\$\s*\d[\d,.]*)\s+at most$/i, "up to $1")
    .replace(/\bwith\s+(?:a\s+)?(\$\s*\d[\d,.]*)\s+cap$/i, "up to $1")
    .replace(/(\$\s*\d[\d,.]*)\s+face value\s+but\s+(?=\$\s*\d)/i, "$1 ")
    .replace(/\b(?:e[\s-]*)?gift[\s-]*(?:cards?|vouchers?|certificates?)\b|\b(?:(?:grocery|fuel)\s+)?vouchers?\b/gi, "gift card")
    .replace(/\bgift card\s+for\s+grocer(?:y|ies)\b/gi, "grocery gift card")
    .replace(/\b(?:sony\s+)?playstation store cards?\b/gi, "Sony PlayStation gift card")
    .replace(/\b(nintendo)\s+(\$\s*\d+(?:\.\d{1,2})?)\s+e[\s-]*shop balance\b/gi, "$1 $2 gift card")
    .replace(/(\bgift card\b.*?)\s+worth\s+(?=\$\s*\d)/gi, "$1 ")
    .replace(/\bstrictly\s+(?=below|under|less than|above|over|more than)/gi, "")
    .replace(/\beither\s+(?=\$\s*\d)/gi, "")
    .replace(/\bUSD\s*(?=\$)/gi, "")
    .replace(/\bvalued\s+(?=between\b)/gi, "")
    .replace(/(\$\s*\d[\d,.]*)\s+face value\b/gi, "$1")
    .replace(/\bentr(?:y|ies)\s+(up to|at most|no more than|under|below|less than)\s+(\$\s*\d[\d,.]*)\s+each\b/gi, "$1 $2 per ticket")
    .replace(/\b(?:with\s+)?(?:an?\s+)?entry\s+(?:fee|cost|price)\s+(?:of\s+)?(\$\s*\d[\d,.]*)\s+or\s+less\b/gi, "up to $1 per ticket");
  normalized = normalized
    .replace(/\s+that\s+costs?\s+(\$\s*\d[\d.,]*)\s+or less$/i, " up to $1")
    .replace(/\bno cheaper than\b/gi, "at least")
    .replace(/\bup to but not including\b/gi, "under")
    .replace(/\bup to and including\b/gi, "up to")
    .replace(/\bsomewhere\s+(?=between\b)/gi, "")
    .replace(/(\$\s*\d[\d.]*)\s+or less,\s*including\s+\1\b/gi, "up to $1")
    .replace(new RegExp("\\b(" + words + ")\\s+(to|through)\\s+(" + words + ")\\s+(?:dollars?|bucks?)\\b", "gi"),
      (_, low: string, join: string, high: string) => "$" + spokenValue(low) + " " + join + " $" + spokenValue(high));
  if (/\bgift card\b/i.test(normalized)) {
    normalized = normalized.replace(/\b(?:from|for)\s+grocery stores?\b/gi, "grocery")
      .replace(/\bfor\s+(?:auto|automotive)\s+expenses\b/gi, "automotive")
      .replace(/\bsports\s+(?:and|&)\s+fitness\b/gi, "sporting goods");
  }
  if (/\bgift card\b/i.test(normalized)) normalized = normalized.replace(/(\$\s*\d[\d,.]*)\s+plus\s+(?=\$\s*\d)/gi, "$1 or ");
  const isTelevision = /\b(?:tvs?|televisions?)\b/i.test(normalized);
  const dimensions = isTelevision ? /\b(?:(?:from\s+)?(\d+)\s*(?:inch(?:es)?|["″])?\s*(?:to|through|-)|between\s+(\d+)\s*(?:inch(?:es)?|["″])?\s+and)\s*(\d+)\s*(?:inch(?:es)?\b|["″])/i.exec(normalized) : null;
  if (isTelevision) normalized = normalized.replace(/\b(\d+)\s*(inch(?:es)?\b|["″])\s+and\s+up(?=\s+(?:and|but)\b)/i, "at least $1 $2");
  const boundedScreen = isTelevision ? /\b(at least|more than|over|greater than)\s+(\d+)\s*(?:(?:inch(?:es)?\b|["″])\s*)?(?:but|and)\s+(under|below|less than|at most|up to|no more than)\s+(\d+)\s*(?:inch(?:es)?\b|["″])/i.exec(normalized) : null;
  const screenRange = boundedScreen ? { low: Number(boundedScreen[2]), high: Number(boundedScreen[4]),
    exclusiveLow: !/^at least$/i.test(boundedScreen[1]), exclusiveHigh: /^(?:under|below|less than)$/i.test(boundedScreen[3]) }
    : dimensions ? { low: Math.min(Number(dimensions[1] ?? dimensions[2]), Number(dimensions[3])), high: Math.max(Number(dimensions[1] ?? dimensions[2]), Number(dimensions[3])) } : null;
  const boundedDimension = boundedScreen ?? dimensions;
  if (boundedDimension) normalized = normalized.replace(boundedDimension[0], " ").trim().replace(/\s+/g, " ");
  if (isTelevision) normalized = normalized.replace(/^(.*?)\s+(?:with\s+)?(?:an?\s+)?(\d+)\s*[- ]?\s*inch\s+(?:screen|display)\b/i, "$2 inch $1");
  if (isTelevision) normalized = normalized.replace(/\b(?:that\s+(?:are|is)\s+)?(\d+(?:\.\d+)?)\s*(inch(?:es)?\b|["″])\s+(?:or\s+(?:larger|bigger|more)|and\s+up)\b/i, "at least $1 $2");
  const screenComparison = /\b(no (?:larger|bigger|wider) than|wider than|greater than|larger than|bigger than|at least|over|above|under|below|less than)\s+(\d+(?:\.\d+)?)\s*(?:inch(?:es)?\b|["″])/i;
  const screen = /\b(?:tvs?|televisions?)\b/i.test(normalized) ? screenComparison.exec(normalized) : null;
  const screenSize = screen ? { size: Number(screen[2]), upper: /^(?:no |under|below|less than)/i.test(screen[1]), inclusive: /^(?:at least|no )/i.test(screen[1]) } : null;
  if (screen) normalized = normalized.replace(screen[0], " ").replace(/\s+/g, " ").trim();
  const entryMatch = entryPricePattern.exec(normalized);
  const entryAmountText = entryMatch?.groups?.standaloneFee ?? entryMatch?.groups?.labeled ?? entryMatch?.groups?.per ?? entryMatch?.groups?.single ?? entryMatch?.groups?.singleEntry ?? entryMatch?.groups?.each ?? entryMatch?.groups?.toEnter ?? entryMatch?.groups?.entryFees ?? entryMatch?.groups?.ticketCost ?? entryMatch?.groups?.spokenEntry;
  const exclusiveEntryPrice = /^(?:below|under|less than)\b/i.test(entryMatch?.groups?.labeledCeiling ?? entryMatch?.groups?.ceiling ?? "");
  const entryPrice = entryAmountText ? leadingAmount(entryAmountText)?.amount ?? null : null;
  const entryPriceIsMaximum = Boolean(entryMatch?.groups?.labeledCeiling || entryMatch?.groups?.ceiling || entryMatch?.groups?.trailingCeiling);
  if (entryMatch) normalized = normalized.replace(entryMatch[0], " ").trim().replace(/(?:\s+\b(?:and|for|with)|[,;])$/i, "").trim().replace(/\s+/g, " ");
  const excludedValues = new Set<number>();
  if (/\bgift card\b/i.test(normalized)) normalized = normalized.replace(spokenExcludedValues, (_, marker: string, list: string) =>
    marker + " " + list.split(/\s+(?:and|or)\s+/i).map(value => "$" + spokenValue(value)).join(" and "));
  normalized = normalized.replace(excludedValuePattern, (_match, list: string) => {
    for (const [amount] of list.matchAll(currency)) {
      const parsed = leadingAmount(amount);
      if (parsed) excludedValues.add(parsed.amount);
    }
    return " ";
  }).trim().replace(/\s+/g, " ");
  if (normalized.length <= 512 && /\bgc\b/i.test(normalized)) {
    const expanded = normalized.replace(/\bgc\b/gi, "gift card");
    const candidate = expanded.replace(/\b(?:only|exactly)\b/gi, " ");
    const amountText = searchBudget(candidate, products)?.text ?? extractValues(candidate, products).text;
    if (catalogMerchant(amountText, products)) normalized = expanded;
  }
  const hasCurrency = new RegExp(currency.source, "i").test(normalized);
  if (hasCurrency) normalized = normalized.replace(/[\s,]+no lower value\s*$/i, "");
  const exactPhrase = normalized.replace(/\b(?:only|exactly)\b[.!?]?/gi, " ")
    .replace(hasCurrency ? /\bexact\s*$|\bat\s+(?=\$[^a-z]+\s+face value\b)|\bface value\b/gi : /$^/, " ").trim();
  const strippedOnly = /\b(?:only|exactly)\b/i.test(normalized) || hasCurrency && /\b(?:exact\s*$|face value\b)/i.test(normalized);
  const range = normalized.length <= 512 ? searchBudget((strippedOnly ? exactPhrase : normalized).replace(/(?:\s*,\s*|\s+)(?:please|thanks|thank you)$/i, ""), products) : null;
  const budget = range?.budget ?? null;
  const exact = strippedOnly ? extractValues(exactPhrase, products) : null;
  const rangeValues = range && /\bgift card\b/i.test(range.text) && new RegExp(currency.source, "i").test(range.text)
    ? extractValues(range.text, products) : null;
  const exactOnly = Boolean(rangeValues?.values.size) || !budget && (Boolean(exact?.values.size) || excludedValues.size > 0);
  const { text: amountText, values } = range
    ? rangeValues ?? { text: range.text, values: new Set<number>() }
    : exact?.values.size && exactOnly ? exact : extractValues(exactPhrase, products);
  const decimalDenomination = !budget && values.size > 0 && /\bgift card\b/i.test(normalized)
    && [...normalized.matchAll(/\b(\d+(?:,\d{3})*\.\d+)\b/g)].some(([, amount]) => values.has(Number(amount.replaceAll(",", ""))));
  const text = amountText
    .replace(budget ? /\b(?:with\s+(?:a\s+)?values?(?:\s+of)?|prize value|price|priced|retail)\s*$|^\s*(?:prize|retail)\s+value\s+(?:of\s+)?/i : /$^/, "")
    .replace(budget || values.size ? /\s+\b(?:retail value|prize value|price)\s*$/i : /$^/, "")
    .replace(budget ? /\s+\b(?:price\s+range|range|each)\s*$/i : /$^/, "")
    .replace(budget ? /\s+\b(?:with values?|ranging|in the range of|worth|priced|in(?: the)?|within(?: the)?|costing)\s*$/i : /$^/, "")
    .replace(values.size ? /\s+\b(?:with a value of|with|costing|valued at|priced at|each|at)[\s,]*$/i : /$^/, "").trim()
    .replace(budget || values.size || entryPrice !== null ? /^(?:all\s+)?(?:prizes?|products?|items?)$/i : /$^/, "");
  const merchant = values.size || budget || strippedOnly || /\bgift card\b/i.test(text) ? catalogMerchant(text, products) : null;
  const keywords = merchant ? merchant + (/\bgift card\b/.test(normalizeSearch(text)) ? " gift card" : "") : text;
  const conflictingBudget = Boolean(budget?.minimum !== undefined && budget.maximum !== null
    && (budget.minimum > budget.maximum || (budget.minimum === budget.maximum && (budget.exclusiveMinimum || !budget.inclusive))));
  return { text: keywords, values, budget, exactOnly: exactOnly || decimalDenomination, conflictingBudget, entryPrice, entryPriceIsMaximum, exclusiveEntryPrice, screenSize, screenRange, excludedValues, merchant: merchant ? normalizeSearch(merchant) : null, ...(unsupportedCurrency ? { unsupportedCurrency } : {}) };
}
