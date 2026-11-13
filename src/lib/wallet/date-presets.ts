/** Inclusive calendar dates in the account's time zone, including today. */
export function transactionDateRange(days: number, timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  const through = `${part("year")}-${part("month")}-${part("day")}`;
  // Subtract calendar days rather than elapsed hours, so DST cannot shift the range.
  const start = new Date(`${through}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { from: start.toISOString().slice(0, 10), through };
}
