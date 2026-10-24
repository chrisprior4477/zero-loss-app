export type SharedProductContext = { token: string; slug: string; sender: string; scope: string; isGroup: boolean; own: boolean; receiving: boolean; shareBack: boolean; hasChoice: boolean; demo?: boolean };
export function parseSharedProductContext(value: unknown): SharedProductContext | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!["token","slug","sender","scope"].every(k => typeof v[k] === "string") || !/^[0-9a-f-]{36}$/i.test(v.token as string)) return null;
  return { token: v.token as string, slug: v.slug as string, sender: v.sender as string, scope: v.scope as string, isGroup: v.isGroup === true, own: v.own === true, receiving: v.receiving === true, shareBack: v.shareBack === true, hasChoice: v.hasChoice === true, ...(v.demo === true ? { demo: true } : {}) };
}
