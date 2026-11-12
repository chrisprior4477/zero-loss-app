import { normalizeSearch } from "@/lib/catalog/search-text";
import type { LedgerEntryRow } from "./snapshot";

const dollars = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?`;
const amountOnly = new RegExp(String.raw`^[+−-]?\s*\$?\s*${dollars}$`);
const amountInText = new RegExp(String.raw`(?:^|\s)((?:[+−-]?\s*\$\s*|[+−-]\s*)${dollars})(?=\s|$)`, "g");

function amountMatch(token: string) {
  const [whole, fraction = ""] = token.replace(/[^\d.]/g, "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
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

  const amounts: ReturnType<typeof amountMatch>[] = [];
  const text = query.replace(amountInText, (_, token: string) => {
    amounts.push(amountMatch(token.trim()));
    return " ";
  });
  const terms = normalizeSearch(text).split(" ").filter(Boolean);
  const normalizedQuery = normalizeSearch(query);
  const mayBeGiftCardTitle = amounts.length > 0 && terms.length > 0 && !/[+−-]\s*\$?\s*\d/.test(query);
  if (!terms.length && !amounts.length) return [];
  return entries.filter(entry => {
    // A complete gift-card title can contain a face value different from the
    // amount posted to the wallet, such as a $100 card purchased for $99.
    if (mayBeGiftCardTitle && entry.product && normalizeSearch(entry.product.title) === normalizedQuery) return true;
    if (!amounts.every(matches => matches(entry.amount))) return false;
    const searchable = normalizeSearch([...describe(entry), entry.product?.title, entry.product?.retailer].join(" "));
    return terms.every(term => searchable.includes(term));
  });
}
