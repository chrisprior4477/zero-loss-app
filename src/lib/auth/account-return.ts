import { parseEntryQuantity } from "@/lib/entries/quantity";
import { maxNestedBrowseReturnLength, productBrowseReturnPath } from "@/lib/catalog/product-return";
import { depositRequestKeyPattern } from "@/lib/payments/provider";

import { supportRewardReturn, supportMessageAnchor } from "@/lib/support/references";
import { validNotice } from "@/lib/account/notification-return";
import { entryFundingReturnPath, purchaseOptionReturnPath } from "@/lib/wallet/funding-navigation";

type Query = Record<string, string | string[] | undefined>;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const identifier = /^[a-zA-Z0-9_-]{1,80}$/;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const purchaseOptionsPath = /^\/account\/purchase-options\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const oneOf = (...values: string[]) => (value: string) => values.includes(value);
const alertFilter = oneOf("all", "action", "account", "activity", "orders", "crew");
const matches = (pattern: RegExp) => (value: string) => pattern.test(value);
type ReturnRoute = { query: Record<string, (value: string) => boolean>; hash?: RegExp };
const routes: Record<string, ReturnRoute> = {
  "/contact": { query: {}, hash: /^#(?:message|recent-conversations-heading)$/ },
  "/free-entry": { query: { offering: matches(slug), from: value => productBrowseReturnPath(value) !== null, share: matches(uuid), quantity: value => parseEntryQuantity(value) !== null }, hash: /^#free-entry-intro$/ },
  "/account/entries": { query: { legacyEntry: oneOf("1"), alerts: alertFilter, notice: validNotice, fromUpdates: oneOf("1"), grouped: oneOf("1"), transaction: matches(uuid), walletView: oneOf("1"), fromOrders: oneOf("1"), orderFilter: oneOf("all", "processing", "fulfilled", "exceptions", "payment"), item: matches(slug), prize: matches(slug), entry: matches(identifier), viewed: matches(identifier), viewedReward: matches(uuid), checkout: matches(slug), receipt: matches(uuid), filter: oneOf("all", "active", "prize", "completion", "completed"), from: oneOf("purchase-options"), resume: oneOf("purchase") }, hash: /^#my-activity-filters$/ },
  "/account/declined-offers": { query: { alerts: alertFilter, notice: validNotice, offer: matches(uuid), prize: matches(slug), filter: oneOf("active", "prize", "completion", "completed"), transaction: matches(uuid), walletView: oneOf("1"), fromOrders: oneOf("1"), orderFilter: oneOf("all", "processing", "fulfilled", "exceptions", "payment") }, hash: /^#declined-offer-[0-9a-f-]{36}$/i },
  "/account/favorites": { query: { tab: oneOf("favorites", "shared"), share: matches(uuid), item: matches(slug), view: oneOf("available", "declined"), watch: oneOf("1") }, hash: /^#(?:saved-items-heading|favorite-products)$/ },
  "/account/wallet": { query: { prize: matches(slug), reward: matches(slug), rewardId: matches(uuid), receipt: matches(uuid), checkout: matches(slug), via: oneOf("purchase", "completed", "orders", "order-notification", "order-selection", "activity-win", "completed-win", "won"), orderFilter: oneOf("all", "processing", "fulfilled", "exceptions", "payment"), fromOrders: oneOf("1"), alerts: alertFilter, notice: validNotice, depositList: oneOf("1"), view: oneOf("history", "card"), panel: oneOf("methods", "card", "funding", "transactions", "deposits"), review: oneOf("entry"), filter: oneOf("active"), entryTransaction: matches(uuid), entryWalletView: oneOf("1"), entryFromOrders: oneOf("1"), entryOrderFilter: oneOf("all", "processing", "fulfilled", "exceptions", "payment"), landing: oneOf("balance"), rewards: oneOf("all", "ready", "used", "expired", "history", "other"), expiredEntry: matches(/^ent_[a-f0-9]{32}$/i), expiredFocus: matches(/^ent_[a-f0-9]{32}$/i), tile: oneOf("1"), card: matches(uuid), rewardHistory: oneOf("1"), from: matches(slug), share: matches(uuid), browse: value => productBrowseReturnPath(value) !== null, entry: matches(/^ent_[a-f0-9]{32}$/i), quantity: value => parseEntryQuantity(value) !== null, transaction: matches(uuid), walletView: oneOf("1"), choice: matches(uuid), deposit: matches(depositRequestKeyPattern), depositRow: matches(depositRequestKeyPattern), weeklyDeposit: matches(depositRequestKeyPattern) }, hash: /^#(?:reward-pass|checkout-gift-cards|ready-rewards|reward-history|wallet-reward-(?:[0-9a-f-]{36}|ent_[a-f0-9]{32})|balance|add-funds|purchase-deposit|payment-methods|payment-deposits|wallet-add-card|weekly-deposit-heading|transactions|transaction-[0-9a-f-]{36})$/i },
  "/account/crew": { query: { member: value => uuid.test(value) || /^sample-(?:Maya|Daniel|Ari|Leo)$/.test(value), pick: matches(slug), tab: oneOf("crew", "requests", "picks", "groups", "privacy", "add"), entry: matches(/^ent_[a-f0-9]{32}$/i), filter: oneOf("active"), request: matches(uuid), invite: matches(uuid), design: matches(/^[1-8]$/) }, hash: /^#(?:sharing|crew-intro|crew-search|crew-groups|crew-privacy|crew-(?:request|group)-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i },
  "/account/crew/display": { query: {}, hash: /^#account-settings-sections$/ },
  "/account/notifications": { query: { filter: oneOf("action", "account", "activity", "orders", "crew"), notice: validNotice }, hash: /^#(?:notifications-intro|notification-tickets-filters|alert-settings|favorite-alert-preference|email-choices)$/ },
  "/account/security": { query: {}, hash: /^#(?:security-controls|sign-out-everywhere|account-settings-sections)$/ },
  "/account/profile": { query: {}, hash: /^#(?:personal-details-heading|contact-details-heading|mailing-address-heading|profile-preferences-heading|personalize-menu(?:-heading)?|account-settings-sections|profile-intro|personalize-logo)$/ },
  "/account/payment-methods": { query: {} },
  "/account/orders": { query: { filter: oneOf("all", "processing", "fulfilled", "exceptions", "payment"), order: matches(identifier), rewardId: matches(uuid), focusReward: matches(uuid), support: oneOf("report"), details: oneOf("1"), from: oneOf("notifications"), alerts: alertFilter, notice: validNotice }, hash: /^#(?:fulfillment-records|order-[a-zA-Z0-9_-]{1,80})$/ },
  "/account/results": { query: {} },
  "/support": { query: { fromUpdates: oneOf("1"), updateCategory: oneOf("support"), case: matches(uuid), rewardReturn: value => supportRewardReturn(value) !== null, messageAnchor: value => supportMessageAnchor(value) !== null, transaction: matches(uuid), walletView: oneOf("1"), rewardId: matches(uuid), deposit: matches(depositRequestKeyPattern), view: oneOf("inbox"), from: oneOf("wallet", "order", "contact"), fromOrders: oneOf("1"), orderFilter: oneOf("all", "processing", "fulfilled", "exceptions", "payment"), page: matches(/^[1-9]\d{0,4}$/), messages: matches(/^[1-9]\d{0,4}$/), details: oneOf("1"), alerts: alertFilter, notice: validNotice, checkoutReturn: value => purchaseOptionReturnPath(value) !== null, entryReturn: value => entryFundingReturnPath(value) !== null, depositList: oneOf("1") }, hash: /^#(?:conversation|case-list|report-problem)$/ },
};

function returnRoute(path: string): ReturnRoute | undefined {
  if (purchaseOptionsPath.test(path)) return {
    query: { option: matches(/^ent_[a-f0-9]{32}$/), alerts: alertFilter, notice: validNotice, resume: oneOf("wallet"), choice: matches(uuid), decline: oneOf("confirm", "undo"), receipt: matches(uuid), transaction: matches(uuid), walletView: oneOf("1"), fromOrders: oneOf("1"), orderFilter: oneOf("all", "processing", "fulfilled", "exceptions", "payment") },
    hash: /^#purchase-option-rail$/,
  };
  return routes[path] ?? (/^\/account\/entries\/ent_[a-f0-9]{32}$/i.test(path) ? {
    query: { entries: oneOf("first", "open"), quantity: selected => parseEntryQuantity(selected) !== null, review: oneOf("entry"), filter: oneOf("active"), transaction: matches(uuid), walletView: oneOf("1"), fromOrders: oneOf("1"), orderFilter: oneOf("all", "processing", "fulfilled", "exceptions", "payment"), alerts: alertFilter, notice: validNotice },
    hash: /^#(?:entry-details-intro|add-entries-title|additional-entry-checkout|saved-entry-rail|entry-crew-share)$/,
  } : undefined);
}

/** Navigation only: the destination must still authorize every record after login. */
export function accountReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > (value.startsWith("/free-entry?") ? maxNestedBrowseReturnLength : 2048) || !value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const url = new URL(value, "https://navigation.invalid");
  const route = returnRoute(url.pathname);
  // Reject normalized paths, duplicate selectors, unknown keys and foreign origins.
  if (!route || url.origin !== "https://navigation.invalid" || value.split(/[?#]/, 1)[0] !== url.pathname || (url.hash && !route.hash?.test(url.hash))) return null;
  const seen = new Set<string>();
  for (const [key, entry] of url.searchParams) {
    if (seen.has(key) || !Object.hasOwn(route.query, key) || !route.query[key](entry)) return null;
    seen.add(key);
  }
  if (url.pathname === "/free-entry" && !seen.has("offering")) return null;
  if (url.pathname === "/account/declined-offers" && ((seen.has("transaction") && !seen.has("offer") && !seen.has("prize")) || (seen.has("walletView") && !seen.has("transaction")))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("depositList") && !(url.searchParams.get("view") === "history" && url.searchParams.has("transaction"))) return null;
  if (url.pathname === "/support" && ((seen.has("rewardReturn") && (!seen.has("rewardId") || !supportRewardReturn(url.searchParams.get("rewardReturn"), url.searchParams.get("rewardId")!))) ||
    (seen.has("messageAnchor") && (!seen.has("case") || !seen.has("messages"))))) return null;
  if (url.pathname === "/support" && (url.searchParams.has("checkoutReturn") || url.searchParams.has("entryReturn") || url.searchParams.has("depositList")) && !(url.searchParams.has("case") || url.searchParams.has("deposit"))) return null;
  if (url.pathname.startsWith("/account/entries/") && (url.searchParams.has("walletView") || url.searchParams.has("fromOrders")) && !url.searchParams.has("transaction")) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("walletView") &&
    !(url.searchParams.get("view") === "history" && (url.searchParams.has("transaction") || url.searchParams.has("deposit")) ||
      (url.searchParams.has("rewardId") || url.searchParams.get("rewards") === "expired" && url.searchParams.has("expiredEntry")) && url.searchParams.has("transaction") && !url.searchParams.has("view") && !url.searchParams.has("via"))) return null;
  if (url.pathname === "/support" && url.searchParams.has("walletView") && !url.searchParams.has("transaction") && !url.searchParams.has("case")) return null;
  if (url.searchParams.has("details")) {
    if (url.pathname === "/account/orders" && !(url.searchParams.has("order") || url.searchParams.has("rewardId"))) return null;
    if (url.pathname === "/support" && (url.searchParams.get("from") !== "order" ||
      !(url.searchParams.has("transaction") || url.searchParams.has("rewardId") || url.searchParams.has("case")))) return null;
  }
  if (url.pathname === "/account/wallet" && url.searchParams.has("via") && !url.searchParams.has("rewardId")) return null;
  if (url.pathname === "/account/wallet" && (seen.has("receipt") || seen.has("checkout"))) {
    const checkoutList = seen.has("checkout") && !seen.has("reward") && !seen.has("rewardId") && !seen.has("via");
    const checkoutCard = !seen.has("checkout") && seen.has("reward") && seen.has("rewardId") && url.searchParams.get("via") === "purchase";
    const allowed = checkoutList ? ["checkout", "receipt", "card"] : ["reward", "rewardId", "via", "receipt"];
    if (!seen.has("receipt") || (!checkoutList && !checkoutCard) || [...seen].some(key => !allowed.includes(key))) return null;
  }
  if (url.pathname === "/account/wallet" && url.searchParams.has("panel") && url.searchParams.get("view") !== "history") return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("quantity") &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("from") || (url.searchParams.has("entry") && url.searchParams.get("review") !== "entry"))) return null;
  if (url.pathname === "/account/wallet" && (url.searchParams.has("browse") || url.searchParams.has("share")) &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("from") || url.searchParams.has("entry"))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("review") &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("from") || !url.searchParams.has("entry") || !url.searchParams.has("quantity"))) return null;
  if (url.pathname === "/account/wallet" && ((url.searchParams.has("entryTransaction") && !url.searchParams.has("review"))
    || (url.searchParams.has("entryWalletView") && !url.searchParams.has("entryTransaction")))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("choice") &&
    (url.searchParams.get("view") !== "history" || !url.searchParams.has("from") || !url.searchParams.has("entry") || url.searchParams.has("reward") || url.searchParams.has("rewardId"))) return null;
  if (url.pathname === "/account/wallet" && url.searchParams.has("deposit") &&
    (url.searchParams.get("view") !== "history" || url.searchParams.has("reward") || url.searchParams.has("rewardId"))) return null;
  if (url.pathname === "/account/wallet" && seen.has("weeklyDeposit") &&
    (url.searchParams.get("view") !== "history" || [...seen].some(key => key !== "view" && key !== "transaction" && key !== "weeklyDeposit"))) return null;
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
