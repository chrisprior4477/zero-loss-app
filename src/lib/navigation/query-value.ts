/** Repeated identical selectors are one choice. A conflict needs an explicit choice. */
export function matchingQueryValue(value: string | string[] | undefined): string | undefined {
  if (!Array.isArray(value)) return value;
  return value.every(item => item === value[0]) ? value[0] : undefined;
}
