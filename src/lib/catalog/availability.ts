export type OfferingAvailability = {
  slug: string;
  capacity: number;
  sold: number;
  remaining: number;
  entryPriceCents: number;
  repeatableScenario: boolean;
};
export type AvailabilitySnapshot = Record<string, OfferingAvailability>;

/** Validate the public aggregate contract; never infer availability from a wallet. */
export function parseAvailability(data: unknown): AvailabilitySnapshot | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const result: AvailabilitySnapshot = {};
  for (const row of data) {
    if (!row || typeof row.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)
      || !Number.isSafeInteger(row.capacity) || row.capacity <= 0
      || !Number.isSafeInteger(row.sold) || row.sold < 0 || row.sold > row.capacity
      || !Number.isSafeInteger(row.remaining) || row.remaining !== row.capacity - row.sold
      || !Number.isSafeInteger(row.entryPriceCents) || row.entryPriceCents <= 0
      || typeof row.repeatableScenario !== "boolean" || Object.hasOwn(result, row.slug)) return null;
    result[row.slug] = {
      slug: row.slug, capacity: row.capacity, sold: row.sold, remaining: row.remaining,
      entryPriceCents: row.entryPriceCents, repeatableScenario: row.repeatableScenario,
    };
  }
  return result;
}

export function availabilityForHref(snapshot: AvailabilitySnapshot | null, href?: string): OfferingAvailability | undefined {
  const slug = href?.match(/^\/items\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:[?#]|$)/)?.[1];
  return slug ? snapshot?.[slug] : undefined;
}

export function filledPercent(availability: OfferingAvailability): number {
  return availabilityStatus(availability.capacity, availability.sold).percentFilled;
}

/** Availability language and colors always follow the same ticket-count bands. */
export function progressAppearance(percentFilled: number, full = false) {
  const color = percentFilled >= 90 ? "#f32343"
    : percentFilled >= 75 ? "#ff6b22"
      : percentFilled >= 50 ? "#0787e8" : "#25c46a";
  const label = full ? "Pool full" : percentFilled >= 90 ? "Almost full" : `${percentFilled}% full`;
  return { color, label, almostFull: !full && percentFilled >= 90 };
}

export function availabilityStatus(capacity: number, sold: number) {
  const safeCapacity = Math.max(1, capacity);
  const safeSold = Math.min(safeCapacity, Math.max(0, sold));
  const remaining = safeCapacity - safeSold;
  // Floor instead of round: one remaining ticket must never read as 100% full.
  const percentFilled = Math.floor(safeSold / safeCapacity * 100);
  return { remaining, percentFilled, ...progressAppearance(percentFilled, remaining === 0) };
}
