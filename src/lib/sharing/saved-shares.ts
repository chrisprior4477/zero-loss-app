export type SavedProductShare = {
  id: string; token: string | null; slug: string; title: string; sender: string;
  createdAt: string; viewedAt: string | null; savedAt: string | null; declinedAt: string | null; demo: boolean;
};
export const shareUuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function parseSavedProductShares(value: unknown): SavedProductShare[] | null {
  if (!Array.isArray(value)) return null;
  const result: SavedProductShare[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const v = item as Record<string, unknown>;
    if (typeof v.id !== "string" || !shareUuid.test(v.id) || typeof v.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)
      || typeof v.title !== "string" || typeof v.sender !== "string" || typeof v.createdAt !== "string"
      || (v.token !== null && (typeof v.token !== "string" || !shareUuid.test(v.token)))) return null;
    result.push({ id: v.id, token: v.token as string | null, slug: v.slug, title: v.title, sender: v.sender, createdAt: v.createdAt,
      viewedAt: typeof v.viewedAt === "string" ? v.viewedAt : null, savedAt: typeof v.savedAt === "string" ? v.savedAt : null,
      declinedAt: typeof v.declinedAt === "string" ? v.declinedAt : null, demo: v.demo === true });
  }
  return result;
}
export const sharedWithYouHref = "/account/favorites?tab=shared";
export function savedShareHref(id?: string) {
  return id && shareUuid.test(id) ? `${sharedWithYouHref}&share=${id}` : sharedWithYouHref;
}
export function savedShareStatus(share: SavedProductShare) {
  return share.declinedAt ? "Declined" : share.savedAt ? "Saved" : share.viewedAt ? "Viewed" : "New";
}
