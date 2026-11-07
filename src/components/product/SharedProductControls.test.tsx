import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
beforeEach(() => {
  vi.clearAllMocks(); mocks.record.mockResolvedValue({ ok: true, href: "/account/favorites?tab=shared" });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
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

test("sharing choices and dismissal lock during a slow save, then show the submitted choices", async () => {
  let finish!: (result: unknown) => void;
  mocks.receiving.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<SharedProductControls slug={context.slug} initial={context} signedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Sharing options" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Receive shared picks/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
  for (const input of screen.getAllByRole("checkbox")) expect(input).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "Close sharing options" })).toHaveProperty("disabled", true);
  const cancel = new Event("cancel", { cancelable: true });
  fireEvent(screen.getByRole("dialog"), cancel);
  expect(cancel.defaultPrevented).toBe(true);
  expect(mocks.receiving).toHaveBeenCalledExactlyOnceWith(context.token, true, false);
  await act(async () => finish({ ok: true, context: { ...context, receiving: true }, message: "Saved" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Sharing options" }));
  expect(screen.getByRole("checkbox", { name: /Receive shared picks/ })).toHaveProperty("checked", true);
  expect(screen.getByRole("checkbox", { name: /Receive shared picks/ })).toHaveProperty("disabled", false);
});

test("a failed save unlocks the same sharing draft for retry", async () => {
  mocks.receiving.mockRejectedValueOnce(new Error("Connection interrupted"));
  render(<SharedProductControls slug={context.slug} initial={context} signedIn />);
  fireEvent.click(screen.getByRole("button", { name: "Sharing options" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Receive shared picks/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
  await screen.findByText("Your choice could not be saved. Please try again.");
  expect(screen.getByRole("checkbox", { name: /Receive shared picks/ })).toHaveProperty("checked", true);
  expect(screen.getByRole("checkbox", { name: /Receive shared picks/ })).toHaveProperty("disabled", false);
  expect(screen.getByRole("button", { name: "Close sharing options" })).toHaveProperty("disabled", false);
});
