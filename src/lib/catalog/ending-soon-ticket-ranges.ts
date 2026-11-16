import { availabilityStatus } from "./availability";

export const endingSoonTicketRanges = [
  { value: "1", label: "1 left", min: 1, max: 1 },
  { value: "2-5", label: "2–5 left", min: 2, max: 5 },
  { value: "6-10", label: "6–10 left", min: 6, max: 10 },
] as const;

export type EndingSoonTicketRange = typeof endingSoonTicketRanges[number]["value"];

export function parseEndingSoonTicketRange(value: unknown): EndingSoonTicketRange | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return endingSoonTicketRanges.find(range => range.value === candidate)?.value ?? null;
}

/** Refine the eligible Ending Soon results; All keeps their existing availability rules. */
export function filterEndingSoonTickets<T extends { capacity: number; sold: number }>(products: T[], value: EndingSoonTicketRange | null): T[] {
  const range = endingSoonTicketRanges.find(range => range.value === value);
  return range ? products.filter(product => {
    const { remaining } = availabilityStatus(product.capacity, product.sold);
    return remaining >= range.min && remaining <= range.max;
  }) : products;
}
