import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import BrowsePage from "./page";

const account = vi.hoisted(() => ({ get: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: account.get }));

vi.mock("@/components/ui/FavoriteButton", () => ({ FavoriteButton: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(() => { cleanup(); account.get.mockResolvedValue(null); });

describe("Browse search results", () => {
  test("keeps the full retailer layout on All but collapses both controls on category pages", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Browse every product" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Shop by retailer category" }).closest("details")?.open).toBe(true);
    expect(screen.getByRole("complementary", { name: "Filter products" })).toBeTruthy();
    cleanup();

    render(await BrowsePage({ searchParams: Promise.resolve({ sort: "ending-soon" }) }));
    expect(screen.getByRole("heading", { name: "Ending Soon" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Shop by retailer category" }).closest("details")?.open).toBe(false);
    expect(screen.getByText("Filter & sort").closest("details")?.open).toBe(false);
    expect(screen.queryByRole("complementary", { name: "Filter products" })).toBeNull();
    expect(screen.getAllByRole("article").length).toBeGreaterThan(0);
  });

  test("shows matching catalog items for familiar wording", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "TV" }) }));

    expect(screen.getByRole("heading", { name: "Search results" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Samsung 50.*M70H Mini LED 4K Smart TV/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /65-inch LG OLED evo AI C6 4K Smart TV/i })).toBeTruthy();
  });

  test("hides this account's closed demo prizes in browsing and restores them after reset", async () => {
    const base = { title: "", retailer: "", image: "", rewardKind: "digital", priceCents: 100, paidCents: 100, remainingCents: 0, availability: "open" };
    account.get.mockResolvedValue({ activity: { source: "stored", activity: [
      { ...base, slug: "samsung-m70h-tv", status: "prize" },
      { ...base, slug: "nike-court-shot-shoes", status: "completion" },
      { ...base, slug: "babys-essentials-bundle", status: "completed" },
      { ...base, slug: "publix-100-gift-card", status: "active" },
    ] } });
    render(await BrowsePage({ searchParams: Promise.resolve({ sort: "ending-soon" }) }));
    expect(screen.queryByRole("link", { name: /Samsung 50.*M70H/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Nike.*Court Shot/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Baby's Essentials Bundle/i })).toBeNull();
    cleanup();
    account.get.mockResolvedValue({ activity: { source: "customer-empty", activity: [] } });
    render(await BrowsePage({ searchParams: Promise.resolve({ sort: "ending-soon" }) }));
    expect(screen.getByRole("link", { name: /Samsung 50.*M70H/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Nike.*Court Shot/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Baby's Essentials Bundle/i })).toBeTruthy();
  });

  test("removes a won Walmart card from its gift-card listings until the demo reset", async () => {
    const params = { category: "groceries", retailer: "Walmart", type: "gift-cards" };
    account.get.mockResolvedValue({ activity: { source: "stored", activity: [{ slug: "walmart-100-gift-card", status: "prize" }] } });
    render(await BrowsePage({ searchParams: Promise.resolve(params) }));
    expect(screen.queryByRole("link", { name: /\$100 Walmart Gift Card/i })).toBeNull();
    cleanup();
    account.get.mockResolvedValue({ activity: { source: "customer-empty", activity: [] } });
    render(await BrowsePage({ searchParams: Promise.resolve(params) }));
    expect(screen.getByRole("link", { name: /\$100 Walmart Gift Card/i })).toBeTruthy();
  });

  test("shows the product-request path when nothing matches", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "kayak" }) }));

    expect(screen.getByRole("heading", { name: "We don't have “kayak” in the catalog yet." })).toBeTruthy();
    expect(screen.getByText(/Shopping should never feel like a/i)).toBeTruthy();
    expect(screen.getByText("loss.").className).toContain("text-[#31e800]");
    expect(screen.getByRole("link", { name: /Tell us what you'd like to see/i }).getAttribute("href")).toBe("/contact/product-request?product=kayak");
  });

  test.each(["auto", "spark plugs"])("takes %s to the Automotive directory from either search box", async query => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: query }) }));
    const matches = within(screen.getByRole("region", { name: "Matching retailer categories" }));
    expect(matches.getByRole("link", { name: /Automotive/ }).getAttribute("href"))
      .toBe("/browse?partnerCategory=automotive");
    expect(screen.getByText(/0 products · 1 matching retailer category for/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: `No current product listings match “${query}” yet.` })).toBeTruthy();
  });

  test("finds baby essentials using everyday language", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "baby stuff" }) }));
    expect(screen.getByRole("link", { name: /Baby's Essentials Bundle/i }).getAttribute("href"))
      .toBe("/items/babys-essentials-bundle?from=%2Fbrowse%3Fq%3Dbaby%2Bstuff");
  });

  test("uses the available mobile width for one search result", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "dyson v8" }) }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Products" }).className).toContain("grid-cols-1");
  });

  test.each(["everyday-items", "groceries", "electronics", "home-essentials", "ending-soon"])(
    "puts pictured items before gift cards in %s",
    async category => {
      render(await BrowsePage({ searchParams: Promise.resolve(category === "ending-soon" ? { sort: "ending-soon" } : { category }) }));
      const headings = Array.from(document.querySelectorAll('section[aria-label="Products"] article h2'), heading => heading.textContent ?? "");
      const firstGiftCard = headings.findIndex(title => /gift card|bed bath & beyond \+ wayfair bundle/i.test(title));
      expect(firstGiftCard).toBeGreaterThan(0);
      expect(headings.slice(0, firstGiftCard).every(title => !/gift card/i.test(title))).toBe(true);
      expect(headings.slice(firstGiftCard).every(title => /gift card|bed bath & beyond \+ wayfair bundle/i.test(title))).toBe(true);
    },
  );

  test("clearly identifies indirect retailer results as gift cards", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "reciprocating saw" }) }));
    expect(screen.getAllByText("Related retailer gift card · Check retailer product availability.")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /\$25 The Home Depot Gift Card/i }).getAttribute("href"))
      .toBe("/items/home-depot-25-gift-card?from=%2Fbrowse%3Fq%3Dreciprocating%2Bsaw");
    expect(screen.queryByRole("heading", { name: "Reciprocating Saw" })).toBeNull();
  });

  test("keeps a search term when browsing retailer categories without a duplicate product-category row", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "paper towels" }) }));
    expect(screen.queryByRole("navigation", { name: "Browse categories" })).toBeNull();
    const categories = within(screen.getByRole("navigation", { name: "Retailer categories" }));
    fireEvent.click(categories.getByRole("button", { name: "Groceries" }));
    const panel = within(document.getElementById("retailer-category-panel")!);
    const publix = new URL(panel.getByRole("link", { name: /Publix/ }).getAttribute("href") ?? "", "https://example.test");
    expect(publix.searchParams.get("partnerCategory")).toBe("groceries");
    expect(publix.searchParams.get("q")).toBe("paper towels");
    expect(screen.getAllByText("Related retailer gift card · Check retailer product availability.")).toHaveLength(9);
  });

  test("does not claim the whole catalog is empty when only a selected category has no matches", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "paper towels", category: "gas" }) }));
    expect(screen.getByRole("heading", { name: "No “paper towels” matches in Gas." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See all search results" }).getAttribute("href")).toBe("/browse?q=paper+towels");
  });

  test("filters to a current retailer and keeps product-type selection", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "everyday-items", retailer: "Walmart", type: "pictured" }) }));
    expect(screen.getByText("1 product shown")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Baby's Essentials Bundle/i })).toBeTruthy();
    expect(screen.getByText(/Showing Walmart/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View all in this category" }).getAttribute("href")).toBe("/browse?category=everyday-items&type=pictured");
  });

  test("product links preserve the chosen category and filters for a return trip", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "groceries", type: "gift-cards", available: "1" }) }));
    expect(screen.getByRole("link", { name: /\$100 Walmart Gift Card/i }).getAttribute("href"))
      .toBe("/items/walmart-100-gift-card?from=%2Fbrowse%3Fcategory%3Dgroceries%26type%3Dgift-cards%26available%3D1");
  });

  test("shows an honest no-offer state for a directory-only retailer", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "everyday-items", retailer: "AutoZone®" }) }));
    expect(screen.getByRole("heading", { name: "No current AutoZone® offer matches here." })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Clear filters" }).some(link => link.getAttribute("href") === "/browse?category=everyday-items")).toBe(true);
  });

  test("drills from a partner category into only its current offers", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ partnerCategory: "pharmacy" }) }));
    const retailerNav = within(screen.getByRole("navigation", { name: "Retailer categories" }));
    expect(retailerNav.getByRole("button", { name: "Pharmacy" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("4 products shown")).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.queryByRole("link", { name: /Walmart Gift Card/i })).toBeNull();
  });

  test("keeps directory-only retailers visible without inventing an offer", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ partnerCategory: "pharmacy", retailer: "Walgreens" }) }));
    expect(screen.getByRole("heading", { name: "No current Walgreens offer matches here." })).toBeTruthy();
  });

  test("filters by the displayed prize value while retaining the inline search", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ type: "gift-cards", maxValue: "25" }) }));
    const cards = screen.getAllByRole("article");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every(card => /\$25 value/.test(card.textContent ?? ""))).toBe(true);
    expect(screen.getAllByRole("searchbox", { name: "Search products & categories" })).toHaveLength(2);
  });
});
