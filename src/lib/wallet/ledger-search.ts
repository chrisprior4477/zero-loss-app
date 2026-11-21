import { searchDenominations, smallNumberWords } from "@/lib/catalog/search-denomination";
import { normalizeSearch } from "@/lib/catalog/search-text";
import type { LedgerEntryRow } from "./snapshot";

const dollars = String.raw`(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|\.\d{1,2})`;
const typeAliases = new Map([["refund", "REFUND"], ["deposit", "DEPOSIT"], ["funding", "DEPOSIT"], ["adjustment", "CORRECTION"], ["correction", "CORRECTION"]]);
const amountOnly = new RegExp(String.raw`^[+−-]?\s*\$?\s*${dollars}(?:\s*(?:dollars?|USD))?$`, "i");
const amountInText = new RegExp(String.raw`(?:^|\s)((?:[+−-]?\s*\$\s*|[+−-]\s*)${dollars})(?:\s+(?:dollars?|USD)\b)?(?=\s|$)`, "gi");
const faceValue = new RegExp(String.raw`\$\s*(${dollars})(?![\d.,])`);
const markedAmount = String.raw`[+−-]?\s*\$\s*${dollars}`;
const amountSeparator = /\s+or\s+|\s*,\s*(?=[+−-]?\s*\$)/i;
const labeledAlternatives = new RegExp(String.raw`(${markedAmount}(?:(?:${amountSeparator.source})${markedAmount})+)(?=\s|$)`, "i");
const typeAmount = /\b(deposits?|funding|refunds?|adjustments?|corrections?|transactions?)\s+(?:of\s+|for\s+)?(?=\d|[$+−-]|[a-z]+(?:[ -][a-z]+)*\s+(?:dollars?|cents?)\b)/gi;
const centsValue = String.raw`(\d{1,2}|${smallNumberWords})\s+cents?\b`;
const signedCents = new RegExp(String.raw`(?:^|\s)(?:(minus|negative|plus|positive|[+−-])\s*)?${centsValue}`, "i");
const spokenCentsPattern = new RegExp(String.raw`(\b(?:dollars?|bucks?))\s+(?:and\s+)?${centsValue}`, "i");

function amountCents(token: string) {
  const [whole, fraction = ""] = token.replace(/[^\d.]/g, "").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function amountMatch(token: string) {
  const cents = amountCents(token);
  const sign = /^[−-]/.test(token) ? -1 : token.startsWith("+") ? 1 : 0;
  return (posted: number) => Number.isSafeInteger(cents) && Math.abs(posted) === cents && (!sign || Math.sign(posted) === sign);
}

/** Search posted amounts exactly. Numbers in plain product names remain text. */
export function searchLedger<T extends LedgerEntryRow>(entries: T[], rawQuery: string, describe: (entry: T) => readonly string[]): T[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return entries;
  const explicitPostedAmount = /\b(?:posted\s+)?amount\s*:/i.test(trimmed);
  const query = (trimmed.replace(/[.!?,]+$/, "") || trimmed)
    .replace(/\b(?:US\s*)?USD\s+(?=[$+−-])/gi, "")
    .replace(/\bUS\s*(?=\$)/gi, "")
    .replace(/\$\s*([+−-])\s*(?=\d)/g, "$1$$")
    .replace(/\b(minus|negative|plus|positive)\s+(?=\$)/gi, (_, sign: string) => /^(?:minus|negative)$/i.test(sign) ? "-" : "+")
    .replace(/\b(?:posted\s+)?amount\s*:\s*(?=[+−($\d-])/gi, "")
    .replace(new RegExp(String.raw`(^|\s|[()+−-])(${dollars})\s*\$(?=\s|$|\))`, "g"), "$1$$$2")
    .replace(/\(\s*[+−-]?\s*(\$?\s*\d[\d,.]*)\s*\)/g, "-$1")
    .replace(/\bfor\s+(?=[+−-]?\s*\$)/gi, "")
    .replace(typeAmount, "$1 ")
    .replace(/^transactions?\s+(?=[+−-]?\s*\$)/i, "");
  const pendingEntry = /^pending\s+entr(?:y|ies)\b/i.exec(query);
  if (pendingEntry) {
    const closed = new Set(entries.filter(row => row.entry_type === "ENTRY_HOLD_RELEASE" && row.entryRequestId).map(row => row.entryRequestId));
    const open = entries.filter(row => row.entry_type === "ENTRY_HOLD" && (!row.entryRequestId || !closed.has(row.entryRequestId)));
    return searchLedger(open, query.slice(pendingEntry[0].length).trim(), describe);
  }
  if (/^paid\s+(?=\$|\d)/i.test(query)) {
    return searchLedger(entries.filter(row => row.amount < 0 && ["ENTRY_DEBIT", "PURCHASE_DEBIT"].includes(row.entry_type)), query.replace(/^paid\s+/i, ""), describe);
  }
  const typeAlternative = /^([a-z]+(?:\s+or\s+[a-z]+)+)(?=\s|$)(.*)$/i.exec(query);
  const typeOptions = typeAlternative?.[1].toLowerCase().split(/\s+or\s+/).map(word => typeAliases.get(word.replace(/s$/, "")));
  if (typeOptions?.every(Boolean) && typeAlternative) {
    const matched = entries.filter(entry => typeOptions.includes(entry.entry_type === "UNCLAIMED_WINNER_CREDIT" ? "REFUND" : entry.entry_type));
    const remaining = typeAlternative[2].trim();
    return searchLedger(matched, remaining ? (explicitPostedAmount ? "amount: " : "") + remaining : "", describe);
  }
  const centsOnly = signedCents.exec(query);
  if (centsOnly) {
    const { values } = searchDenominations(centsOnly[2] + " dollars", []);
    const [cents] = values;
    const remainder = query.replace(centsOnly[0], " ").trim();
    if (values.size === 1 && cents < 100 && !/\b(?:dollars?|bucks?|USD)\b/i.test(remainder)) {
      const sign = centsOnly[1] ? /^(?:minus|negative|[-−])$/i.test(centsOnly[1]) ? -1 : 1 : 0;
      return searchLedger(entries.filter(entry => Math.abs(entry.amount) === cents && (!sign || Math.sign(entry.amount) === sign)), remainder, describe);
    }
  }
  const spokenCents = spokenCentsPattern.exec(query);
  if (spokenCents) {
    const fractionValue = searchDenominations(spokenCents[2] + " dollars", []);
    const [fraction] = fractionValue.values;
    const base = query.replace(spokenCents[0], spokenCents[1]);
    const signPattern = /\b(?:minus|negative|plus|positive)\s+(?=[a-z0-9])|(?:^|\s)[-−+](?=\s*[$\d])/i;
    const signText = signPattern.exec(base)?.[0].trim() ?? "";
    const sign = /^(?:minus|negative|[-−])/i.test(signText) ? "-" : signText ? "+" : "";
    const spoken = searchDenominations(base.replace(signPattern, " "), []);
    const [whole] = spoken.values;
    if (fractionValue.values.size === 1 && fraction < 100 && !spoken.budget && spoken.values.size === 1 && Number.isSafeInteger(whole)) {
      const amount = "amount: " + sign + "$" + whole + "." + String(fraction).padStart(2, "0");
      return searchLedger(entries, [spoken.text, amount].filter(Boolean).join(" "), describe);
    }
  }
  if (amountOnly.test(query)) {
    const matches = amountMatch(query);
    return entries.filter(entry => matches(entry.amount));
  }

  const typedAmount = /^(deposits?|funding|refunds?|adjustments?|corrections?|purchases?)\s+(.+)$/i.exec(query);
  if (typedAmount && amountOnly.test(typedAmount[2])) {
    const matches = amountMatch(typedAmount[2]);
    return searchLedger(entries.filter(entry => matches(entry.amount)), typedAmount[1], describe);
  }
  if (/\b(?:between|from|at least|at most|no more than|under|over|above|below|up to)\b|[<>≤≥]\s*=?\s*\$?\s*\d|\$[\d,.]+\s*[-–—]\s*\$[\d,.]+/i.test(query)) {
    const { budget, text } = searchDenominations(query, []);
    if (budget) return searchLedger(entries.filter(entry => {
      const amount = Math.abs(entry.amount) / 100;
      return (budget.minimum === undefined || (budget.exclusiveMinimum ? amount > budget.minimum : amount >= budget.minimum))
        && (budget.maximum === null || (budget.inclusive ? amount <= budget.maximum : amount < budget.maximum));
    }), text, describe);
  }

  const alternatives = query.split(/\s+or\s+/i);
  if (alternatives.length > 1 && alternatives.every(amount => amountOnly.test(amount))) {
    const matches = alternatives.map(amountMatch);
    return entries.filter(entry => matches.some(match => match(entry.amount)));
  }

  const labeled = labeledAlternatives.exec(query);
  const matchingAnyAmount = labeled?.[1].split(amountSeparator).map(value => amountMatch(value.trim()));
  const amountTokens: string[] = [];
  let text = (labeled ? query.replace(labeled[0], " ") : query).replace(amountInText, (_, token: string) => {
    amountTokens.push(token.trim());
    return " ";
  });
  const explicitSign = /\b(minus|negative|plus|positive)\s+(?=(?:[a-z -]+|\d+(?:\.\d+)?)\s+(?:dollars?|bucks?)\b)/i.exec(text);
  if (amountTokens.length === 0 && !matchingAnyAmount && /\b(?:dollars?|bucks?|USD)\b/i.test(query)) {
    const spoken = searchDenominations(explicitSign ? text.replace(explicitSign[0], "") : text, []);
    if (!spoken.budget && spoken.values.size) {
      text = spoken.text;
      const sign = explicitSign ? /^(?:minus|negative)$/i.test(explicitSign[1]) ? "-" : "+" : "";
      for (const value of spoken.values) amountTokens.push(sign + value);
    }
  }
  const wordsOnly = normalizeSearch(text);
  const purchaseOptionsOnly = /\bpurchase options?\b/.test(wordsOnly);
  const normalizedText = wordsOnly
    .replace(/\b(refunds?|deposits?|adjustments?|corrections?) from\b/g, "$1")
    .replace(/\bpurchase options?\b/g, "gift card purchase");
  const giftCardCharge = !explicitPostedAmount && /\bgift card\b/.test(normalizedText) && amountTokens.length === 2
    && amountTokens.filter(token => /^[+−-]/.test(token)).length === 1;
  const denomination = giftCardCharge ? amountTokens.find(token => !/^[+−-]/.test(token)) : undefined;
  const amounts = amountTokens.filter(token => token !== denomination).map(amountMatch);
  const entryPurchasesOnly = /\bposted entries\b/.test(normalizedText);
  const terms = normalizedText.replace(/\bposted entries\b/g, "posted entry purchase")
    .replace(/\bfunding\b/g, "deposit")
    .replace(/\b(refund|purchase|deposit|adjustment|correction)s\b/g, "$1").replace(/\bcorrection\b/g, "adjustment").replace(/\bentries\b/g, "entry").split(" ").filter(Boolean);
  const normalizedQuery = normalizeSearch(query);
  const mayBeGiftCardTitle = !denomination && !matchingAnyAmount && !explicitSign && !explicitPostedAmount && amounts.length === 1 && terms.length > 0 && !/(?:^|\s)[+−-]\s*\$?\s*\d/.test(query);
  if (!terms.length && !amounts.length && !matchingAnyAmount) return [];
  return entries.filter(entry => {
    if (entryPurchasesOnly && entry.entry_type !== "ENTRY_DEBIT" || purchaseOptionsOnly && entry.entry_type !== "PURCHASE_DEBIT") return false;
    if (matchingAnyAmount && !matchingAnyAmount.some(matches => matches(entry.amount))) return false;
    if (mayBeGiftCardTitle && entry.product) {
      const title = normalizeSearch(entry.product.title);
      const value = faceValue.exec(entry.product.title)?.[1];
      const keywords = new Set(`${title} ${normalizeSearch(entry.product.retailer ?? "")}`.split(" "));
      if (title === normalizedQuery || (/\bgift card\b/.test(title) && value
        && amounts[0](amountCents(value)) && terms.every(term => keywords.has(term)))) return true;
    }
    if (denomination) {
      const value = entry.product && faceValue.exec(entry.product.title)?.[1];
      if (!value || !/\bgift card\b/.test(normalizeSearch(entry.product!.title)) || amountCents(value) !== amountCents(denomination)) return false;
    }
    if (!amounts.every(matches => matches(entry.amount))) return false;
    const transactionType = entry.entry_type === "DEPOSIT" ? "deposit"
      : entry.entry_type === "UNCLAIMED_WINNER_CREDIT" ? "refund" : "";
    const searchable = normalizeSearch([...describe(entry), transactionType, entry.product?.title, entry.product?.retailer].join(" "));
    return terms.every(term => searchable.includes(term));
  });
}
