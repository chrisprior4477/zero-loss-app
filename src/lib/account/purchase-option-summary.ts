import type { ActivityItem } from "./activity";
import { formatUsdFromCents } from "@/lib/wallet/money";

export function purchaseOptionSummary(options: readonly ActivityItem[]) {
  function range(values: number[]) {
    const low = Math.min(...values), high = Math.max(...values);
    return low === high ? formatUsdFromCents(low) : `${formatUsdFromCents(low)}–${formatUsdFromCents(high)}`;
  }
  if (!options.length) return null;
  const dates = options.map(option => option.completionExpiresAt).filter((date): date is string => Boolean(date && Number.isFinite(Date.parse(date))));
  const deadline = dates.length ? dates.reduce((first, date) => Date.parse(date) < Date.parse(first) ? date : first) : null;
  return {
    remaining: range(options.map(option => option.remainingCents)),
    applied: range(options.map(option => option.paidCents)),
    multiple: options.length > 1,
    deadline,
    earliestDeadline: dates.length !== options.length || new Set(dates.map(date => Date.parse(date))).size > 1,
  };
}
