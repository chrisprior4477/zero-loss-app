type Query = Record<string, string | string[] | undefined>;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const identifier = /^[a-zA-Z0-9_-]{1,80}$/;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const oneOf = (...values: string[]) => (value: string) => values.includes(value);
const matches = (pattern: RegExp) => (value: string) => pattern.test(value);
const routes: Record<string, { query: Record<string, (value: string) => boolean>; hash?: RegExp }> = {
  "/account/entries": { query: { item: matches(slug), entry: matches(identifier), filter: oneOf("all", "active", "prize", "completion", "completed") } },
  "/account/wallet": { query: { reward: matches(slug), rewardId: matches(uuid), view: oneOf("history", "card"), rewards: oneOf("ready", "history"), from: matches(slug), transaction: matches(uuid) }, hash: /^#(?:add-funds|transactions|transaction-[0-9a-f-]{36})$/i },
  "/account/crew": { query: { member: matches(uuid), tab: oneOf("crew", "requests", "picks"), request: matches(uuid) }, hash: /^#(?:sharing|crew-request-[0-9a-f-]{36})$/i },
  "/account/notifications": { query: {} },
  "/account/security": { query: {} },
  "/account/profile": { query: {} },
  "/account/orders": { query: {} },
  "/account/results": { query: {} },
  "/support": { query: { case: matches(uuid), transaction: matches(uuid), view: oneOf("inbox"), page: matches(/^[1-9]\d{0,4}$/), messages: matches(/^[1-9]\d{0,4}$/) }, hash: /^#(?:conversation|case-list)$/ },
};

/** Navigation only: the destination must still authorize every record after login. */
export function accountReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const url = new URL(value, "https://navigation.invalid");
  const route = routes[url.pathname];
  // Reject normalized paths, duplicate selectors, unknown keys and foreign origins.
  if (!route || url.origin !== "https://navigation.invalid" || value.split(/[?#]/, 1)[0] !== url.pathname || (url.hash && !route.hash?.test(url.hash))) return null;
  const seen = new Set<string>();
  for (const [key, entry] of url.searchParams) {
    if (seen.has(key) || !Object.hasOwn(route.query, key) || !route.query[key](entry)) return null;
    seen.add(key);
  }
  return value;
}

/** Build from known page selectors only; never forward arbitrary query data. */
export function accountPageReturnPath(path: string, query: Query = {}, hash = ""): string {
  const route = routes[path];
  if (!route) return "/account/entries";
  const params = new URLSearchParams();
  for (const key of Object.keys(route.query)) {
    const value = query[key];
    if (value === undefined) continue;
    if (typeof value !== "string" || !route.query[key](value)) return path;
    params.set(key, value);
  }
  const destination = `${path}${params.size ? `?${params}` : ""}${hash}`;
  return accountReturnPath(destination) ?? path;
}
