export type BreadcrumbItem = { label: string; href?: string };

const accountRoot: BreadcrumbItem = { label: "Your Account", href: "/account/entries" };

const pageLabels: Record<string, string> = {
  about: "About Us",
  browse: "Browse the Marketplace",
  contact: "Contact Us",
  faq: "FAQ",
  "free-entry": "Free-entry information",
  "how-it-works": "How It Works",
  login: "Sign In",
  privacy: "Privacy Policy",
  "responsible-participation": "Responsible Participation",
  signup: "Create Account",
  support: "Help Center",
  terms: "Terms of Service",
};

function humanize(segment: string) {
  try {
    return decodeURIComponent(segment).replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
  } catch {
    return segment.replaceAll("-", " ");
  }
}

/** Route-level wayfinding; no customer data is used to build these links. */
export function breadcrumbItems(pathname: string, searchParams: URLSearchParams): BreadcrumbItem[] {
  if (pathname === "/") return [];
  const segments = pathname.split("/").filter(Boolean);
  const [root, second, third] = segments;
  if (root === "account") {
    if (!second || second === "entries") return [{ label: "My Activity" }];
    if (second === "wallet") {
      const rewardRoot: BreadcrumbItem = { label: "Gift Cards & Rewards", href: "/account/wallet" };
      if (searchParams.has("reward")) return [accountRoot, rewardRoot, { label: "Reward details" }];
      if (searchParams.get("view") === "card") return [accountRoot, { label: "Wallet & Transactions", href: "/account/wallet?view=history" }, { label: "Add Card" }];
      if (searchParams.get("view") === "history") return [accountRoot, { label: "Wallet & Transactions" }];
      return [accountRoot, { label: "Gift Cards & Rewards" }];
    }
    if (second === "profile") return [accountRoot, { label: "Account & Security", href: "/account/security" }, { label: "Edit Profile" }];
    if (second === "security") return [accountRoot, { label: "Account & Security" }];
    if (second === "orders") return [accountRoot, { label: "Orders & Fulfillment" }];
    if (second === "crew") return [accountRoot, { label: "Your Crew" }];
    if (second === "notifications") return [accountRoot, { label: "Notifications" }];
    if (second === "preview") return [accountRoot, { label: third ? humanize(third) : "Preview" }];
    return [accountRoot, { label: humanize(second) }];
  }
  if (root === "browse") {
    const category = searchParams.get("category");
    if (category) return [{ label: "Browse the Marketplace", href: "/browse" }, { label: humanize(category) }];
    if (searchParams.has("q")) return [{ label: "Search results" }];
    if (searchParams.get("sort") === "ending-soon") return [{ label: "Ending Soon" }];
    return [{ label: "Browse the Marketplace" }];
  }
  if (root === "items") return [{ label: "Browse the Marketplace", href: "/browse" }, { label: second ? humanize(second) : "Product details" }];
  if (root === "rewards") return [{ label: "Popular Rewards", href: "/#popular-rewards" }, { label: second ? humanize(second) : "Retailer" }];
  if (root === "contact" && second === "product-request") return [{ label: "Contact Us", href: "/contact" }, { label: "Suggest a Product" }];
  if (root === "free-entry" && second === "print") return [{ label: "Free-entry information", href: "/free-entry" }, { label: "Print Form" }];
  if (root === "business-preview") return [{ label: "Business Preview", href: "/about" }, { label: second ? humanize(second) : "Retailer" }];
  return [{ label: pageLabels[root] ?? humanize(root) }];
}
