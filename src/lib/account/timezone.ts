export const DEFAULT_TIME_ZONE = "America/New_York";

export function safeTimeZone(value: string | null | undefined): string {
  if (!value) return DEFAULT_TIME_ZONE;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return value; }
  catch { return DEFAULT_TIME_ZONE; }
}

export function timeZoneAbbreviation(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(new Date(value)).find(part => part.type === "timeZoneName")?.value ?? timeZone;
}
