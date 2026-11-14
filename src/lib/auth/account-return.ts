import { parseEntryQuantity } from "@/lib/entries/quantity";
import { productBrowseReturnPath } from "@/lib/catalog/product-return";
import { depositRequestKeyPattern } from "@/lib/payments/provider";

type Query = Record<string, string | string[] | undefined>;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const identifier = /^[a-zA-Z0-9_-]{1,80}$/;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const purchaseOptionsPath = /^\/account\/purchase-options\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const oneOf = (...values: string[]) => (value: string) => values.includes(value);
const matches = (pattern: RegExp) => (value: string) => pattern.test(value);
type ReturnRoute = { query: Record<string, (value: string) => boolean>; hash?: RegExp };
const routes: Record<string, ReturnRoute> = {
  "/contact": { query: {}, hash: /^#message$/ },
  "/account/entries": { query: { item: matches(slug), entry: matches(identifier), viewed: matches(identifier), filter: oneOf("all", "active", "prize", "completion", "completed"), from: oneOf("purchase-options"), resume: oneOf("purchase") } },
  "/account/declined-offers": { query: { offer: matches(uuid), filter: oneOf("active", "prize", "completion", "completed") }, hash: /^#declined-offer-[0-9a-f-]{36}$/i },
  "/account/favorites": { query: { tab: oneOf("favorites", "shared"), share: matches(uuid), item: matches(slug), view: oneOf("available", "declined") }, hash: /^#(?:saved-items-heading|favorite-products)$/ },
  "/account/wallet": { query: { reward: matches(slug), rewardId: matches(uuid), via: oneOf("purchase"), orderFilter: oneOf("processing", "fulfilled", "exceptions", "payment"), view: oneOf("history", "card"), panel: oneOf("methods", "card", "funding", "transactions", "deposits"), rewards: oneOf("ready", "used", "expired", "history"), tile: oneOf("1"), card: matches(uuid), rewardHistory: oneOf("1"), from: matches(slug), browse: value => productBrowseReturnPath(value) !== null, entry: matches(/^ent_[a-f0-9]{32}$/i), quantity: value => parseEntryQuantity(value) !== null, transaction: matches(uuid), walletView: oneOf("1"), choice: matches(uuid), deposit: matches(depositRequestKeyPattern), depositRow: matches(depositRequestKeyPattern) }, hash: /^#(?:reward-pass|ready-rewards|reward-history|wallet-reward-[0-9a-f-]{36}|add-funds|purchase-deposit|payment-methods|payment-deposits|wallet-add-card|transactions|transaction-[0-9a-f-]{36})$/i },
  "/account/crew": { query: { member: value => uuid.test(value) || /^sample-(?:Maya|Daniel|Ari|Leo)$/.test(value), pick: matches(slug), tab: oneOf("crew", "requests", "picks", "groups", "privacy", "add"), entry: matches(/^ent_[a-f0-9]{32}$/i), filter: oneOf("active"), request: matches(uuid), invite: matches(uuid), design: matches(/^[1-8]$/) }, hash: /^#(?:sharing|crew-intro|crew-groups|crew-privacy|crew-request-[0-9a-f-]{36})$/i },
  "/account/crew/display": { query: {} },
  "/account/notifications": { query: { filter: oneOf("action", "account", "activity", "orders", "crew") }, hash: /^#notification-tickets-filters$/ },
  "/account/security": { query: {} },
  "/account/profile": { query: {}, hash: /^#personal-details-heading$/ },
  "/account/payment-methods": { query: {} },
  "/account/orders": { query: { filter: oneOf("all", "processing", "fulfilled", "exceptions", "payment"), order: matches(identifier), rewardId: matches(uuid), support: oneOf("report"), details: oneOf("1") }, hash: /^#(?:fulfillment-records|order-[a-zA-Z0-9_-]{1,80})$/ },
  "/account/results": { query: {} },
  "/support": { query: { case: matches(uuid), transaction: matches(uuid), walletView: oneOf("1"), rewardId: matches(uuid), deposit: matches(depositRequestKeyPattern), view: oneOf("inbox"), from: oneOf("wallet", "order"), orderFilter: oneOf("processing", "fulfilled", "exceptions", "payment"), page: matches(/^[1-9]\d{0,4}$/), messages: matches(/^[1-9]\d{0,4}$/), details: oneOf("1") }, hash: /^#(?:conversation|case-list|report-problem)$/ },
};

function returnRoute(path: string): ReturnRoute | undefined {
  if (purchaseOptionsPath.test(path)) return {
    query: { option: matches(/^ent_[a-f0-9]{32}$/), resume: oneOf("wallet"), choice: matches(uuid), decline: oneOf("confirm"), receipt: matches(uuid) },
  };
  return routes[path] ?? (/^\/account\/entries\/ent_[a-f0-9]{32}$/i.test(path) ? {
    query: { entries: oneOf("first", "open"), quantity: selected => parseEntryQuantity(selected) !== null, review: oneOf("entry"), filter: oneOf("active") },
    hash: /^#(?:entry-details-intro|add-entries-title|additional-entry-checkout|saved-entry-rail|entry-crew-share)$/,
  } : undefined);
}

/** Navigation only: the destination must still authorize every record after login. */
export function accountReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const url = new URL(value, "https://navigation.invalid");
  const route = returnRoute(url.pathname);
  // Reject normalized paths, duplicate selectors, unknown keys and foreign origins.
  if (!route || url.origin !== "https://navigation.invalid" || value.split(/[?#]/, 1)[0] !== url.pathname || (url.hash && !route.hash?.test(url.hash))) return null;
  const seen = new Set<string>();
  for (const [key, entry] of url.searchParams) {
    if (seen.has(key) || !Object.hasOwn(route.query, key) || !route.query[key](entry)) return null;
    seen.add(key);
  }
  if (url.pathname === "/account/wallet" && url.searchParams.has("walletView") &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("transaction"))) return null;
  if (url.pathname === "/support" && url.searchParams.has("walletView") && !url.searchParams.has("transaction") && !url.searchParams.has("case")) return null;
  if (url.searchParams.has("details")) {
    if (url.pathname === "/account/orders" && !(url.searchParams.has("order") || url.searchParams.has("rewardId"))) return null;
    if (url.pathname === "/support" && (url.searchParams.get("from") !== "order" ||
      !(url.searchParams.has("transaction") || url.searchParams.has("rewardId") || url.searchParams.has("case")))) return null;
  }
  if (url.pathname === "/account/wallet" && url.searchParams.has("via") && !url.searchParams.has("rewardId")) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("panel") && url.searchParams.get("view") !== "history") return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("quantity") &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("from") || url.searchParams.has("entry"))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("browse") &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("from") || url.searchParams.has("entry"))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("choice") &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("from") || !url.searchParams.has("entry") || url.searchParams.has("reward") || url.searchParams.has("rewardId"))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("deposit") &&
    (url.searchParams.get("view") !== "history" || url.searchParams.has("reward") || url.searchParams.has("rewardId"))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("depositRow") &&
    (url.searchParams.get("panel") !== "deposits" || url.searchParams.has("deposit") || url.searchParams.has("reward") || url.searchParams.has("rewardId"))) return null;
  return value;
}

/** Build from known page selectors only; never forward arbitrary query data. */
export function accountPageReturnPath(path: string, query: Query = {}, hash = ""): string {
  const route = returnRoute(path);
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
