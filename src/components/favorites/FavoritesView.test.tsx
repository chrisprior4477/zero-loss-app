import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { SavedProductShare } from "@/lib/sharing/saved-shares";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
const mocks = vi.hoisted(() => ({ toggle: vi.fn(), state: vi.fn(), alert: vi.fn() }));
vi.mock("./FavoritesProvider", () => ({ useFavorites: () => ({ slugs: ["nike-court-shot-shoes"], available: true, isSignedIn: true, busySlug: null, toggle: mocks.toggle }) }));
vi.mock("./FavoritesLandingScroll", () => ({ FavoritesLandingScroll: () => null }));
vi.mock("@/lib/sharing/saved-share-actions", () => ({ setReceivedProductState: mocks.state }));
vi.mock("@/lib/favorites/alert-actions", () => ({ setFavoriteCapacityAlert: mocks.alert }));
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => <span role="img" aria-label={alt} data-src={src} /> }));
import { FavoritesView } from "./FavoritesView";
const share: SavedProductShare = { id: "11111111-1111-4111-8111-111111111111", token: "22222222-2222-4222-8222-222222222222", slug: "playstation-5-slim", title: "PlayStation", sender: "Alex", createdAt: "2026-10-25T12:00:00Z", viewedAt: null, savedAt: null, declinedAt: null, demo: false };
function show(props: Partial<React.ComponentProps<typeof FavoritesView>> = {}) { return render(<FavoritesView availability={null} initialAlerts={{}} emailEnabled initialShares={[share]} {...props} />); }
beforeEach(() => { vi.clearAllMocks(); mocks.state.mockImplementation(async (_id, state) => ({ ok: true, viewedAt: "2026-10-25", declinedAt: state === "declined" ? "2026-10-25" : null, message: state === "declined" ? "Declined. This item stays in Shared with You." : "" })); });
afterEach(() => { cleanup(); window.history.replaceState({}, "", "/"); });
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
  show({ initialTab: "shared" }); fireEvent.click(screen.getByRole("button", { name: /View prize/ }));
  fireEvent.click(screen.getByRole("button", { name: "Decline this share" }));
  await waitFor(() => expect(screen.getByText("Declined")).toBeTruthy());
  expect(screen.getByRole("tab", { name: "Shared with You 1" })).toBeTruthy(); expect(screen.getByRole("tab", { name: "Your Favorites 1" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /View prize/ })).toBeTruthy(); expect(mocks.toggle).not.toHaveBeenCalled();
});
test("a late viewed response cannot erase a completed decline", async () => {
  let finishView!: (value: unknown) => void;
  mocks.state.mockImplementation((_id, state) => state === "viewed" ? new Promise(resolve => { finishView = resolve; }) : Promise.resolve({ ok: true, viewedAt: "today", declinedAt: "today", message: "Kept" }));
  show({ initialTab: "shared" }); fireEvent.click(screen.getByRole("button", { name: /View prize/ })); fireEvent.click(screen.getByRole("button", { name: "Decline this share" }));
  await waitFor(() => expect(screen.getByText("Declined")).toBeTruthy());
  await act(async () => finishView({ ok: true, viewedAt: "today", declinedAt: null }));
  expect(screen.getByText("Declined")).toBeTruthy();
});
test("favorites capacity alerts retain their own saved preference", async () => {
  mocks.alert.mockResolvedValue({ ok: true, message: "Saved" }); show();
  fireEvent.click(screen.getByRole("checkbox", { name: /Email me when/ }));
  await waitFor(() => expect(mocks.alert).toHaveBeenCalledWith("nike-court-shot-shoes", true));
  expect(mocks.state).not.toHaveBeenCalled();
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
