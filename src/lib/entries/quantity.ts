/** Representation boundary of the database integer, not a purchase allowance. */
export function isEntryQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= 2_147_483_647;
}

export function parseEntryQuantity(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const quantity = Number(value);
  return isEntryQuantity(quantity) ? quantity : null;
}
