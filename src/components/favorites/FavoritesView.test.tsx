import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { SavedProductShare } from "@/lib/sharing/saved-shares";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
const mocks = vi.hoisted(() => ({ toggle: vi.fn(), state: vi.fn(), alert: vi.fn() }));
vi.mock("./FavoritesProvider", () => ({ useFavorites: () => ({ slugs: ["nike-court-shot-shoes"], available: true, isSignedIn: true, busySlugs: [], toggle: mocks.toggle }) }));
vi.mock("./FavoritesLandingScroll", () => ({ FavoritesLandingScroll: () => null }));
vi.mock("@/lib/sharing/saved-share-actions", () => ({ setReceivedProductState: mocks.state }));
vi.mock("@/lib/favorites/alert-actions", () => ({ setFavoriteCapacityAlert: mocks.alert }));
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <span role="img" aria-label={alt} data-src={src} /> }));
import { FavoritesView } from "./FavoritesView";
const share: SavedProductShare = { id: "11111111-1111-4111-8111-111111111111", token: "22222222-2222-4222-8222-222222222222", slug: "playstation-5-slim", title: "PlayStation", sender: "Alex", createdAt: "2026-10-25T12:00:00Z", viewedAt: null, savedAt: null, declinedAt: null, demo: false };
function show(props: Partial<React.ComponentProps<typeof FavoritesView>> = {}) { return render(<FavoritesView availability={null} initialAlerts={{}} emailEnabled initialShares={[share]} {...props} />); }
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/account/favorites");
  vi.stubGlobal("scrollTo", vi.fn());
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  mocks.state.mockImplementation(async (_id, state) => ({ ok: true, viewedAt: "2026-10-25", declinedAt: state === "declined" ? "2026-10-25" : null, message: state === "declined" ? "Declined. This item stays in Shared with You." : "" }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });
test("personal favorites are the default and the two tabs replace the introductory copy", () => {
  window.history.replaceState({ __NA: true }, "", "/account/favorites");
  const replace = vi.spyOn(window.history, "replaceState");
  show(); expect(screen.getByRole("tab", { name: "Your Favorites 1" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByText(/Want a heads-up/)).toBeNull(); expect(screen.queryByRole("button", { name: "Try an email share" })).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Shared with You 1" }));
  expect(screen.getByText("From Alex")).toBeTruthy(); expect(window.location.search).toBe("?tab=shared"); expect(mocks.toggle).not.toHaveBeenCalled();
  expect(replace).toHaveBeenLastCalledWith(null, "", "/account/favorites?tab=shared"); replace.mockRestore();
});
test("declining keeps the shared card and never changes personal favorites", async () => {
  window.history.replaceState({}, "", "/account/favorites?tab=shared");
  show({ initialTab: "shared" }); fireEvent.click(screen.getByRole("button", { name: /View prize/ }));
  fireEvent.click(screen.getByRole("button", { name: "Decline this share" }));
  await waitFor(() => expect(screen.getByText("Declined")).toBeTruthy());
  expect(screen.getByRole("tab", { name: "Shared with You 1" })).toBeTruthy(); expect(screen.getByRole("tab", { name: "Your Favorites 1" })).toBeTruthy();
  await waitFor(() => expect(screen.getByRole("button", { name: /View prize/ })).toBeTruthy()); expect(mocks.toggle).not.toHaveBeenCalled();
});

test.each([share.token, null])("opening a saved share preserves its exact return destination and token %s", token => {
  show({ initialTab: "shared", initialShares: [{ ...share, token }] });
  fireEvent.click(screen.getByRole("button", { name: /View prize/ }));
  const link = new URL(screen.getByRole("link", { name: "Open prize details →" }).getAttribute("href")!, "https://example.test");
  expect(link.pathname).toBe("/items/playstation-5-slim");
  expect(link.searchParams.get("from")).toBe(`/account/favorites?tab=shared&share=${share.id}`);
  expect(link.searchParams.get("share")).toBe(token);
});
test("a late viewed response cannot erase a completed decline", async () => {
  window.history.replaceState({}, "", "/account/favorites?tab=shared");
  let finishView!: (value: unknown) => void;
  mocks.state.mockImplementation((_id, state) => state === "viewed" ? new Promise(resolve => { finishView = resolve; }) : Promise.resolve({ ok: true, viewedAt: "today", declinedAt: "today", message: "Kept" }));
  show({ initialTab: "shared" }); fireEvent.click(screen.getByRole("button", { name: /View prize/ })); fireEvent.click(screen.getByRole("button", { name: "Decline this share" }));
  await waitFor(() => expect(screen.getByText("Declined")).toBeTruthy());
  await act(async () => finishView({ ok: true, viewedAt: "today", declinedAt: null }));
  expect(screen.getByText("Declined")).toBeTruthy();
});
test("after a pool closes a saved detail, its entry button and its list count disappear together", () => {
  const view = show({ initialItem: "nike-court-shot-shoes" });
  expect(screen.getByRole("link", { name: "Enter for $1" })).toBeTruthy();
  view.rerender(<FavoritesView availability={null} hiddenSlugs={["nike-court-shot-shoes"]} initialAlerts={{}} emailEnabled initialShares={[]} />);
  expect(screen.queryByRole("link", { name: "Enter for $1" })).toBeNull();
  expect(screen.getByRole("tab", { name: "Your Favorites 0" })).toBeTruthy();
  expect(mocks.toggle).not.toHaveBeenCalled();
});

test("favorites capacity alerts retain their own saved preference", async () => {
  mocks.alert.mockResolvedValue({ ok: true, message: "Saved" }); show();
  fireEvent.click(screen.getByRole("checkbox", { name: /Email me when/ }));
  await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith("nike-court-shot-shoes", true));
  expect(mocks.state).not.toHaveBeenCalled();
});

test("an old closed-share link explains the unavailable prize without exposing it or claiming no shares", () => {
 show({initialTab:"shared",initialShareId:share.id,hiddenSlugs:[share.slug]});
 expect(screen.getByRole("heading",{name:"This shared prize is no longer available"})).toBeTruthy();
 expect(screen.queryByText("Nothing shared with you yet")).toBeNull();
 expect(screen.queryByRole("button",{name:/View prize/})).toBeNull();
 expect(screen.queryByRole("link",{name:"Enter for $1"})).toBeNull();
 expect(mocks.state).not.toHaveBeenCalled();
});

test("a share-loading failure stays retryable instead of being described as a closed prize", () => {
 show({initialTab:"shared",initialShareId:share.id,initialShares:null});
 expect(screen.getByRole("alert").textContent).toContain("couldn’t be loaded");
 expect(screen.queryByText("This shared prize is no longer available")).toBeNull();
});

test("a withdrawn share replaces the open preview with the unavailable message", async () => {
  const props = { availability: null, initialAlerts: {}, emailEnabled: true, initialTab: "shared" as const, initialShareId: share.id };
  const view = render(<FavoritesView {...props} initialShares={[share]} />);
  expect(screen.getByRole("link", { name: "Open prize details →" })).toBeTruthy();
  await act(async () => {});

  view.rerender(<FavoritesView {...props} initialShares={null} />);
  expect(screen.getByRole("alert").textContent).toContain("couldn’t be loaded");
  expect(screen.queryByRole("link", { name: "Enter for $1" })).toBeNull();

  view.rerender(<FavoritesView {...props} initialShares={[]} />);
  expect(screen.getByRole("heading", { name: "This shared prize is no longer available" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Open prize details|Enter for \$1/ })).toBeNull();
});

test("Forward to a withdrawn share preserves the unavailable state", async () => {
  window.history.replaceState({}, "", "/account/favorites?tab=shared");
  const view = show({ initialTab: "shared" });
  fireEvent.click(screen.getByRole("button", { name: /View prize/ }));
  act(() => window.history.back());
  await screen.findByRole("button", { name: /View prize/ });
  view.rerender(<FavoritesView availability={null} initialAlerts={{}} emailEnabled initialTab="shared" initialShares={[]} />);
  act(() => window.history.forward());
  expect(await screen.findByRole("heading", { name: "This shared prize is no longer available" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Enter for $1" })).toBeNull();
});

test("refreshed shares appear and disappear without resetting the active tab", () => {
  const view = show({ initialTab: "shared", initialShares: [] });
  expect(screen.getByRole("tab", { name: "Shared with You 0" })).toBeTruthy();
  view.rerender(<FavoritesView availability={null} initialAlerts={{}} emailEnabled initialTab="shared" initialShares={[share]} />);
  expect(screen.getByRole("tab", { name: "Shared with You 1" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getByText("From Alex")).toBeTruthy();
  view.rerender(<FavoritesView availability={null} initialAlerts={{}} emailEnabled initialTab="shared" initialShares={[]} />);
  expect(screen.getByRole("tab", { name: "Shared with You 0" }).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByText("From Alex")).toBeNull();
});

test("refreshed watch alerts update in both directions and keep an opened item selected", () => {
  const view = show({ initialAlerts: { "nike-court-shot-shoes": false } });
  const refreshed = (enabled: boolean) => <FavoritesView availability={null} initialAlerts={{ "nike-court-shot-shoes": enabled }} emailEnabled initialShares={[share]} />;
  view.rerender(refreshed(true));
  expect(screen.getByRole("checkbox", { name: /Email me when/ })).toHaveProperty("checked", true);
  view.rerender(refreshed(false));
  expect(screen.getByRole("checkbox", { name: /Email me when/ })).toHaveProperty("checked", false);
  fireEvent.click(screen.getByRole("button", { name: "View Nike Men's Court Shot Shoes" }));
  view.rerender(refreshed(true));
  expect(screen.getByRole("button", { name: "Back to list" })).toBeTruthy();
});

test("a successful watch choice survives stale snapshots until acknowledged, then follows later changes", async () => {
  let finish!: (value: unknown) => void;
  mocks.alert.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = show({ initialAlerts: { "nike-court-shot-shoes": false } });
  const refreshed = (enabled: boolean) => <FavoritesView availability={null} initialAlerts={{ "nike-court-shot-shoes": enabled }} emailEnabled initialShares={[share]} />;
  fireEvent.click(screen.getByRole("checkbox", { name: /Email me when/ }));
  view.rerender(refreshed(false));
  expect(screen.getByRole("checkbox", { name: /Email me when/ })).toHaveProperty("disabled", true);
  await act(async () => finish({ ok: true, message: "Saved" }));
  expect(screen.getByRole("checkbox", { name: /Email me when/ })).toHaveProperty("checked", true);
  view.rerender(refreshed(false));
  expect(screen.getByRole("checkbox", { name: /Email me when/ })).toHaveProperty("checked", true);
  view.rerender(refreshed(true));
  view.rerender(refreshed(false));
  expect(screen.getByRole("checkbox", { name: /Email me when/ })).toHaveProperty("checked", false);
});

test("fresh decline and restore states remain authoritative after a local response is acknowledged", async () => {
  window.history.replaceState({}, "", "/account/favorites?tab=shared");
  const viewedAt = "2026-11-06T12:01:00Z";
  const declinedAt = "2026-11-06T12:02:00Z";
  let finishView!: (value: unknown) => void;
  mocks.state.mockImplementation((_id, state) => state === "viewed" ? new Promise(resolve => { finishView = resolve; }) : Promise.resolve({ ok: true, viewedAt, declinedAt, message: "Saved" }));
  const view = show({ initialTab: "shared" });
  fireEvent.click(screen.getByRole("button", { name: /View prize/ }));
  fireEvent.click(screen.getByRole("button", { name: "Decline this share" }));
  await screen.findByText("Declined");
  const refreshed = (declined: string | null) => <FavoritesView availability={null} initialAlerts={{}} emailEnabled initialTab="shared" initialShares={[{ ...share, viewedAt, declinedAt: declined }]} />;
  view.rerender(refreshed(declinedAt));
  await act(async () => finishView({ ok: true, viewedAt, declinedAt: null }));
  expect(screen.getByText("Declined")).toBeTruthy();
  view.rerender(refreshed(null));
  expect(screen.queryByText("Declined")).toBeNull();
  expect(screen.getByText("Viewed")).toBeTruthy();
});
test("unavailable shared history does not hide personal favorites", () => {
  show({ initialShares: null }); expect(screen.getByRole("button", { name: "Nike Men's Court Shot Shoes" })).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: /Shared with You/ })); expect(screen.getByRole("alert").textContent).toMatch(/couldn’t be loaded/);
});
test("product artwork opens the inline detail and Share retains the existing sharing flow", () => {
  const shareEvent = vi.fn(); window.addEventListener(PRODUCT_SHARE_EVENT, shareEvent);
  show(); fireEvent.click(screen.getByRole("button", { name: "View Nike Men's Court Shot Shoes" }));
  expect(screen.getByRole("button", { name: "Back to list" })).toBeTruthy();
  expect(window.location.search).toBe("?item=nike-court-shot-shoes");
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  expect(shareEvent).toHaveBeenCalledOnce();
  expect((shareEvent.mock.calls[0][0] as CustomEvent).detail.slug).toBe("nike-court-shot-shoes");
  window.removeEventListener(PRODUCT_SHARE_EVENT, shareEvent);
});


test("Favorites keeps its preview and offers a prominent entry link back to Favorites", () => {
  show(); fireEvent.click(screen.getByRole("button", { name: "View Nike Men's Court Shot Shoes" }));
  expect(screen.getByRole("button", { name: "Back to list" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Enter for $1" }).getAttribute("href")).toBe("/items/nike-court-shot-shoes?from=%2Faccount%2Ffavorites");
  expect(screen.queryByRole("link", { name: /Open prize details/ })).toBeNull();
});

test("browser Back restores the Favorites list and position, Forward reopens the item, and Back to list adds no extra stop", async () => {
  window.history.replaceState({}, "", "/account/entries");
  window.history.pushState({}, "", "/account/favorites");
  vi.stubGlobal("scrollY", 420);
  show();
  fireEvent.click(screen.getByRole("button", { name: "View Nike Men's Court Shot Shoes" }));
  act(() => window.history.back());
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/account/favorites"));
  await waitFor(() => expect(screen.queryByRole("button", { name: "Back to list" })).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Nike Men's Court Shot Shoes" })));
  expect(window.scrollTo).toHaveBeenCalledWith({ top: 420, behavior: "instant" });
  act(() => window.history.forward());
  await waitFor(() => expect(screen.getByRole("button", { name: "Back to list" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
  await waitFor(() => expect(window.location.search).toBe(""));
  act(() => window.history.back());
  await waitFor(() => expect(window.location.pathname).toBe("/account/entries"));
  expect(mocks.toggle).not.toHaveBeenCalled();
  expect(mocks.state).not.toHaveBeenCalled();
});

test("a shared preview returns to Shared with You on browser Back and reopens on Forward", async () => {
  window.history.replaceState({}, "", "/account/favorites?tab=shared");
  show({ initialTab: "shared" });
  fireEvent.click(screen.getByRole("button", { name: /View prize/ }));
  await waitFor(() => expect(mocks.state).toHaveBeenCalledWith(share.id, "viewed"));
  act(() => window.history.back());
  await waitFor(() => expect(window.location.search).toBe("?tab=shared"));
  await waitFor(() => expect(screen.getByRole("button", { name: /View prize/ })).toBeTruthy());
  expect(screen.getByRole("tab", { name: "Shared with You 1" }).getAttribute("aria-selected")).toBe("true");
  act(() => window.history.forward());
  await waitFor(() => expect(screen.getByRole("button", { name: "Decline this share" })).toBeTruthy());
  expect(mocks.state).toHaveBeenCalledTimes(1);
});

test("refreshing an opened item preserves Back to list's history destination", async () => {
  window.history.replaceState({}, "", "/account/entries");
  window.history.pushState({}, "", "/account/favorites");
  const view = show();
  fireEvent.click(screen.getByRole("button", { name: "View Nike Men's Court Shot Shoes" }));
  view.unmount();
  show({ initialItem: "nike-court-shot-shoes" });
  fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/account/favorites"));
  await waitFor(() => expect(screen.getByRole("button", { name: "View Nike Men's Court Shot Shoes" })).toBeTruthy());
  act(() => window.history.back());
  await waitFor(() => expect(window.location.pathname).toBe("/account/entries"));
});

test("Back to list from a direct item link stays in Favorites", () => {
  window.history.replaceState({}, "", "/account/favorites?item=nike-court-shot-shoes");
  show({ initialItem: "nike-court-shot-shoes" });
  fireEvent.click(screen.getByRole("button", { name: "Back to list" }));
  expect(window.location.pathname + window.location.search).toBe("/account/favorites");
  expect(screen.getByRole("button", { name: "View Nike Men's Court Shot Shoes" })).toBeTruthy();
});
