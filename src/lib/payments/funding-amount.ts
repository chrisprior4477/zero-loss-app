import { isFundingAmount } from "./provider";

/** Parse dollars and cents without changing the meaning of punctuation. */
export function parseFundingDollars(value: string): number | null {
  const match = /^\$?((?:\d+|\d{1,3}(?:,\d{3})+))(?:\.(\d{0,2}))?$/.exec(value.trim());
  if (!match) return null;
  const cents = Number(match[1].replaceAll(",", "")) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return isFundingAmount(cents) ? cents : null;
}
