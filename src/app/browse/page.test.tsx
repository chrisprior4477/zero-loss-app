import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import BrowsePage from "./page";
import ProductRequestPage from "../contact/product-request/page";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
// Full-directory integration renders hundreds of cards in jsdom.
vi.setConfig({ testTimeout: 20000 });

const account = vi.hoisted(() => ({ get: vi.fn().mockResolvedValue(null) }));
const availability = vi.hoisted(() => vi.fn().mockResolvedValue(null));
vi.mock("@/lib/catalog/availability-reader", () => ({ getOfferingAvailability: availability }));

test("the Headphones menu filters Electronics and preserves its return path", async () => {
  render(await BrowsePage({ searchParams: Promise.resolve({ category: "electronics", subcategory: "Headphones" }) }));
  expect(screen.getByRole("heading", { name: "Headphones" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Sony WH-1000XM5 Wireless Headphones/ }).getAttribute("href")).toContain("subcategory%3DHeadphones");
  expect(screen.queryByRole("link", { name: /LG OLED/ })).toBeNull();
  expect(screen.queryByRole("link", { name: /Fujifilm/ })).toBeNull();
  expect(screen.queryByRole("link", { name: /JBL Flip/ })).toBeNull();
  expect(screen.getAllByRole("link", { name: "Clear filters" })[0].getAttribute("href")).toBe("/browse?category=electronics#search-results");
});
vi.mock("@/lib/account/context", () => ({ getAccountContext: account.get }));

vi.mock("@/components/ui/FavoriteButton", () => ({ FavoriteButton: () => null }));
const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
beforeEach(() => {
  navigation.push.mockClear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; } });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); account.get.mockResolvedValue(null); availability.mockResolvedValue(null); });
const topOptions = () => within(screen.getByRole("group", { name: "Browse options at the top" }));

describe("Browse search results", () => {
  test.each([
    ["Best Buy one hundred dollars", [100, 75, 50, 25]],
    ["Best Buy seventy-five dollar gift cards", [75, 50, 25]],
    ["Walmart $100", [100, 75, 50, 25]],
  ])("shows the requested gift-card amount first, then lower values for %s", async (q, amounts) => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q }) }));
    const cards = within(screen.getByRole("region", { name: "Products" })).getAllByRole("heading").map(card => card.textContent);
    const retailer = q.startsWith("Best Buy") ? "Best Buy" : "Walmart";
    const expected = amounts.map(amount => `$${amount} ${retailer} Gift Card`);
    expect(cards[0]).toBe(expected[0]);
    expect(cards.filter(title => expected.includes(title))).toEqual(expected);
    expect(screen.getByText(/Includes lower-value gift cards/)).toBeTruthy();
    if (amounts[0] === 75) expect(screen.queryByRole("heading", { name: "$100 Best Buy Gift Card" })).toBeNull();
  });

  test("finds the closed $100 Best Buy denomination and leaves entry links on open cards", async () => {
    availability.mockResolvedValue(Object.fromEntries([100, 75, 50, 25].map(value => {
      const slug = `best-buy-${value}-gift-card`;
      const capacity = value * 3;
      const remaining = value === 100 ? 0 : 1;
      return [slug, { slug, capacity, sold: capacity - remaining, remaining, entryPriceCents: 100 }];
    })));
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "Best Buy one hundred dollars", minValue: "50" }) }));
    const cards = within(screen.getByRole("region", { name: "Products" })).getAllByRole("heading");
    expect(cards.map(card => card.textContent)).toEqual(["$100 Best Buy Gift Card", "$75 Best Buy Gift Card", "$50 Best Buy Gift Card"]);
    const fullCard = within(cards[0].closest("article")!);
    expect(fullCard.getByText("No open entries")).toBeTruthy();
    expect(fullCard.queryByRole("link")).toBeNull();
    expect(within(cards[1].closest("article")!).getByRole("link")).toBeTruthy();
    expect(screen.getByText(/Requested value \$100/)).toBeTruthy();
    cleanup();
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "Best Buy", category: "gift-cards", available: "1" }) }));
    expect(screen.queryByRole("heading", { name: "$100 Best Buy Gift Card" })).toBeNull();
    expect(screen.getByRole("heading", { name: "$75 Best Buy Gift Card" })).toBeTruthy();
  });

  test("both Ending Soon bars share a voice draft and clear the search inside the current filters", async () => {
    let speak!: (text: string) => void;
    vi.stubGlobal("SpeechRecognition", class {
      onresult?: (event: unknown) => void;
      start() { speak = text => this.onresult?.({ results: [[{ transcript: text }]] }); }
      stop() {}
    });
    render(await BrowsePage({ searchParams: Promise.resolve({ sort: "ending-soon", maxValue: "100", q: "Walmart", batch: "2" }) }));
    const top = within(screen.getByRole("search", { name: "Search Ending Soon at the top" }));
    const bottom = within(screen.getByRole("search", { name: "Search Ending Soon at the bottom" }));
    fireEvent.click(bottom.getByRole("button", { name: "Start voice search" }));
    act(() => speak("Walmart one hundred dollars"));
    expect((top.getByRole("searchbox") as HTMLInputElement).value).toBe("Walmart one hundred dollars");
    fireEvent.click(bottom.getByRole("button", { name: "Go to search results" }));
    expect(navigation.push).toHaveBeenLastCalledWith("/browse?sort=ending-soon&maxValue=100&q=Walmart+one+hundred+dollars#search-results", { scroll: false });
    fireEvent.focus(top.getByRole("searchbox"));
    fireEvent.change(top.getByRole("searchbox"), { target: { value: "unsubmitted" } });
    fireEvent.click(top.getByRole("button", { name: "Close search" }));
    expect((bottom.getByRole("searchbox") as HTMLInputElement).value).toBe("Walmart");
    fireEvent.click(bottom.getByRole("button", { name: "Clear search" }));
    expect((top.getByRole("searchbox") as HTMLInputElement).value).toBe("");
    expect(navigation.push).toHaveBeenLastCalledWith("/browse?sort=ending-soon&maxValue=100#ending-soon-search-input", { scroll: false });
  });
  test("Movie Night opens the selected collection and preserves it in product links", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "movie-night" }) }));
    expect(screen.getByRole("heading", { name: "Movie Night" })).toBeTruthy();
    for (const name of [/Samsung 50.*M70H/i, /65-inch LG OLED/i, /\$25 Netflix Gift Card/i, /\$100 Regal Gift Card/i, /\$100 The Popcorn Factory Gift Card/i]) {
      const link = screen.getByRole("link", { name });
      expect(new URL(link.getAttribute("href")!, "https://example.test").searchParams.get("from")).toBe(`/browse?category=movie-night#${link.closest("article")!.id}`);
    }
    expect(screen.queryByRole("link", { name: /Dyson V8/i })).toBeNull();
  });
  test("finds a completed Samsung result in this account without offering another entry or claiming it is missing", async () => {
    const activity = storedActivityFixture();
    Object.assign(activity.activity[1], { rewardId: "samsung-reward", rewardStatus: "ready", rewardClaimedAt: "2026-10-25T12:00:00Z" });
    account.get.mockResolvedValue({ activity });
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "Samsung" }) }));
    expect(screen.getByRole("heading", { name: "No open offers match “Samsung” here." })).toBeTruthy();
    expect(screen.getByRole("link", { name: /View your reward: Samsung/ }).getAttribute("href")).toBe("/account/wallet?reward=samsung-m70h-tv&rewardId=samsung-reward");
    expect(screen.queryByRole("heading", { name: /in the catalog yet/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Products" })).toBeNull();
  });

  test("search returns an existing purchase option without reopening the offer", async () => {
    account.get.mockResolvedValue({ activity: storedActivityFixture() });
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "nike court shot" }) }));
    expect(screen.getByRole("link", { name: /View your purchase option: Nike/ }).getAttribute("href")).toBe("/account/purchase-options/nike-court-shot-shoes");
  });

  test("lands at two compact discovery controls on All and Ending Soon", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Browse every product" })).toBeTruthy();
    expect(topOptions().getByRole("button", { name: "Categories" })).toBeTruthy();
    expect(topOptions().getByRole("button", { name: "Filter & sort" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(screen.getByRole("region", { name: "Products" })).getAllByRole("article")).toHaveLength(24);
    const browseFooter = within(screen.getByRole("region", { name: "Didn’t find what you were looking for?" }));
    expect(browseFooter.getByRole("button", { name: "Start voice search" })).toBeTruthy();
    const footerOptions = within(browseFooter.getByRole("group", { name: "Browse options at the bottom" }));
    fireEvent.click(footerOptions.getByRole("button", { name: "Categories" }));
    expect(screen.getByRole("dialog", { name: "Find your category" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close browse options" }));
    fireEvent.click(footerOptions.getByRole("button", { name: "Filter & sort" }));
    expect(screen.getByRole("dialog", { name: "Filter & sort" })).toBeTruthy();
    expect(browseFooter.getByRole("link", { name: "Show 24 more prizes" }).getAttribute("href")).toMatch(/^\/browse\?batch=2#prize-/);
    cleanup();

    render(await BrowsePage({ searchParams: Promise.resolve({ sort: "ending-soon" }) }));
    expect(screen.getByRole("heading", { name: "Ending Soon" })).toBeTruthy();
    expect(topOptions().getByRole("button", { name: "Categories" })).toBeTruthy();
    expect(topOptions().getByRole("button", { name: "Filter & sort" })).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Filter products" })).toBeNull();
    expect(screen.getAllByRole("article")).toHaveLength(24);
    expect(screen.getAllByRole("searchbox", { name: "Search all Ending Soon prizes" })).toHaveLength(2);
    const more = screen.getByRole("link", { name: "Show 24 more prizes" }).getAttribute("href")!;
    expect(more).toMatch(/batch=2#prize-/);
    cleanup();
    render(await BrowsePage({ searchParams: Promise.resolve({ sort: "ending-soon", batch: "2" }) }));
    expect(screen.getAllByRole("article")).toHaveLength(48);
    expect(document.getElementById(more.split("#")[1])).toBeTruthy();
    const card = screen.getAllByRole("article")[34];
    const productHref = new URL(within(card).getByRole("link").getAttribute("href")!, "https://example.test");
    expect(productHref.searchParams.get("from")).toBe(`/browse?sort=ending-soon&batch=2#${card.id}`);
  });

  test("loads the next 24 in a filtered category, preserves the card return, and starts a footer voice search at batch one", async () => {
    let speak!: (text: string) => void;
    vi.stubGlobal("SpeechRecognition", class {
      onresult?: (event: unknown) => void;
      start() { speak = text => this.onresult?.({ results: [[{ transcript: text }]] }); }
      stop() {}
    });
    const query = { category: "gift-cards", sort: "value-high", q: "gift card", maxValue: "100" };
    render(await BrowsePage({ searchParams: Promise.resolve(query) }));
    const more = screen.getByRole("link", { name: "Show 24 more prizes" }).getAttribute("href")!;
    const next = new URL(more, "https://example.test");
    expect(Object.fromEntries(next.searchParams)).toEqual({ ...query, batch: "2" });
    cleanup();

    render(await BrowsePage({ searchParams: Promise.resolve({ ...query, batch: "2" }) }));
    const cards = within(screen.getByRole("region", { name: "Products" })).getAllByRole("article");
    expect(cards).toHaveLength(48);
    expect(`#${cards[24].id}`).toBe(next.hash);
    const card = cards[34];
    const product = new URL(within(card).getByRole("link").getAttribute("href")!, "https://example.test");
    expect(product.searchParams.get("from")).toBe(`${next.pathname}${next.search}#${card.id}`);
    const footer = within(screen.getByRole("search", { name: "Search browse results at the bottom" }));
    fireEvent.click(footer.getByRole("button", { name: "Start voice search" }));
    act(() => speak("Walmart one hundred dollars"));
    expect(footer.getByRole("searchbox")).toHaveProperty("value", "Walmart one hundred dollars");
    expect(navigation.push).not.toHaveBeenCalled();
    fireEvent.click(footer.getByRole("button", { name: "Go to search results" }));
    expect(navigation.push).toHaveBeenLastCalledWith("/browse?category=gift-cards&sort=value-high&maxValue=100&q=Walmart+one+hundred+dollars#search-results", { scroll: false });
  });

  test("shows matching catalog items for familiar wording", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "TV" }) }));

    expect(screen.getByRole("heading", { name: "Search results" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Samsung 50.*M70H Mini LED 4K Smart TV/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /65-inch LG OLED evo AI C6 4K Smart TV/i })).toBeTruthy();
  });

  test("chooses a category and sorts its results without losing the applied search", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "Best Buy" }) }));
    fireEvent.click(topOptions().getByRole("button", { name: "Categories" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Gift Cards.*Browse prizes/ }));
    expect(navigation.push).toHaveBeenLastCalledWith("/browse?category=gift-cards&q=Best+Buy#search-results", { scroll: false });

    cleanup();
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "gift-cards", q: "Best Buy", maxValue: "75" }) }));
    expect(screen.getByRole("searchbox", { name: "Search Gift Cards" })).toHaveProperty("value", "Best Buy");
    fireEvent.click(topOptions().getByRole("button", { name: /Filter & sort/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("radio", { name: "Highest prize value" }));
    expect(navigation.push).toHaveBeenLastCalledWith("/browse?maxValue=75&category=gift-cards&q=Best+Buy&sort=value-high#search-results", { scroll: false });
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

  test.each([
    { q: "kayak" },
    { q: "kayak", minValue: "5", maxValue: "25", sort: "value-high", type: "pictured", available: "1", retailer: "Best Buy" },
  ])("returns from a product request to the same search and filters: %j", async query => {
    render(await BrowsePage({ searchParams: Promise.resolve(query) }));

    expect(screen.getByRole("heading", { name: "retailer" in query ? "No “kayak” matches in Best Buy." : "We don't have “kayak” in the catalog yet." })).toBeTruthy();
    expect(screen.getByText(/Shopping should never feel like a/i)).toBeTruthy();
    expect(screen.getByText("loss.").className).toContain("text-[#31e800]");
    const request = new URL(screen.getByRole("link", { name: /Tell us what you'd like to see/i }).getAttribute("href")!, "https://example.test");
    expect(request.pathname).toBe("/contact/product-request");
    expect(request.searchParams.get("product")).toBe("kayak");
    cleanup();
    render(await ProductRequestPage({ searchParams: Promise.resolve(Object.fromEntries(request.searchParams)) }));
    expect((screen.getByLabelText("What would you like to see?") as HTMLInputElement).value).toBe("kayak");
    const back = new URL(screen.getByRole("link", { name: /Back to search/ }).getAttribute("href")!, "https://example.test");
    expect(back.pathname).toBe("/browse");
    expect(Object.fromEntries(back.searchParams)).toEqual(query);
    expect(back.hash).toBe("#search-results");
  });

  test.each(["auto", "spark plugs"])("takes %s to the Automotive directory from either search box", async query => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: query }) }));
    const matches = within(screen.getByRole("region", { name: "Matching retailer categories" }));
    expect(matches.getByRole("link", { name: /Automotive/ }).getAttribute("href"))
      .toBe("/browse?partnerCategory=automotive#search-results");
    expect(screen.getByRole("link", { name: /\$100 AutoZone.*Gift Card/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /\$100 Jiffy Lube.*Gift Card/ })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: `No current product listings match “${query}” yet.` })).toBeNull();
  });

  test("result-page category suggestions retain value, type, availability and sort", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "auto", minValue: "5", maxValue: "25", type: "gift-cards", available: "1", sort: "value-high" }) }));
    const matches = within(screen.getByRole("region", { name: "Matching retailer categories" }));
    const url = new URL(matches.getByRole("link", { name: /Automotive/ }).getAttribute("href")!, "https://example.test");
    expect(Object.fromEntries(url.searchParams)).toEqual({ partnerCategory: "automotive", type: "gift-cards", available: "1", minValue: "5", maxValue: "25", sort: "value-high" });
    expect(url.hash).toBe("#search-results");
  });

  test("finds baby essentials using everyday language", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "baby stuff" }) }));
    expect(screen.getByRole("link", { name: /Baby's Essentials Bundle/i }).getAttribute("href"))
      .toBe("/items/babys-essentials-bundle?from=%2Fbrowse%3Fq%3Dbaby%2Bstuff%23prize-babys-essentials-bundle");
  });

  test("uses the available mobile width for one search result", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "dyson v8" }) }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Products" }).className).toContain("grid-cols-1");
  });

  test.each(["everyday-items", "electronics", "home-essentials", "ending-soon"])(
    "puts pictured items before gift cards in %s",
    async category => {
      render(await BrowsePage({ searchParams: Promise.resolve(category === "ending-soon" ? { sort: "ending-soon", batch: "2" } : { category }) }));
      const headings = Array.from(document.querySelectorAll('section[aria-label="Products"] article h2'), heading => heading.textContent ?? "");
      const firstGiftCard = headings.findIndex(title => /gift card|demo reward|bed bath & beyond \+ wayfair bundle/i.test(title));
      expect(firstGiftCard).toBeGreaterThan(0);
      expect(headings.slice(0, firstGiftCard).every(title => !/gift card/i.test(title))).toBe(true);
      expect(headings.slice(firstGiftCard).every(title => /gift card|demo reward|bed bath & beyond \+ wayfair bundle/i.test(title))).toBe(true);
    },
  );

  test("Groceries opens the approved inspiration shelves and leads with grocery-store offers", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "groceries" }) }));
    expect(screen.getByRole("heading", { name: "Follow your appetite." })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Easy grocery ideas" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Occasion grocery ideas" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Grocery preview layouts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next Easy grocery ideas" })).toBeNull();
    const titles = within(screen.getByRole("region", { name: "Products" })).getAllByRole("heading").map(heading => heading.textContent ?? "");
    const coffee = titles.findIndex(title => /Dunkin|Peet|Dutch Bros/i.test(title));
    const storeCards = titles.map((title, index) => /(?:Publix|Walmart).*Gift Card/i.test(title) ? index : -1).filter(index => index >= 0);
    expect(storeCards.length).toBeGreaterThan(2);
    expect(storeCards.every(index => index < coffee)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Explore Stir-Fry Night" }));
    const popup = within(screen.getByRole("dialog", { name: "Stir-Fry Night" }));
    const offer = popup.getAllByRole("link", { name: /Publix Gift Card/ })[0];
    expect(new URL(offer.getAttribute("href")!, "https://example.test").searchParams.get("from")).toBe("/browse?category=groceries");
    fireEvent.click(popup.getByRole("button", { name: "Keep exploring ideas" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "Follow your appetite." })).toBeTruthy();
  });

  test("an explicit grocery sort keeps its requested order and the search controls", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "groceries", sort: "price-low" }) }));
    expect(screen.queryByRole("heading", { name: "Follow your appetite." })).toBeNull();
    expect(topOptions().getByRole("button", { name: /Filter & sort/ })).toBeTruthy();
    const first = within(screen.getByRole("region", { name: "Products" })).getAllByRole("heading")[0];
    expect(first.textContent).toMatch(/Dunkin/);
  });

  test("clearly identifies indirect retailer results as gift cards", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "reciprocating saw" }) }));
    expect(screen.getAllByText("Related retailer gift card · Check retailer product availability.").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("link", { name: /\$25 The Home Depot Gift Card/i }).getAttribute("href"))
      .toBe("/items/home-depot-25-gift-card?from=%2Fbrowse%3Fq%3Dreciprocating%2Bsaw%23prize-home-depot-25-gift-card");
    expect(screen.queryByRole("heading", { name: "Reciprocating Saw" })).toBeNull();
  });

  test("uses the picker search to find a department while keeping the applied prize search", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "paper towels" }) }));
    expect(screen.queryByRole("navigation", { name: "Browse categories" })).toBeNull();
    fireEvent.click(topOptions().getByRole("button", { name: "Categories" }));
    const panel = within(screen.getByRole("dialog"));
    expect(panel.getByRole("region", { name: "Scrollable categories" })).toBeTruthy();
    expect(panel.queryByRole("combobox")).toBeNull();
    fireEvent.change(panel.getByRole("searchbox", { name: "Find a category or retailer" }), { target: { value: "spark plugs" } });
    fireEvent.click(panel.getByRole("button", { name: /Automotive/ }));
    expect(navigation.push).toHaveBeenCalledWith("/browse?partnerCategory=automotive&q=paper+towels#search-results", { scroll: false });
    expect(screen.getAllByText("Related retailer gift card · Check retailer product availability.")).toHaveLength(9);
  });

  test("does not claim the whole catalog is empty when only a selected category has no matches", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "paper towels", category: "gas" }) }));
    expect(screen.getByRole("heading", { name: "No “paper towels” matches in Gas." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See all search results" }).getAttribute("href")).toBe("/browse?q=paper+towels");
  });

  test("retries an empty category search in place without removing existing actions", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "electronics", q: "PetSmart", maxValue: "500", batch: "3" }) }));
    const retry = screen.getByRole<HTMLFormElement>("search", { name: "Search Electronics again" });
    expect(retry.getAttribute("action")).toBe("/browse#search-results");
    const field = within(retry).getByRole<HTMLInputElement>("searchbox", { name: "Search Electronics again" });
    expect(field.value).toBe("");
    fireEvent.change(field, { target: { value: "Sony" } });
    expect(Object.fromEntries(new FormData(retry))).toEqual({ category: "electronics", maxValue: "500", q: "Sony" });
    expect(within(retry).getByRole("button", { name: "Go" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "See all search results" }).getAttribute("href")).toBe("/browse?q=PetSmart");
    expect(screen.getByRole("link", { name: /Tell us what you'd like to see/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Browse available rewards" })).toBeTruthy();
    expect(screen.getByRole("search", { name: "Search marketplace" })).toBeTruthy();
  });

  test("filters to a current retailer and keeps product-type selection", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "everyday-items", retailer: "Walmart", type: "pictured" }) }));
    expect(screen.getByText("4 products shown")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ninja 4-Quart Air Fryer/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Baby's Essentials Bundle/i })).toBeTruthy();
    expect(screen.getByText(/Showing Walmart/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "View all in this category" }).getAttribute("href")).toBe("/browse?category=everyday-items&type=pictured#search-results");
  });

  test("product links preserve the chosen category and filters for a return trip", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "groceries", type: "gift-cards", available: "1" }) }));
    expect(screen.getByRole("link", { name: /\$100 Walmart Gift Card/i }).getAttribute("href"))
      .toBe("/items/walmart-100-gift-card?from=%2Fbrowse%3Fcategory%3Dgroceries%26type%3Dgift-cards%26available%3D1%23prize-walmart-100-gift-card");
  });

  test("shows an honest no-offer state for a directory-only retailer", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ category: "everyday-items", retailer: "AutoZone®" }) }));
    expect(screen.getByRole("heading", { name: "No current AutoZone® offer matches here." })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Clear filters" }).some(link => link.getAttribute("href") === "/browse?category=everyday-items")).toBe(true);
  });

  test("drills from a partner category into only its current offers", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ partnerCategory: "pharmacy" }) }));
    expect(topOptions().getByRole("button", { name: "Pharmacy" }).getAttribute("aria-haspopup")).toBe("dialog");
    expect(screen.getByText("10 products shown")).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.queryByRole("link", { name: /Walmart Gift Card/i })).toBeNull();
  });

  test("Clear filters keeps the selected retailer category and search", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ partnerCategory: "pharmacy", q: "Walgreens", maxValue: "75" }) }));
    expect(screen.getByRole("link", { name: "Clear filters" }).getAttribute("href"))
      .toBe("/browse?partnerCategory=pharmacy&q=Walgreens#search-results");
  });

  test("opens the added simulated Walgreens card from its retailer category", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ partnerCategory: "pharmacy", retailer: "Walgreens" }) }));
    expect(screen.getByRole("link", { name: /\$100 Walgreens Gift Card/ }).getAttribute("href")).toContain("/items/directory-walgreens-100-gift-card");
    expect(screen.getByRole("link", { name: /Milani Stay Put Eyeliner/ })).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });

  test("filters by the displayed prize value while retaining the inline search", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ type: "gift-cards", maxValue: "25" }) }));
    const cards = screen.getAllByRole("article");
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every(card => /\$25 value/.test(card.textContent ?? ""))).toBe(true);
    expect(screen.getAllByRole("searchbox", { name: "Search all prizes" })).toHaveLength(1);
  });

  test("an old filtered search explains the prize-value limit and offers the unrestricted search", async () => {
    render(await BrowsePage({ searchParams: Promise.resolve({ q: "PlayStation", maxValue: "25" }) }));
    expect(screen.getByRole("heading", { name: "No products match these filters." })).toBeTruthy();
    expect(screen.getByText(/This is the prize value, not the cost to enter/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Search all prizes" }).getAttribute("href")).toBe("/browse?q=PlayStation#search-results");
    expect(screen.getByText("$25 and under")).toBeTruthy();
  });
});
