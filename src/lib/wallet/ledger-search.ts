import { searchDenominations, smallNumberWords } from "@/lib/catalog/search-denomination";
import { normalizeSearch } from "@/lib/catalog/search-text";
import type { LedgerEntryRow } from "./snapshot";
import { transactionDateRange } from "./date-presets";

const dollars = String.raw`(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?|\.\d{1,2})`;
const typeAliases = new Map([["refund", "REFUND"], ["deposit", "DEPOSIT"], ["funding", "DEPOSIT"], ["adjustment", "CORRECTION"], ["correction", "CORRECTION"]]);
const amountOnly = new RegExp(String.raw`^[+−-]?\s*\$?\s*${dollars}(?:\s*(?:dollars?|USD))?$`, "i");
const amountInText = new RegExp(String.raw`(?:^|\s)((?:[+−-]?\s*\$\s*|[+−-]\s*)${dollars})(?:\s+(?:dollars?|USD)\b)?(?=\s|$)`, "gi");
const faceValue = new RegExp(String.raw`\$\s*(${dollars})(?![\d.,])`);
const markedAmount = String.raw`[+−-]?\s*\$?\s*${dollars}`;
const amountSeparator = /\s+or\s+|\s*,\s+(?:(?:and|or)\s+)?|\s*,\s*(?=[+−-]?\s*\$)|\s+and\s+(?=[+−-]?\s*\$)/i;
const signedRange = new RegExp(String.raw`\b(?:between|from)\s+(${markedAmount})\s+(?:and|to|through)\s+(${markedAmount})(?=\s|$)`, "i");
const signedBareRange = new RegExp(String.raw`^([+−-]\s*\$?\s*${dollars})\s*(?:[-–—]|\bto\b|\bthrough\b)\s*(${markedAmount})$`, "i");
const signedBound = new RegExp(String.raw`^(under|below|less than|over|above|more than|at least|at most)\s+([+−-]\s*\$?\s*${dollars})$`, "i");
const labeledAlternatives = new RegExp(String.raw`([+−-]?\s*\$\s*${dollars}(?:(?:${amountSeparator.source})${markedAmount})+)(?=\s|$)`, "i");
const typeAmount = /\b(deposits?|funding|refunds?|adjustments?|corrections?|transactions?)\s+(?:of\s+|for\s+)?(?=\d|[$+−-]|[a-z]+(?:[ -][a-z]+)*\s+(?:dollars?|cents?)\b)/gi;
const entryPaymentType = String.raw`entry\s+(?:payments?|debits?|purchases?|charges?)`;
const entryPayments = new RegExp(String.raw`^(?:all\s+)?(?:posted\s+)?${entryPaymentType}\b`, "i");
const qualifiedEntryPayment = new RegExp(String.raw`^(.+?)\s+(?:posted\s+)?${entryPaymentType}(?:\s+(.+))?$`, "i");
const entryPaymentAmountFirst = new RegExp(String.raw`^(\$\s*${dollars})\s+(.+)$`, "i");
const paidWithScope = /^(?:exactly\s+)?(.+?)\s+(?:paid|spent|charged)\s+(.+)$/i;
const centsValue = String.raw`(\d+|${smallNumberWords})\s+cents?\b`;
const signedCents = new RegExp(String.raw`(?:^|\s)(?:(minus|negative|plus|positive|[+−-])\s*)?${centsValue}`, "i");
const spokenCentsPattern = new RegExp(String.raw`(\b(?:dollars?|bucks?))\s+(?:and\s+)?${centsValue}`, "i");
const amountLabel = /\b(?:posted\s+)?amounts?(?:\s*(?::|=|equals\b)\s*|\s+(?:of\s+)?)(?=[+−($\d-]|(?:[a-z]+[ -]+)+(?:dollars?|bucks?|cents?)\b)/gi;
const amountComparisonLabel = /\b(?:posted\s+)?amounts?\s+(?=(?:under|below|over|above|at least|at most|less than|more than|between|from)\s+[+−-]?\s*\$)/gi;
export const postedAmountQuery = /\bposted\s+amounts?(?=\s|:|=)/i;

function amountCents(token: string) {
  const [whole, fraction = ""] = token.replace(/[^\d.]/g, "").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function amountMatch(token: string) {
  const cents = amountCents(token);
  const sign = /^[−-]/.test(token) ? -1 : token.startsWith("+") ? 1 : 0;
  return (posted: number) => Number.isSafeInteger(cents) && Math.abs(posted) === cents && (!sign || Math.sign(posted) === sign);
}

type SearchCalendar = { timeZone: string; locale: string; now?: Date };
const dateLimit = "on or after|after|on or before|before|older than|since";
const oneDateLimit = new RegExp(`^(?:(?:posted\\s+)?transactions?\\s+)?(${dateLimit})\\s+(.+)$`, "i");
const twoDateLimits = new RegExp(`^(?:(?:posted\\s+)?transactions?\\s+)?(${dateLimit})\\s+(.+?)\\s+and\\s+(${dateLimit})\\s+(.+)$`, "i");

function localDateKey(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
}

function normalizedDate(value: string) {
  return normalizeSearch(value.replace(/(\d)(?:st|nd|rd|th)\b/gi, "$1"))
    .split(" ").filter(part => part !== "de" && part !== "of" && part !== "the");
}

function dateBoundary(value: string, calendar: SearchCalendar) {
  if (/[$€£¥]/.test(value)) return null;
  const iso = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/.exec(value);
  const numeric = /^(\d{1,2})([-/])(\d{1,2})\2(\d{4}|\d{2})$/.exec(value);
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;
  if (iso) [year, month, day] = [Number(iso[1]), Number(iso[3]), Number(iso[4])];
  else if (numeric) {
    const dayFirst = new Intl.DateTimeFormat(calendar.locale, { day: "numeric", month: "numeric" })
      .formatToParts(0).find(part => part.type === "day" || part.type === "month")?.type === "day";
    // Two-digit years refer to this ledger's supported operating century.
    year = Number(numeric[4]) + (numeric[4].length === 2 ? 2000 : 0);
    [month, day] = [Number(numeric[dayFirst ? 3 : 1]), Number(numeric[dayFirst ? 1 : 3])];
  } else {
    const words = normalizedDate(value);
    const dayOfWeek = /^(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)$/.test(words[0]) ? words.shift() : undefined;
    if (words.length < 2 || words.length > 3) return null;
    const name = words.find(word => /^[a-z]+$/.test(word));
    if (!name) return null;
    year = Number(words.find(word => /(?:^|[-/])\d{4}(?:$|[-/])/.test(word))) || undefined;
    const dayWord = words.find(word => /^\d{1,2}$/.test(word));
    day = dayWord === undefined ? undefined : Number(dayWord);
    if (day === 0) return null;
    if (words.length !== 1 + Number(year !== undefined) + Number(day !== undefined)) return null;
    if (!year && !day) return null;
    for (const locale of new Set([calendar.locale, "en-US"])) {
      for (const width of ["short", "long"] as const) {
        const formatter = new Intl.DateTimeFormat(locale, { month: width, timeZone: "UTC" });
        for (let index = 0; index < 12; index++) {
          if (normalizeSearch(formatter.format(new Date(Date.UTC(2000, index, 1)))) === name
            || name === "sept" && index === 8) month = index + 1;
        }
      }
      if (month) break;
    }
    if (dayOfWeek && (!year || !day || !month || new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(year, month - 1, day))).toLowerCase() !== dayOfWeek.slice(0, 3))) return null;
  }
  if (!month || !day && !year) return null;
  const date = new Date(Date.UTC(year ?? 2000, month - 1, day ?? 1));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== (day ?? 1)) return null;
  const key = date.toISOString().slice(0, 10);
  return day ? key.slice(year ? 0 : 5) : key.slice(0, 7);
}

function dateLimitMatches(date: string, operator: string, boundary: string) {
  const comparable = boundary.length === 5 ? date.slice(5) : date.slice(0, boundary.length);
  switch (operator.toLowerCase()) {
    case "on or after":
    case "since": return comparable >= boundary;
    case "on or before": return comparable <= boundary;
    case "before":
    case "older than": return comparable < boundary;
    default: return comparable > boundary;
  }
}

function shortDateBoundary(value: string, calendar: SearchCalendar) {
  const numeric = /^(\d{1,2})([-/])(\d{1,2})$/.exec(value);
  return numeric ? dateBoundary(value + numeric[2] + "2000", calendar)?.slice(5) : null;
}

const searchTimeZones: Record<string, string> = {
  UTC: "UTC", GMT: "UTC",
  ET: "America/New_York", EST: "Etc/GMT+5", EDT: "Etc/GMT+4",
  CT: "America/Chicago", CST: "Etc/GMT+6", CDT: "Etc/GMT+5",
  MT: "America/Denver", MST: "Etc/GMT+7", MDT: "Etc/GMT+6",
  PT: "America/Los_Angeles", PST: "Etc/GMT+8", PDT: "Etc/GMT+7",
  AKST: "Etc/GMT+9", AKDT: "Etc/GMT+8", HST: "Etc/GMT+10",
};

function calendarBoundary(value: string, calendar: SearchCalendar) {
  return dateBoundary(value, calendar) ?? shortDateBoundary(value, calendar);
}

function searchDate<T extends Pick<LedgerEntryRow, "created_at">>(entries: T[], query: string, calendar: SearchCalendar) {
  const timed = /^(.+?)(?:,\s*|\s+at\s+|\s+)(\d{1,2}):(\d{2})\s*(AM|PM)?(?:\s+([A-Z]{2,5}|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?))?$/i.exec(query);
  const boundary = dateBoundary(timed?.[1] ?? query, calendar) ?? shortDateBoundary(timed?.[1] ?? query, calendar);
  if (!boundary) return null;
  const explicitZone = timed?.[5];
  const timeZone = explicitZone ? searchTimeZones[explicitZone.toUpperCase()] ?? explicitZone : calendar.timeZone;
  let formatter: Intl.DateTimeFormat;
  let clock: Intl.DateTimeFormat | null;
  try {
    formatter = localDateKey(timeZone);
    clock = timed ? new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : null;
  } catch {
    return [];
  }
  const hour = timed ? Number(timed[2]) : 0;
  const meridiem = timed?.[4]?.toUpperCase();
  if (timed && (hour > 23 || meridiem && (hour < 1 || hour > 12) || Number(timed[3]) > 59)) return [];
  const minute = timed ? String(meridiem ? (hour % 12) + (meridiem === "PM" ? 12 : 0) : hour).padStart(2, "0") + ":" + timed[3] : "";
  return entries.filter(entry => {
    const date = new Date(entry.created_at);
    const day = formatter.format(date);
    return (boundary.length === 5 ? day.slice(5) === boundary : day.startsWith(boundary)) && (!clock || clock.format(date) === minute);
  });
}

function searchLedgerDates<T extends LedgerEntryRow>(entries: T[], dateQuery: string, calendar: SearchCalendar): T[] | null {
  const relative = /^(?:today|last (7|30) days)$/i.exec(dateQuery);
  if (relative) {
    const { from, through } = transactionDateRange(Number(relative[1] ?? 1), calendar.timeZone, calendar.now);
    const formatter = localDateKey(calendar.timeZone);
    return entries.filter(entry => {
      const day = formatter.format(new Date(entry.created_at));
      return day >= from && day <= through;
    });
  }
  const week = /^week of\s+(.+)$/i.exec(dateQuery);
  const weekDay = week && dateBoundary(week[1], calendar);
  if (weekDay && weekDay.length === 10) {
    const start = new Date(weekDay + "T00:00:00Z");
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const formatter = localDateKey(calendar.timeZone);
    return entries.filter(entry => {
      const date = formatter.format(new Date(entry.created_at));
      return date >= start.toISOString().slice(0, 10) && date <= end.toISOString().slice(0, 10);
    });
  }
  const interval = twoDateLimits.exec(dateQuery);
  if (interval) {
    const first = calendarBoundary(interval[2], calendar);
    const last = calendarBoundary(interval[4], calendar);
    if (first && last) {
      const formatter = localDateKey(calendar.timeZone);
      return entries.filter(entry => {
        const date = formatter.format(new Date(entry.created_at));
        return dateLimitMatches(date, interval[1], first) && dateLimitMatches(date, interval[3], last);
      });
    }
  }
  const after = oneDateLimit.exec(dateQuery);
  const exclusiveStart = after && calendarBoundary(after[2], calendar);
  if (exclusiveStart) {
    const formatter = localDateKey(calendar.timeZone);
    return entries.filter(entry => dateLimitMatches(formatter.format(new Date(entry.created_at)), after![1], exclusiveStart));
  }
  dateQuery = dateQuery.replace(/^between\s+([\p{L}.]+\s+\d{1,2}(?:st|nd|rd|th)?)\s+and\s+(?=\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}$)/iu, "$1 to ");
  const compactRange = /^(?:from\s+)?([\p{L}.]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–—]\s*|\s+(?:through|to)\s+(?:the\s+)?)(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/iu.exec(dateQuery);
  const rangeQuery = compactRange
    ? `from ${compactRange[1]} ${compactRange[2]}, ${compactRange[4]} to ${compactRange[1]} ${compactRange[3]}, ${compactRange[4]}`
    : dateQuery;
  const dateRange = /^between\s+(.+?)\s+and\s+(.+)$/i.exec(rangeQuery)
    ?? /^(?:from\s+)?(.+?)\s+(?:to|through|until)\s+(.+)$/i.exec(rangeQuery)
    ?? /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[-–—]\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)$/.exec(rangeQuery)
    ?? /^(.+\d)\s*[-–—]\s*([\p{L}.]+\s+\d{1,2}(?:,?\s+\d{4})?)$/u.exec(rangeQuery);
  if (dateRange) {
    const first = calendarBoundary(dateRange[1], calendar);
    const last = calendarBoundary(dateRange[2], calendar);
    const start = first?.length === 7 ? `${first}-01` : first;
    const end = last?.length === 7 ? `${last}-31` : last;
    if (start && end) {
      const yearIncluded = start.length === 10 || end.length === 10;
      const formatter = localDateKey(calendar.timeZone);
      const crossesYear = start.slice(-5) > end.slice(-5);
      const lower = start.length === 5 && end.length === 10 ? `${Number(end.slice(0, 4)) - Number(crossesYear)}-${start}` : start;
      const upper = end.length === 5 && start.length === 10 ? `${Number(start.slice(0, 4)) + Number(crossesYear)}-${end}` : end;
      return entries.filter(entry => {
        const value = formatter.format(new Date(entry.created_at)).slice(yearIncluded ? 0 : 5);
        return !yearIncluded && crossesYear ? value >= lower || value <= upper : value >= lower && value <= upper;
      });
    }
  }
  const dateList = /^(.+?)\s+(?:and|or)\s+(.+)$/i.exec(dateQuery);
  if (dateList) {
    const first = calendarBoundary(dateList[1], calendar);
    const last = calendarBoundary(dateList[2], calendar);
    if (first && last && first.length !== 7 && last.length !== 7) {
      const days = [first.length === 5 && last.length === 10 ? last.slice(0, 5) + first : first,
        last.length === 5 && first.length === 10 ? first.slice(0, 5) + last : last];
      const formatter = localDateKey(calendar.timeZone);
      return entries.filter(entry => {
        const day = formatter.format(new Date(entry.created_at));
        return days.some(boundary => (boundary.length === 5 ? day.slice(5) : day) === boundary);
      });
    }
  }
  return searchDate(entries, dateQuery, calendar);
}

/** Search posted amounts exactly. Numbers in plain product names remain text. */
export function searchLedger<T extends LedgerEntryRow>(entries: T[], rawQuery: string, describe: (entry: T) => readonly string[], fullLedger: readonly T[] = entries, calendar: SearchCalendar = { timeZone: "UTC", locale: "en-US" }): T[] {
  const raw = rawQuery.trim();
  const postedDate = /(?:^|\s+)posted\s+(?=(?:on|before|after|since|older than|in|during|between|from|last|today)\b)/i;
  const trimmed = raw.replace(postedDate, " ").trim();
  if (!trimmed) return entries;
  if (postedAmountQuery.test(trimmed) || postedDate.test(raw)) entries = entries.filter(entry => entry.entry_type !== "ENTRY_HOLD" && entry.entry_type !== "ENTRY_HOLD_RELEASE");
  const reference = /^(?:transaction\s*(?:#|number|ref(?:erence)?\.?)\s*|(?:transaction\s+(?:reference\s+)?|reference\s+)ending\s+|#)?([a-f0-9-]{8,36})$/i.exec(trimmed);
  if (reference) {
    const id = reference[1].toLowerCase();
    const matches = entries.filter(entry => entry.id.toLowerCase().endsWith(id));
    if (matches.length || /^(?:transaction|reference|#)/i.test(trimmed)) return matches;
  }
  const dateQuery = trimmed
    .replace(/^(?:all\s+)?(?:(?:posted\s+)?transactions?\s+)(?=(?:on|in|during|before|after|since|older than|between|from|last|today)\b)/i, "")
    .replace(/^(?:posted\s+)?(?:on\s+(?!or\s)|(?:in|during)\s+)/i, "");
  const dateMatches = searchLedgerDates(entries, dateQuery, calendar);
  if (dateMatches) return dateMatches;
  const relativeDate = /^(.+?)\s+(today|last (?:7|30) days)$/i.exec(dateQuery);
  if (relativeDate) {
    const dated = searchLedgerDates(entries, relativeDate[2], calendar);
    if (dated) return searchLedger(dated, relativeDate[1].replace(/\s+(?:in|during)$/i, ""), describe, fullLedger, calendar);
  }
  const scopedDate = /^(.+?)\s+(on or after|on or before|older than|before|after|since|from|between|on|in|during)\s+(.+)$/i.exec(dateQuery);
  if (scopedDate) {
    const [, scope, operator, dateText] = scopedDate;
    const date = /^(?:on|in|during)$/i.test(operator) ? dateText : operator + " " + dateText;
    const dated = searchLedgerDates(entries, date, calendar);
    if (dated) {
      const term = scope.replace(/\s+transactions?$/i, "").replace(/^entr(?:y|ies)(?=\s|$)(?!\s+(?:payments?|debits?|purchases?|charges?|holds?|reservations?))/i, "entry payments");
      return searchLedger(dated, term, describe, fullLedger, calendar);
    }
  }
  const searchAgain = (rows: T[], text: string) => searchLedger(rows, text, describe, fullLedger, calendar);
  const dateParts = dateQuery.split(/\s+/);
  if (dateParts.length > 2) {
    const sides = [3, 2, 1].filter(length => dateParts.length > length).flatMap(length => [
      [dateParts.slice(0, length), dateParts.slice(length)],
      [dateParts.slice(-length), dateParts.slice(0, -length)],
    ]);
    for (const [date, remainder] of sides) {
      const matches = searchDate(entries, date.join(" "), calendar);
      if (matches) return searchAgain(matches, remainder.join(" ").replace(/\s+on$/i, "").replace(/^(?:at\s+)(?=[+−-]?\s*\$)/i, ""));
    }
  }
  const depositReceipt = /^(?:deposit|funding)\s+receipts?\b\s*(?:for\s+)?/i.exec(trimmed);
  if (depositReceipt) return searchAgain(entries.filter(row => row.entry_type === "DEPOSIT"), trimmed.slice(depositReceipt[0].length));
  const purchaseAtAmount = /^(.+?)\s+purchased\s+for\s+(.+)$/i.exec(trimmed);
  if (purchaseAtAmount && amountOnly.test(purchaseAtAmount[2])) {
    const matches = amountMatch(purchaseAtAmount[2]);
    return searchAgain(entries.filter(row => row.entry_type === "PURCHASE_DEBIT" && matches(row.amount)), purchaseAtAmount[1]);
  }
  const purchaseType = /^(?:gift[\s-]+card\s+purchases?(?:\s+from\s+(.+))?|(.+)\s+gift[\s-]+card\s+purchases?)$/i.exec(trimmed);
  if (purchaseType) {
    const merchantOrAmount = purchaseType[1] ?? purchaseType[2] ?? "";
    return searchAgain(entries.filter(row => row.entry_type === "PURCHASE_DEBIT"), merchantOrAmount);
  }
  const explicitPostedAmount = [...trimmed.matchAll(amountLabel)].length > 0 || /\s+exactly$/i.test(trimmed);
  const query = (trimmed.replace(/[.!?,]+$/, "") || trimmed)
    .replace(/^(?:transactions?\s+)?with\s+(?:an?\s+)?(?=(?:posted\s+)?amounts?\b)/i, "")
    .replace(amountComparisonLabel, "")
    .replace(/\$\s*\.(?=\d)/g, "$$0.")
    .replace(/\btop[ -]?ups?\b/gi, "deposit")
    .replace(/^funds added(?=\s|$)/i, "deposits")
    .replace(/\brefunded\b/gi, "refund")
    .replace(/(\d+)\s*¢(?=\s|$)/g, "$1 cents")
    .replace(/^([<>]=?|[≤≥])\s*(?=[+−-]\s*\$?\s*\d)/, (_, operator: string) => (
      { ">=": "at least ", "≥": "at least ", "<=": "at most ", "≤": "at most ", ">": "more than ", "<": "less than " }[operator] ?? operator
    ))
    .replace(/^(\$[\d,.]+)\s+(?:paid|spent)\s+(?:at|from)\s+/i, "spent $1 from ")
    .replace(/\s+exactly$/i, "")
    .replace(/\b(\d+)\s*c\b/gi, "$1 cents")
    .replace(/\bface value\s+(?=\$)/gi, "")
    .replace(/\bcompleted\s+deposits?\b/gi, "deposit")
    .replace(/\bposted\s+transactions?\b/gi, " ")
    .replace(/,\s+(?=posted\s*$)/i, " ")
    .replace(/^charged(?:\s+exactly)?(?=\s+[$\d])/i, "paid")
    .replace(/^(deposits?|funding)\s+amount\s+(?=between\b|from\b)/i, "$1 ")
    .replace(/^amount\s+(?=(?:from|between)\s+[+−-]?\s*\$)/i, "")
    .replace(new RegExp(String.raw`^(\$\s*${dollars})\s+to\s+(\$\s*${dollars})\s+(deposits?|funding)$`, "i"), "$3 between $1 and $2")
    .replace(/(\bgift[\s-]+cards?)\s+worth\s+(?=\$)/gi, "$1 ")
    .replace(/\b(?:US\s*)?USD\s+(?=[$+−-])/gi, "")
    .replace(/\bUS\s*(?=\$)/gi, "")
    .replace(/\$\s*([+−-])\s*(?=\d)/g, "$1$$")
    .replace(/\b(minus|negative|plus|positive)\s+(?=\$)/gi, (_, sign: string) => /^(?:minus|negative)$/i.test(sign) ? "-" : "+")
    .replace(amountLabel, "")
    .replace(new RegExp(String.raw`(^|\s|[()+−-])(${dollars})\s*\$(?=\s|$|\))`, "g"), "$1$$$2")
    .replace(/(^|\s)\$\s*(?=\()/g, "$1")
    .replace(/\(\s*[+−-]?\s*(\$?\s*\d[\d,.]*)\s*\)/g, "-$1")
    .replace(/\bfor\s+(?=[+−-]?\s*\$)/gi, "")
    .replace(typeAmount, "$1 ")
    .replace(/^(deposits?|funding)\s+of\s+(?=at least\b|at most\b|more than\b|less than\b|under\b|over\b|between\b)/i, "$1 ")
    .replace(/^(?:wallet\s+)?(credits?|debits?|charges?)\s+(?:of|for)\s+/i, "$1 ")
    .replace(/^(.+?)\s+(debited|debits?|deposited|paid|spent)$/i, (whole, amount: string, type: string) => {
      if (!amount.split(/\s+or\s+/i).every(part => amountOnly.test(part))) return whole;
      const scope = /^deposit/i.test(type) ? "deposit" : /^debit/i.test(type) ? "debit" : "paid";
      return scope + " " + amount;
    })
    .replace(/^payments?(?:\s+of)?(?=\s+(?:[+−-]?\s*\$|\d)|$)/i, "paid")
    .replace(new RegExp(String.raw`^(?:(deposits?|funding|refunds?|adjustments?|corrections?|purchases?)\s+)?(\$\s*${dollars})\s+to\s+(\$\s*${dollars})$`, "i"),
      (_, scope: string | undefined, low: string, high: string) => `${scope ? scope + " " : ""}between ${low} and ${high}`)
    .replace(/^transactions?\s+(?=[+−-]?\s*\$)/i, "").trim();
  if (!query) return entries;
  const comparison = /^(?:amount\s*)?(>=|<=|>|<)\s*(.+)$/.exec(query);
  if (comparison && amountOnly.test(comparison[2])) {
    const cents = amountCents(comparison[2]);
    return entries.filter(row => {
      const amount = Math.abs(row.amount);
      return comparison[1].startsWith(">") ? amount > cents || comparison[1] === ">=" && amount === cents : amount < cents || comparison[1] === "<=" && amount === cents;
    });
  }
  const cardPayments = /^(?:card payments? (?:of|for)\s+)(.+)$/i.exec(query);
  if (cardPayments) return searchAgain(entries.filter(row => row.entry_type === "PURCHASE_DEBIT"), cardPayments[1]);
  const paidAt = /^(.+?)\s+(?:paid|spent)\s+(?:at|with)\s+(.+)$/i.exec(query);
  if (paidAt && amountOnly.test(paidAt[1])) return searchAgain(entries.filter(row => row.entry_type === "PURCHASE_DEBIT"), paidAt[2] + " " + paidAt[1]);
  const direction = /^(?:all\s+)?(?:wallet\s+)?(debits?|charges?|credits?)(?=\s|$)/i.exec(query);
  if (direction) {
    const debit = !/^credit/i.test(direction[1]);
    return searchAgain(entries.filter(row => row.entry_type !== "ENTRY_HOLD" && row.entry_type !== "ENTRY_HOLD_RELEASE"
      && (debit ? row.amount < 0 : row.amount > 0)), query.slice(direction[0].length).trim());
  }
  const released = /^(?:(?:released|reversed)\s+(?:reservations?|holds?)|entry\s+(?:holds?|reservations?)\s+releas(?:e|es|ed)|releases?\s+of(?=\s+\$))\b/i.exec(query);
  if (released) return searchAgain(entries.filter(row => row.entry_type === "ENTRY_HOLD_RELEASE"), query.slice(released[0].length).trim());
  const held = /^entry\s+(?:holds|reservations)\b/i.exec(query);
  if (held) return searchAgain(entries.filter(row => row.entry_type === "ENTRY_HOLD"), query.slice(held[0].length).trim());
  const entryPayment = entryPayments.exec(query);
  if (entryPayment) return searchAgain(entries.filter(row => row.entry_type === "ENTRY_DEBIT"), query.slice(entryPayment[0].length).trim().replace(/^(?:for\s+|rows?$)/i, ""));
  const namedEntryPayment = qualifiedEntryPayment.exec(query);
  if (namedEntryPayment) {
    const [, prefix, details] = namedEntryPayment;
    const typed = entries.filter(row => row.entry_type === "ENTRY_DEBIT");
    if (details && amountOnly.test(details)) {
      const matches = amountMatch(details);
      return searchAgain(typed.filter(row => matches(row.amount)), prefix);
    }
    const amountFirst = !details && entryPaymentAmountFirst.exec(prefix);
    if (amountFirst) {
      const matches = amountMatch(amountFirst[1]);
      return searchAgain(typed.filter(row => matches(row.amount)), amountFirst[2]);
    }
    return searchAgain(typed, details ? prefix + " " + details : prefix);
  }
  const namedPayment = paidWithScope.exec(query.replace(/\bwas\s+charged\b/i, "charged"));
  if (namedPayment) {
    const sides = namedPayment.slice(1).map(part => part.replace(/^exactly\s+/i, "").trim());
    for (const [index, part] of sides.entries()) {
      const spoken = amountOnly.test(part) ? null : searchDenominations(part, []);
      const value = amountOnly.test(part) ? part : spoken?.values.size === 1 && !spoken.text ? String([...spoken.values][0]) : null;
      if (value === null) {
        if (spoken?.budget && !spoken.text) return searchAgain(searchAgain(entries.filter(row => row.amount < 0
          && (row.entry_type === "ENTRY_DEBIT" || row.entry_type === "PURCHASE_DEBIT")), part), sides[1 - index]);
        continue;
      }
      const matches = amountMatch(value);
      return searchAgain(entries.filter(row => row.amount < 0 && ["ENTRY_DEBIT", "PURCHASE_DEBIT"].includes(row.entry_type)
        && matches(row.amount)), sides[1 - index]);
    }
  }
  const paidLast = /^(.+?)\s+(\$\s*[\d,.]+)\s+(?:paid|spent)$/i.exec(query);
  if (paidLast && amountOnly.test(paidLast[2])) {
    const matches = amountMatch(paidLast[2]);
    return searchAgain(entries.filter(row => row.amount < 0 && ["ENTRY_DEBIT", "PURCHASE_DEBIT"].includes(row.entry_type)
      && matches(row.amount)), paidLast[1]);
  }
  const cardCharge = /^(.+?)\s+card charges?\s+(?:of\s+)?(.+)$/i.exec(query);
  if (cardCharge && amountOnly.test(cardCharge[2])) {
    const matches = amountMatch(cardCharge[2]);
    return searchAgain(entries.filter(row => row.entry_type === "PURCHASE_DEBIT" && matches(row.amount)), cardCharge[1]);
  }
  const datedEntries = /^(?:entr(?:y|ies)|entry purchases?)\s+on\s+(.+)$/i.exec(query);
  if (datedEntries) {
    const matches = searchDate(entries.filter(row => row.entry_type === "ENTRY_DEBIT"), datedEntries[1], calendar);
    if (matches) return matches;
  }
  const pendingEntry = /^pending\s+(?:entr(?:y|ies)|holds?)\b/i.exec(query);
  if (pendingEntry) {
    const closed = new Set(fullLedger.filter(row => row.entry_type === "ENTRY_HOLD_RELEASE" && row.entryRequestId).map(row => row.entryRequestId));
    const open = entries.filter(row => row.entry_type === "ENTRY_HOLD" && (!row.entryRequestId || !closed.has(row.entryRequestId)));
    return searchAgain(open, query.slice(pendingEntry[0].length).trim());
  }
  const paid = /^(?:paid|spent)(?=\s|$)/i.exec(query);
  if (paid) {
    const detail = query.slice(paid[0].length).trim().replace(/^exactly\s+/i, "").replace(/^(\$\s*[\d,.]+)\s+(?:for|from|at|with|on|to)\b/i, "$1");
    return searchAgain(entries.filter(row => row.amount < 0 && ["ENTRY_DEBIT", "PURCHASE_DEBIT"].includes(row.entry_type)), detail);
  }
  const orders = /^(?:orders?(?:\s+for)?|bought)(?:\s+(.*))?$|^(.+?)\s+orders?$/i.exec(query);
  if (orders) return searchAgain(entries.filter(row => row.entry_type === "PURCHASE_DEBIT"), orders[1] ?? orders[2] ?? "");
  const typeAlternative = /^([a-z]+(?:\s+or\s+[a-z]+)+)(?=\s|$)(.*)$/i.exec(query);
  const types = typeAlternative?.[1].toLowerCase().split(/\s+or\s+/).map(word => word.replace(/s$/, ""));
  if (types?.every(type => typeAliases.has(type) || type === "purchase") && typeAlternative) {
    const typeOptions = new Set(types.map(type => typeAliases.get(type)));
    const typedEntries = entries.filter(entry => typeOptions.has(entry.entry_type === "UNCLAIMED_WINNER_CREDIT" ? "REFUND" : entry.entry_type));
    const remaining = typeAlternative[2].trim();
    const amount = remaining ? (explicitPostedAmount ? "amount: " : "") + remaining : "";
    const matched = new Set(searchAgain(typedEntries, amount));
    if (types.includes("purchase")) for (const entry of searchAgain(entries, `purchase ${amount}`.trim())) matched.add(entry);
    return entries.filter(entry => matched.has(entry));
  }
  const typedClauses = query.split(/\s+or\s+/i);
  if (typedClauses.length > 1 && typedClauses.every(clause => /^(?:deposits?|refunds?|funding|adjustments?|corrections?)\s+[$+−\d-]/i.test(clause))) {
    const matches = new Set(typedClauses.flatMap(clause => searchAgain(entries, clause)));
    return entries.filter(entry => matches.has(entry));
  }
  const signedValue = (value: string) => amountCents(value) * (/^[−-]/.test(value.trim()) ? -1 : 1);
  const ceiling = signedBound.exec(query);
  if (ceiling) {
    const bound = signedValue(ceiling[2]);
    if (!Number.isSafeInteger(bound)) return [];
    return entries.filter(entry => {
      switch (ceiling[1].toLowerCase()) {
        case "at least": return entry.amount >= bound;
        case "at most": return entry.amount <= bound;
        case "under": case "below": case "less than": return entry.amount < bound;
        default: return entry.amount > bound;
      }
    });
  }
  const signed = signedRange.exec(query) ?? signedBareRange.exec(query);
  if (signed && signed.slice(1).some(value => /^[+−-]/.test(value.trim()))) {
    const from = signedValue(signed[1]), to = signedValue(signed[2]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from > to) return [];
    const text = query.replace(signed[0], " ").trim().replace(/^transactions?\b\s*/i, "");
    return searchAgain(entries.filter(entry => entry.amount >= from && entry.amount <= to), text);
  }
  if (/\b(?:between|from|at least|at most|no (?:more|higher|greater|less) than|not exceeding|under|over|above|below|up to|greater than|less than|more than|or less)\b|[<>≤≥]\s*=?\s*\$?\s*\d|\$[\d,.]+\s*[-–—]\s*\$[\d,.]+/i.test(query)) {
    const { budget, text } = searchDenominations(query.replace(new RegExp(centsValue, "gi"), (_, amount: string) => {
      const [cents] = searchDenominations(amount + " dollars", []).values;
      return Number.isFinite(cents) ? "$" + (cents / 100).toFixed(2) : amount + " cents";
    }), []);
    if (budget) return searchAgain(entries.filter(entry => {
      const amount = Math.abs(entry.amount) / 100;
      return (budget.minimum === undefined || (budget.exclusiveMinimum ? amount > budget.minimum : amount >= budget.minimum))
        && (budget.maximum === null || (budget.inclusive ? amount <= budget.maximum : amount < budget.maximum));
    }), text.replace(/^transactions?\b\s*/i, ""));
  }

  const spokenAlternatives = query.split(/\s+or\s+|\s*,\s+(?:(?:and|or)\s+)?/i);
  if (spokenAlternatives.length > 1 && spokenAlternatives.every(part => amountOnly.test(part) || /^(?:minus |negative |plus |positive )?[\w -]+\s+(?:dollars?|bucks?|cents?)$/i.test(part))) {
    const unit = spokenAlternatives.at(-1)?.match(/\b(cents?|dollars?|bucks?)$/i)?.[1];
    const matched = new Set(spokenAlternatives.flatMap(part =>
      searchAgain(entries, unit && /^\d+$/.test(part) ? `${part} ${unit}` : part)));
    return entries.filter(entry => matched.has(entry));
  }
  const centsOnly = signedCents.exec(query);
  if (centsOnly) {
    const { values } = searchDenominations(centsOnly[2] + " dollars", []);
    const [cents] = values;
    const remainder = query.replace(centsOnly[0], " ").trim();
    if (values.size === 1 && Number.isSafeInteger(cents) && !/\b(?:dollars?|bucks?|USD)\b/i.test(remainder)) {
      const sign = centsOnly[1] ? /^(?:minus|negative|[-−])$/i.test(centsOnly[1]) ? -1 : 1 : 0;
      return searchAgain(entries.filter(entry => Math.abs(entry.amount) === cents && (!sign || Math.sign(entry.amount) === sign)), remainder);
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
      return searchAgain(entries, [spoken.text, amount].filter(Boolean).join(" "));
    }
  }
  if (amountOnly.test(query)) {
    const matches = amountMatch(query);
    return entries.filter(entry => matches(entry.amount));
  }

  const typedAmount = /^(deposits?|funding|refunds?|adjustments?|corrections?|purchases?)\s+(.+)$/i.exec(query);
  if (typedAmount && amountOnly.test(typedAmount[2])) {
    const matches = amountMatch(typedAmount[2]);
    return searchAgain(entries.filter(entry => matches(entry.amount)), typedAmount[1]);
  }


  const alternatives = query.split(/\s+or\s+/i);
  if (alternatives.length > 1 && alternatives.every(amount => amountOnly.test(amount))) {
    const matches = alternatives.map(amountMatch);
    return entries.filter(entry => matches.some(match => match(entry.amount)));
  }

  const labeled = labeledAlternatives.exec(query);
  const matchingAnyAmount = labeled?.[1].split(amountSeparator).map(value => amountMatch(value.trim()));
  const amountTokens: string[] = [];
  const amountText = labeled
    ? query.slice(0, labeled.index) + " " + query.slice(labeled.index + labeled[0].length).replace(/^\s+from\s+/i, "")
    : query.replace(/\s+and(?=\s+[+−-]?\s*\$\s*[\d,.]+\s*$)/i, "");
  let text = amountText.replace(amountInText, (_, token: string) => {
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
  const giftCardCharge = /\bgift card\b/.test(normalizedText) && amountTokens.length === 2
    && amountTokens.filter(token => /^[+−-]/.test(token)).length === 1;
  const denomination = giftCardCharge ? amountTokens.find(token => !/^[+−-]/.test(token)) : undefined;
  const amounts = amountTokens.filter(token => token !== denomination).map(amountMatch);
  const entryPurchasesOnly = /\bposted entries\b/.test(normalizedText);
  const terms = normalizedText.replace(/\bposted entries\b/g, "posted entry purchase")
    .replace(/\b(refunds?\b.*)\s+of\s*$/i, "$1")
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
