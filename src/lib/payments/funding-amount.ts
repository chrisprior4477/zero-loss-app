import { isFundingAmount } from "./provider";

/** New deposits use whole dollars. Never strip a decimal into a larger amount. */
export function parseFundingDollars(value: string): number | null {
  const match = /^\$?((?:\d+|\d{1,3}(?:,\d{3})+))$/.exec(value.trim());
  if (!match) return null;
  const cents = Number(match[1].replaceAll(",", "")) * 100;
  return isFundingAmount(cents) ? cents : null;
}
