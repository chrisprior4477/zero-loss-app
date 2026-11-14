import { searchDenominations } from "@/lib/catalog/search-denomination";
import { normalizeSearch } from "@/lib/catalog/search-text";
import type { LedgerEntryRow } from "./snapshot";

const dollars = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?`;
const amountOnly = new RegExp(String.raw`^[+−-]?\s*\$?\s*${dollars}(?:\s*(?:dollars?|USD))?$`, "i");
const amountInText = new RegExp(String.raw`(?:^|\s)((?:[+−-]?\s*\$\s*|[+−-]\s*)${dollars})(?=\s|$)`, "g");
const faceValue = new RegExp(String.raw`\$\s*(${dollars})(?![\d.,])`);

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
  const query = rawQuery.trim();
  if (!query) return entries;
  if (amountOnly.test(query)) {
    const matches = amountMatch(query);
    return entries.filter(entry => matches(entry.amount));
  }

  if (/\bdollars?$/i.test(query)) {
    const { text, values } = searchDenominations(query, []);
    if (!text && values.size === 1) {
      const [value] = values;
      return entries.filter(entry => Math.abs(entry.amount) === value * 100);
    }
  }

  const amounts: ReturnType<typeof amountMatch>[] = [];
  const text = query.replace(amountInText, (_, token: string) => {
    amounts.push(amountMatch(token.trim()));
    return " ";
  });
  const terms = normalizeSearch(text).split(" ").filter(Boolean);
  const normalizedQuery = normalizeSearch(query);
  const mayBeGiftCardTitle = amounts.length === 1 && terms.length > 0 && !/(?:^|\s)[+−-]\s*\$?\s*\d/.test(query);
  if (!terms.length && !amounts.length) return [];
  return entries.filter(entry => {
    if (mayBeGiftCardTitle && entry.product) {
      const title = normalizeSearch(entry.product.title);
      const value = faceValue.exec(entry.product.title)?.[1];
      const keywords = new Set(`${title} ${normalizeSearch(entry.product.retailer ?? "")}`.split(" "));
      if (title === normalizedQuery || (/\bgift card\b/.test(title) && value
        && amounts[0](amountCents(value)) && terms.every(term => keywords.has(term)))) return true;
    }
    if (!amounts.every(matches => matches(entry.amount))) return false;
    const searchable = normalizeSearch([...describe(entry), entry.product?.title, entry.product?.retailer].join(" "));
    return terms.every(term => searchable.includes(term));
  });
}
