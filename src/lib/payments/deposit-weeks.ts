import type { DemoFundingRequest } from "./demo-provider";
import { safeTimeZone } from "@/lib/account/timezone";

const day = 86_400_000;
const rangeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

// Use calendar dates in the account's zone. A week that spans a clock change
// still runs from local Monday through local Sunday.
export function getDepositWeeks(requests: readonly DemoFundingRequest[], asOf: string, timeZone?: string) {
  const calendar = new Intl.DateTimeFormat("en-US", { timeZone: safeTimeZone(timeZone), year: "numeric", month: "numeric", day: "numeric" });
  function localDay(timestamp: number) {
    const parts = Object.fromEntries(calendar.formatToParts(timestamp).map(part => [part.type, part.value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  }
  const today = localDay(Date.parse(asOf));
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * day;
  const posted = requests.filter(request => request.reconciliation === "reconciled");
  if (posted.some(request => !request.postedAt || !Number.isFinite(Date.parse(request.postedAt)))) return null;
  const ordered = posted.sort((a, b) => Date.parse(b.postedAt!) - Date.parse(a.postedAt!) || b.id.localeCompare(a.id));
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const start = monday - index * 7 * day;
    return { label: rangeFormat.formatRange(start, Math.min(start + 6 * day, today)), cents: BigInt(0), receipts: [] as DemoFundingRequest[] };
  });
  for (const request of ordered) {
    const date = localDay(Date.parse(request.postedAt!));
    if (date > today || date < monday - 21 * day) continue;
    const week = weeks[Math.floor((monday + 6 * day - date) / (7 * day))];
    week.receipts.push(request);
    week.cents += BigInt(request.amount);
  }
  return { latest: ordered[0], weeks };
}

// A customer's total deposits over time can exceed a single safe integer.
export function formatDepositTotal(cents: bigint) {
  const fractional = cents % BigInt(100);
  return "$" + (cents / BigInt(100)).toLocaleString("en-US") + (fractional ? "." + String(fractional).padStart(2, "0") : "");
}
