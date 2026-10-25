import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { SharedProductContext } from "@/lib/sharing/receiving";
const mocks = vi.hoisted(() => ({ record: vi.fn(), receiving: vi.fn(), push: vi.fn(), replace: vi.fn(), favorite: vi.fn() }));
const router = { push: mocks.push, replace: mocks.replace };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/sharing/saved-share-actions", () => ({ recordReceivedProduct: mocks.record }));
vi.mock("@/lib/sharing/receiving-actions", () => ({ updateSharedProductReceiving: mocks.receiving }));
vi.mock("@/components/favorites/FavoritesProvider", () => ({ useFavorites: () => ({ toggle: mocks.favorite }) }));
import { SharedProductControls } from "./SharedProductControls";
const context: SharedProductContext = { token: "11111111-1111-4111-8111-111111111111", slug: "playstation-5-slim", sender: "Alex", scope: "Alex’s Crew", isGroup: false, own: false, receiving: false, shareBack: false, hasChoice: true };
beforeEach(() => { vi.clearAllMocks(); mocks.record.mockResolvedValue({ ok: true, href: "/account/favorites?tab=shared" }); });
afterEach(cleanup);
test("saving an email item goes to Shared with You without changing favorites or an opt-out", async () => {
  render(<SharedProductControls slug={context.slug} initial={context} signedIn />);
  await waitFor(() => expect(mocks.record).toHaveBeenCalledWith(context.slug, context.token, false));
  fireEvent.click(screen.getByRole("button", { name: "Save to Shared with You" }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/account/favorites?tab=shared"));
  expect(mocks.record).toHaveBeenLastCalledWith(context.slug, context.token, true);
  expect(mocks.favorite).not.toHaveBeenCalled(); expect(mocks.receiving).not.toHaveBeenCalled();
});
test("a guest's save continues after sign-in, including older unattributed email links", () => {
  render(<SharedProductControls slug={context.slug} initial={null} signedIn={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Save to Shared with You" }));
  expect(new URL(mocks.push.mock.calls[0][0], "https://example.test").searchParams.get("next")).toBe(`/items/${context.slug}?shared=1&saveShared=1`);
  expect(mocks.record).not.toHaveBeenCalled(); expect(mocks.favorite).not.toHaveBeenCalled();
});
test("returning from sign-in completes the intended save and opens the shared list", async () => {
  render(<SharedProductControls slug={context.slug} initial={context} signedIn saveOnReturn />);
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account/favorites?tab=shared"));
  expect(mocks.record).toHaveBeenCalledWith(context.slug, context.token, true); expect(mocks.favorite).not.toHaveBeenCalled();
});
test("failed persistence stays on the item with retry feedback", async () => {
  mocks.record.mockResolvedValue({ ok: false, message: "Please try again." });
  render(<SharedProductControls slug={context.slug} initial={context} signedIn saveOnReturn />);
  expect(await screen.findByRole("status")).toHaveProperty("textContent", "Please try again.");
  expect(mocks.replace).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled();
});
