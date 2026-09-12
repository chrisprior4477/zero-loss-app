export type AccountMode = "live" | "demo";

export const accountSections = [
  "entries",
  "orders",
  "wallet",
  "notifications",
  "security",
  "results",
] as const;

export function accountModeFromPath(pathname: string): AccountMode {
  return pathname.startsWith("/account/preview/") ? "demo" : "live";
}

export function accountSectionFromPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "account") return "entries";
  return parts[1] === "preview" ? parts[2] ?? "entries" : parts[1] ?? "entries";
}

export function accountHref(mode: AccountMode, section: string) {
  if (mode === "demo") return `/account/preview/${section}`;
  if (section === "profile") return "/account";
  if (!accountSections.includes(section as (typeof accountSections)[number])) return "/account";
  return `/account/${section}`;
}
