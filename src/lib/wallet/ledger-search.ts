import { searchDenominations } from "@/lib/catalog/search-denomination";
import { normalizeSearch } from "@/lib/catalog/search-text";
import type { LedgerEntryRow } from "./snapshot";

const dollars = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?`;
const amountOnly = new RegExp(String.raw`^[+−-]?\s*\$?\s*${dollars}(?:\s*(?:dollars?|USD))?$`, "i");
const amountInText = new RegExp(String.raw`(?:^|\s)((?:[+−-]?\s*\$\s*|[+−-]\s*)${dollars})(?:\s+(?:dollars?|USD)\b)?(?=\s|$)`, "gi");
const faceValue = new RegExp(String.raw`\$\s*(${dollars})(?![\d.,])`);
const markedAmount = String.raw`[+−-]?\s*\$\s*${dollars}`;
const labeledAlternatives = new RegExp(String.raw`(${markedAmount}(?:\s+or\s+${markedAmount})+)(?=\s|$)`, "i");

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
    .replace(/\b(?:posted\s+)?amount\s*:\s*(?=[+−($\d-])/gi, "")
    .replace(new RegExp(String.raw`(^|\s|[()+−-])(${dollars})\s*\$(?=\s|$|\))`, "g"), "$1$$$2")
    .replace(/\(\s*[+−-]?\s*(\$?\s*\d[\d,.]*)\s*\)/g, "-$1")
    .replace(/\bfor\s+(?=[+−-]?\s*\$)/gi, "");
  const typeAliases = new Map([["refund", "REFUND"], ["deposit", "DEPOSIT"], ["funding", "DEPOSIT"]]);
  const typeOptions = query.toLowerCase().split(/\s+or\s+/).map(word => typeAliases.get(word.replace(/s$/, "")));
  if (typeOptions.length > 1 && typeOptions.every(Boolean)) {
    return entries.filter(entry => typeOptions.includes(entry.entry_type === "UNCLAIMED_WINNER_CREDIT" ? "REFUND" : entry.entry_type));
  }
  const spokenCents = /(\b(?:dollars?|bucks?))\s+and\s+(\d{1,2}|[a-z]+(?:[- ][a-z]+)?)\s+cents?\b/i.exec(query);
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

  const alternatives = query.split(/\s+or\s+/i);
  if (alternatives.length > 1 && alternatives.every(amount => amountOnly.test(amount))) {
    const matches = alternatives.map(amountMatch);
    return entries.filter(entry => matches.some(match => match(entry.amount)));
  }

  const labeled = labeledAlternatives.exec(query);
  const matchingAnyAmount = labeled?.[1].split(/\s+or\s+/i).map(value => amountMatch(value.trim()));
  const amounts: ReturnType<typeof amountMatch>[] = [];
  let text = (labeled ? query.replace(labeled[0], " ") : query).replace(amountInText, (_, token: string) => {
    amounts.push(amountMatch(token.trim()));
    return " ";
  });
  const explicitSign = /\b(minus|negative|plus|positive)\s+(?=(?:[a-z -]+|\d+(?:\.\d+)?)\s+(?:dollars?|bucks?)\b)/i.exec(text);
  if (amounts.length === 0 && !matchingAnyAmount && /\b(?:dollars?|bucks?|USD)\b/i.test(query)) {
    const spoken = searchDenominations(explicitSign ? text.replace(explicitSign[0], "") : text, []);
    if (!spoken.budget && spoken.values.size) {
      text = spoken.text;
      const sign = explicitSign ? /^(?:minus|negative)$/i.test(explicitSign[1]) ? "-" : "+" : "";
      for (const value of spoken.values) amounts.push(amountMatch(sign + value));
    }
  }
  const normalizedText = normalizeSearch(text);
  const entryPurchasesOnly = /\bposted entries\b/.test(normalizedText);
  const terms = normalizedText.replace(/\bposted entries\b/g, "posted entry purchase")
    .replace(/\bfunding\b/g, "deposit")
    .replace(/\b(refund|purchase|deposit)s\b/g, "$1").replace(/\bentries\b/g, "entry").split(" ").filter(Boolean);
  const normalizedQuery = normalizeSearch(query);
  const mayBeGiftCardTitle = !matchingAnyAmount && !explicitSign && !explicitPostedAmount && amounts.length === 1 && terms.length > 0 && !/(?:^|\s)[+−-]\s*\$?\s*\d/.test(query);
  if (!terms.length && !amounts.length && !matchingAnyAmount) return [];
  return entries.filter(entry => {
    if (entryPurchasesOnly && entry.entry_type !== "ENTRY_DEBIT") return false;
    if (matchingAnyAmount && !matchingAnyAmount.some(matches => matches(entry.amount))) return false;
    if (mayBeGiftCardTitle && entry.product) {
      const title = normalizeSearch(entry.product.title);
      const value = faceValue.exec(entry.product.title)?.[1];
      const keywords = new Set(`${title} ${normalizeSearch(entry.product.retailer ?? "")}`.split(" "));
      if (title === normalizedQuery || (/\bgift card\b/.test(title) && value
        && amounts[0](amountCents(value)) && terms.every(term => keywords.has(term)))) return true;
    }
    if (!amounts.every(matches => matches(entry.amount))) return false;
    const transactionType = entry.entry_type === "DEPOSIT" ? "deposit"
      : entry.entry_type === "UNCLAIMED_WINNER_CREDIT" ? "refund" : "";
    const searchable = normalizeSearch([...describe(entry), transactionType, entry.product?.title, entry.product?.retailer].join(" "));
    return terms.every(term => searchable.includes(term));
  });
}
