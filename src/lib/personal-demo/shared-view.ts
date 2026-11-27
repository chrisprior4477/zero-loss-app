// Only visitor-facing shopping destinations can follow someone to another screen.
// In particular, a return URL, invite token or value from an account form must
// never become part of the shared view.
const pages =
  /^\/(?:|browse|rewards\/[a-z0-9-]+|items\/[a-z0-9-]+|faq|about|how-it-works|account(?:\/(?:entries(?:\/ent_[a-f0-9]+)?|favorites|orders|declined-offers|purchase-options\/[a-z0-9-]+|wallet|notifications))?)$/;
const option = /^[a-zA-Z0-9_.,-]{1,90}$/;
const keys = new Set([
  "filter",
  "view",
  "panel",
  "tab",
  "sort",
  "category",
  "collection",
  "partnerCategory",
  "ticketsLeft",
  "groceryIdea",
  "batch",
  "retailer",
  "brand",
  "min",
  "max",
  "type",
  "available",
  "quantity",
  "reward",
  "rewardId",
  "rewards",
  "option",
  "optionId",
  "entry",
  "entries",
  "order",
  "transaction",
  "group",
  "page",
  "status",
  "prize",
  "from",
  "orderFilter",
  "fromOrders",
  "via",
  "tile",
  "rewardHistory",
  "review",
  "walletView",
  "landing",
  "alerts",
  "notice",
  "receipt",
  "checkout",
  "choice",
  "deposit",
  "depositRow",
  "maxValue",
  "minValue",
  "value",
  "kind",
  "onlyAvailable",
]);
const origin = "https://demo.invalid";

export function sharedDestination(input: string): string | null {
  if (input.length > 4096 || !input.startsWith("/") || /[\\\u0000-\u001f]/.test(input)) return null;
  let url: URL;
  try {
    url = new URL(input, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin || !pages.test(url.pathname)) return null;
  const result = new URL(url.pathname, origin);
  for (const [key, value] of url.searchParams) {
    if (keys.has(key) && option.test(value)) result.searchParams.set(key, value);
    if (
      ["q", "retailer", "subcategory"].includes(key) &&
      url.pathname === "/browse" &&
      /^[\p{L}\p{N} .’'$&-]{1,80}$/u.test(value)
    )
      result.searchParams.set(key, value);
  }
  result.searchParams.sort();
  if (/^#[a-z][a-z0-9_-]{0,90}$/.test(url.hash)) result.hash = url.hash;
  const path = result.pathname + result.search + result.hash;
  return path.length <= 600 ? path : null;
}

const surfaces = ["page", "menu", "categories", "filters", "info"] as const;
export type Surface = (typeof surfaces)[number];
export type DemoView = {
  seq: number;
  source: string;
  surface: Surface;
  url: string;
  mark: string;
  x: number;
  y: number;
};
export type ViewMessage = Omit<DemoView, "seq"> & { code: string };
export function readViewMessage(value: string): ViewMessage | null {
  try {
    const { code, url, mark, x, y, source, surface } = JSON.parse(value);
    if (
      typeof code !== "string" ||
      !/^\d{4}$/.test(code) ||
      typeof url !== "string" ||
      sharedDestination(url) !== url ||
      typeof mark !== "string" ||
      !/^[a-z0-9]{0,20}$/.test(mark) ||
      typeof source !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(source) ||
      !surfaces.includes(surface) ||
      ![x, y].every((n) => Number.isInteger(n) && n >= 0 && n <= 1000)
    )
      return null;
    return { code, url, mark, x, y, source, surface };
  } catch {
    return null;
  }
}
