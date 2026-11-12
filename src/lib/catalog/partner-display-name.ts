/** Correct legacy supplier spelling for display and matching; keep stored IDs and offer slugs. */
export function partnerDisplayName(name: string): string {
  return name.trim().toLowerCase() === "ube" ? "Uber" : name;
}
