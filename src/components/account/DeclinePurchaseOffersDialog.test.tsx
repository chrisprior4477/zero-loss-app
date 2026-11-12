import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";

const mocks = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() }, decline: vi.fn(), undo: vi.fn(), close: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("@/lib/account/bulk-decline-actions", () => ({ declineAllDemoPurchaseOptions: mocks.decline, undoBulkDemoPurchaseOptions: mocks.undo }));
import { DeclinePurchaseOffersDialog } from "./DeclinePurchaseOffersDialog";

const item = storedActivityFixture().activity[2];
const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];
const setup = (count = 2) => render(<DeclinePurchaseOffersDialog item={item} offeredOptionIds={ids.slice(0, count)} onClose={mocks.close} />);
const receipts = ids.map(optionId => ({ optionId, declineEventId: `event-${optionId}` }));
function saved() { mocks.decline.mockResolvedValue({ status: "succeeded", optionIds: ids, receipts, message: "2 offers declined." }); }
afterEach(() => { cleanup(); vi.useRealTimers(); vi.resetAllMocks(); });

test.each(["keep", "close", "escape", "backdrop"])("%s cancels without declining, charging or navigating", (way) => {
  setup();
  if (way === "keep") fireEvent.click(screen.getByRole("button", { name: "Keep my offers" }));
  if (way === "close") fireEvent.click(screen.getByRole("button", { name: "Close and keep my offers" }));
  if (way === "escape") fireEvent.keyDown(document, { key: "Escape" });
  if (way === "backdrop") fireEvent.click(screen.getByRole("dialog").parentElement!);
  expect(mocks.close).toHaveBeenCalledOnce();
  expect(mocks.decline).not.toHaveBeenCalled();
  expect(mocks.undo).not.toHaveBeenCalled();
  expect(mocks.router.replace).not.toHaveBeenCalled();
});

test("if a selected ticket disappears, it cannot be replaced by a new ticket", () => {
  const props = { item, selectedOptionIds: [ids[1]], onClose: mocks.close, onBackToSelection: vi.fn() };
  const view = render(<DeclinePurchaseOffersDialog {...props} offeredOptionIds={ids} />);
  view.rerender(<DeclinePurchaseOffersDialog {...props} offeredOptionIds={[ids[0], "third"]} />);
  expect(screen.getByRole("button", { name: "Decline 1 offer" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Back to selection" }));
  expect(props.onBackToSelection).toHaveBeenCalledOnce();
  expect(mocks.decline).not.toHaveBeenCalled();
});

test("decline requires confirmation, prevents duplicate submits and locks dismissal while saving", async () => {
  let resolve!: (value: unknown) => void;
  mocks.decline.mockReturnValue(new Promise(done => { resolve = done; }));
  setup(1);
  expect(screen.getByRole("dialog", { name: "Decline offer?" })).toBeTruthy();
  expect(mocks.decline).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Decline 1 offer" }));
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(screen.getByRole("dialog").parentElement!);
  expect(mocks.close).not.toHaveBeenCalled();
  expect(mocks.decline).toHaveBeenCalledExactlyOnceWith(item.slug, [ids[0]]);
  await act(async () => { resolve({ status: "succeeded", optionIds: [ids[0]], receipts: [receipts[0]], message: "1 offer declined." }); });
  expect(screen.getByRole("button", { name: "Undo decline" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: /1 offer declined/ })).toBeTruthy();
});

test("partial declines retain an undo for only the IDs actually saved", async () => {
  mocks.decline.mockResolvedValue({ status: "partial", optionIds: [ids[0]], receipts: [receipts[0]], message: "1 offer declined; another could not be confirmed." });
  mocks.undo.mockResolvedValue({ status: "succeeded", optionIds: [ids[0]], message: "Restored." });
  setup();
  fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" }));
  await screen.findByRole("button", { name: "Undo decline" });
  fireEvent.click(screen.getByRole("button", { name: "Undo decline" }));
  await waitFor(() => expect(mocks.close).toHaveBeenCalledOnce());
  expect(mocks.undo).toHaveBeenCalledExactlyOnceWith([receipts[0]]);
  expect(mocks.router.refresh).toHaveBeenCalledOnce();
});

test("the countdown finishes a saved decline once, without writing or refunding again", async () => {
  vi.useFakeTimers(); saved(); setup();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" })); });
  expect(screen.getByRole("timer", { name: /30 seconds left to undo/ })).toBeTruthy();
  act(() => { vi.advanceTimersByTime(31_000); });
  expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/account/declined-offers");
  act(() => { vi.advanceTimersByTime(31_000); });
  expect(mocks.router.replace).toHaveBeenCalledTimes(1);
  expect(mocks.decline).toHaveBeenCalledOnce();
  expect(mocks.undo).not.toHaveBeenCalled();
});

test("Undo started before expiry is allowed to finish without countdown navigation", async () => {
  vi.useFakeTimers(); saved();
  let resolve!: (value: unknown) => void;
  mocks.undo.mockReturnValue(new Promise(done => { resolve = done; }));
  setup();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" })); });
  act(() => { vi.advanceTimersByTime(29_000); });
  fireEvent.click(screen.getByRole("button", { name: "Undo decline" }));
  act(() => { vi.advanceTimersByTime(4_000); });
  fireEvent.keyDown(document, { key: "Escape" });
  expect(mocks.router.replace).not.toHaveBeenCalled();
  expect(mocks.close).not.toHaveBeenCalled();
  await act(async () => { resolve({ status: "succeeded", optionIds: ids, message: "Restored." }); });
  expect(mocks.close).toHaveBeenCalledOnce();
  expect(mocks.undo).toHaveBeenCalledExactlyOnceWith(receipts);
});

test("Finish or closing after the decline opens Declined Offers without another write", async () => {
  saved(); setup();
  fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" }));
  await screen.findByRole("button", { name: "Undo decline" });
  fireEvent.click(screen.getByRole("button", { name: "View Declined Offers" }));
  expect(mocks.router.replace).toHaveBeenCalledExactlyOnceWith("/account/declined-offers");
  expect(mocks.decline).toHaveBeenCalledOnce();
  expect(mocks.undo).not.toHaveBeenCalled();
  expect(mocks.close).not.toHaveBeenCalled();
});

test("a lost response leads to recovery instead of another decline submission", async () => {
  mocks.decline.mockRejectedValue(new Error("offline")); setup();
  fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" }));
  expect((await screen.findByRole("alert")).textContent).toContain("some offers may already have changed");
  expect(screen.queryByRole("button", { name: "Decline 2 offers" })).toBeNull();
  expect(screen.getByRole("link", { name: "Check Declined Offers" }).getAttribute("href")).toBe("/account/declined-offers");
  expect(mocks.decline).toHaveBeenCalledOnce();
});

test("a partial restore reports recovery instead of claiming every offer was kept", async () => {
  saved(); mocks.undo.mockResolvedValue({ status: "partial", optionIds: [ids[0]], message: "1 offer restored; 1 could not be restored." }); setup();
  fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" }));
  await screen.findByRole("button", { name: "Undo decline" });
  fireEvent.click(screen.getByRole("button", { name: "Undo decline" }));
  expect((await screen.findByRole("alert")).textContent).toContain("1 could not be restored");
  expect(mocks.close).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Undo decline" })).toBeNull();
});

test.each([{ current: [...ids, "33333333-3333-4333-8333-333333333333"] }, { current: [ids[0], "33333333-3333-4333-8333-333333333333"] }])("a changed roster requires a fresh review, including replacements with the same count", async ({ current }) => {
  saved();
  const view = setup();
  view.rerender(<DeclinePurchaseOffersDialog item={item} offeredOptionIds={current} onClose={mocks.close} />);
  expect(screen.getByRole("alert").textContent).toContain("available offers changed");
  fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" }));
  expect(mocks.decline).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Review current offers" }));
  fireEvent.click(screen.getByRole("button", { name: `Decline ${current.length} offers` }));
  await screen.findByRole("button", { name: "Undo decline" });
  expect(mocks.decline).toHaveBeenCalledExactlyOnceWith(item.slug, current);
});

test("a server refresh during Undo does not replace its saved receipt", async () => {
  saved(); const view = setup();
  fireEvent.click(screen.getByRole("button", { name: "Decline 2 offers" }));
  await screen.findByRole("button", { name: "Undo decline" });
  view.rerender(<DeclinePurchaseOffersDialog item={item} offeredOptionIds={[]} onClose={mocks.close} />);
  expect(screen.getByRole("heading", { name: /2 offers declined/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Review current offers" })).toBeNull();
});
