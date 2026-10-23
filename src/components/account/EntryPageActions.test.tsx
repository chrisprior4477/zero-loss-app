import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EntryPageActions } from "./EntryPageActions";

const createPreviewEntry = vi.hoisted(() => vi.fn());
const confirmPendingEntryRequest = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const sharePrizeWithCrew = vi.hoisted(() => vi.fn());
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry, confirmPendingEntryRequest, resolvePendingEntryRequest: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ sharePrizeWithCrew }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, replace }) }));
vi.mock("./EntryOutcomeEmailPreference", () => ({ EntryOutcomeEmailPreference: () => <div data-testid="outcome-email-preference" /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

const props = {
  itemTitle: "PlayStation 5 Slim Model",
  slug: "playstation-5-slim",
  remaining: 6,
  entryPriceCents: 100,
  balanceCents: 2400,
  entryEnabled: true,
  requestKey: "11111111-1111-4111-8111-111111111111",
  requestHead: { ready: true as const, requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
  crew: [{ id: "22222222-2222-4222-8222-222222222222", name: "Jordan", avatarUrl: null }],
  senderName: "Chris",
  emailEnabled: true,
  returnHref: "/account/entries?viewed=ent_11111111111111111111111111111111",
};

function selectQuantity(quantity: number) {
  for (let selected = 1; selected < quantity; selected++) {
    fireEvent.click(screen.getByRole("button", { name: "Add one extra entry" }));
  }
}

test.each([11, 101])("Entry Details reviews and submits %i entries without a customer cap", async quantity => {
  createPreviewEntry.mockResolvedValue({ status: "succeeded", message: "Entries confirmed.", href: "/account/entries", outcome: "active" });
  render(<EntryPageActions {...props} remaining={150} balanceCents={20000} />);
  selectQuantity(quantity);
  fireEvent.click(screen.getByRole("button", { name: `Add ${quantity} more entries to PlayStation 5` }));
  const confirm = screen.getByRole("button", { name: `Confirm ${quantity} entries for $${quantity}` });
  expect(confirm.hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(confirm);
  await waitFor(() => expect(createPreviewEntry).toHaveBeenCalledOnce());
  const form = createPreviewEntry.mock.calls[0][1] as FormData;
  expect(form.get("quantity")).toBe(String(quantity));
  expect(form.get("idempotencyKey")).toBe(props.requestKey);
});

test("larger quantities still stop at actual capacity and cannot spend unavailable funds", () => {
  render(<EntryPageActions {...props} remaining={101} balanceCents={10000} />);
  selectQuantity(101);
  expect(screen.getByRole("button", { name: "Add one extra entry" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Add 101 more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  const confirm = screen.getByRole("button", { name: "Confirm 101 entries for $101" });
  expect(confirm.hasAttribute("disabled")).toBe(true);
  fireEvent.click(confirm);
  expect(screen.getByText(/Not enough demo funds for this quantity/)).toBeTruthy();
  expect(createPreviewEntry).not.toHaveBeenCalled();
});

test("a capacity refresh blocks a now-too-large selection until it is reduced", () => {
  const { rerender } = render(<EntryPageActions {...props} remaining={150} balanceCents={20000} />);
  selectQuantity(11);
  fireEvent.click(screen.getByRole("button", { name: "Add 11 more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  rerender(<EntryPageActions {...props} remaining={8} balanceCents={20000} />);
  expect(screen.getByRole("button", { name: "Add one extra entry" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText(/Only 8 additional tickets are available now/)).toBeTruthy();
  const confirm = screen.getByRole("button", { name: "Confirm 11 entries for $11" });
  expect(confirm.hasAttribute("disabled")).toBe(true);
  fireEvent.click(confirm);
  expect(createPreviewEntry).not.toHaveBeenCalled();
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Remove one extra entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 8 more entries to PlayStation 5" }));
  expect((screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }) as HTMLInputElement).checked).toBe(false);
});

test.each([0, null, -1, NaN, 1.5, Infinity, 2_147_483_648])("unavailable or invalid capacity %s never offers a purchase", remaining => {
  render(<EntryPageActions {...props} remaining={remaining} />);
  expect(screen.getByText("No additional tickets are available right now.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Add one extra entry" })).toBeNull();
});

test("a larger uncertain submission retries the saved quantity and key without creating a new purchase", async () => {
  createPreviewEntry.mockRejectedValueOnce(new Error("Interrupted"))
    .mockResolvedValueOnce({ status: "succeeded", message: "Entries confirmed.", href: "/account/entries", outcome: "active" });
  render(<EntryPageActions {...props} remaining={150} balanceCents={20000} />);
  selectQuantity(101);
  fireEvent.click(screen.getByRole("button", { name: "Add 101 more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm 101 entries for $101" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Check saved submission" })).toBeTruthy());
  expect(screen.getByRole("button", { name: "Add one extra entry" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Check saved submission" }));
  await waitFor(() => expect(createPreviewEntry).toHaveBeenCalledTimes(2));
  expect(createPreviewEntry.mock.calls[1][1]).toBe(createPreviewEntry.mock.calls[0][1]);
  expect((createPreviewEntry.mock.calls[1][1] as FormData).get("quantity")).toBe("101");
});

test("additional entries are reviewed and confirmed on the same page", async () => {
  createPreviewEntry.mockResolvedValue({ status: "succeeded", message: "2 entries confirmed.", href: "/account/entries", outcome: "active" });
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add one extra entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 2 more entries to PlayStation 5" }));
  expect(screen.getByText(/2 separate entries × \$1 =/)).toBeTruthy();
  expect(screen.getByText("Want to help this pool close faster?").closest("section")?.className).toContain("entryActionPanel");
  expect(screen.queryByRole("link", { name: /Review 2 more entries/ })).toBeNull();
  expect(screen.getByTestId("outcome-email-preference").closest("section")?.getAttribute("aria-labelledby")).toBe("add-entries-title");
  expect(screen.getByRole("link", { name: /Return to My Activity/ }).getAttribute("href")).toBe(props.returnHref);
  expect(screen.getByRole("link", { name: "Continue shopping" }).getAttribute("href")).toBe("/");
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm 2 entries for $2" }));
  await waitFor(() => expect(createPreviewEntry).toHaveBeenCalledOnce());
  const form = createPreviewEntry.mock.calls[0][1] as FormData;
  expect(form.get("offeringSlug")).toBe("playstation-5-slim");
  expect(form.get("quantity")).toBe("2");
  expect(form.get("previousRequestId")).toBe(props.requestHead.requestId);
  await waitFor(() => expect(screen.getByText(/You can stay on this page/)).toBeTruthy());
  expect(refresh).toHaveBeenCalled();
});

test("Crew tiles save a selected real member for email without claiming delivery", async () => {
  sharePrizeWithCrew.mockResolvedValue({ ok: true, queued: 1, alreadyShared: 0, message: "Saved for email delivery to 1 approved Crew member." });
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Notify Jordan" }));
  expect(screen.getByRole("button", { name: "Remove Jordan" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Send to My Crew" }));
  await waitFor(() => expect(sharePrizeWithCrew).toHaveBeenCalledWith(props.slug, [props.crew[0].id]));
  expect(screen.getByRole("button", { name: "Share request saved" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("Saved for email delivery to 1 approved Crew member.")).toBeTruthy();
  expect(screen.getByRole("link", { name: /View the PlayStation 5 Slim Model prize page/ }).getAttribute("href"))
    .toBe("/items/playstation-5-slim");
});

test("Crew rail can be dragged by mouse without disrupting member buttons", () => {
  render(<EntryPageActions {...props} />);
  const rail = screen.getByLabelText("Crew members");
  rail.scrollLeft = 50;
  fireEvent.pointerDown(rail, { pointerType: "mouse", button: 0, pointerId: 1, clientX: 100 });
  fireEvent.pointerMove(rail, { pointerType: "mouse", pointerId: 1, clientX: 70 });
  expect(rail.scrollLeft).toBe(80);
  fireEvent.pointerUp(rail, { pointerType: "mouse", pointerId: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Notify Jordan" }));
  expect(screen.getByRole("button", { name: "Remove Jordan" })).toBeTruthy();
});

test("pending entry can be confirmed here without a checkout redirect", async () => {
  const request = {
    requestId: "22222222-2222-4222-8222-222222222222",
    slug: props.slug, title: props.itemTitle, quantity: 1, amountCents: 100,
    status: "pending" as const, undoUntil: new Date(Date.now() + 30000).toISOString(),
    serverNow: new Date().toISOString(), href: null,
  };
  createPreviewEntry.mockResolvedValue({ status: "request", message: "Reserved", request });
  confirmPendingEntryRequest.mockResolvedValue({ request: { ...request, status: "accepted", href: "/account/entries" } });
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry for $1" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm entry" })).toBeTruthy());
  expect(screen.getByText(/header counts active entries after confirmation/)).toBeTruthy();
  expect(screen.getByText(/Entry submitted · Undo available/).closest("[role='status']")?.className).toContain("receiptBox");
  expect(screen.getByRole("timer", { name: /seconds left to undo/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Undo entry" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry" }));
  await waitFor(() => expect(screen.getByText(/new entry is confirmed and saved in My Activity/)).toBeTruthy());
  expect(confirmPendingEntryRequest).toHaveBeenCalledWith(request.requestId);
  expect(refresh).toHaveBeenCalled();
});

test("an additional entry that closes the pool opens its purchase option", async () => {
  const request = {
    requestId: "22222222-2222-4222-8222-222222222222",
    slug: props.slug, title: props.itemTitle, quantity: 1, amountCents: 100,
    status: "pending" as const, undoUntil: new Date(Date.now() + 30000).toISOString(),
    serverNow: new Date().toISOString(), href: null,
  };
  createPreviewEntry.mockResolvedValue({ status: "request", message: "Reserved", request });
  const destination = "/account/entries?filter=completion&item=playstation-5-slim&entry=ent_1234";
  confirmPendingEntryRequest.mockResolvedValue({ request: { ...request, status: "accepted", href: destination } });
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry for $1" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm entry" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith(destination));
});

test("an additional winning entry goes to the highlighted win in My Activity", async () => {
  const request = {
    requestId: "22222222-2222-4222-8222-222222222222",
    slug: props.slug, title: props.itemTitle, quantity: 1, amountCents: 100,
    status: "pending" as const, undoUntil: new Date(Date.now() + 30000).toISOString(),
    serverNow: new Date().toISOString(), href: null,
  };
  createPreviewEntry.mockResolvedValue({ status: "request", message: "Reserved", request });
  confirmPendingEntryRequest.mockResolvedValue({ request: { ...request, status: "accepted", entryId: "ent_1234",
    href: "/account/wallet?reward=playstation-5-slim&rewardId=11111111-1111-4111-8111-111111111111" } });
  render(<EntryPageActions {...props} remaining={1} />);
  fireEvent.click(screen.getByRole("button", { name: "Add more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry for $1" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm entry" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/entries?filter=prize&viewed=ent_1234"));
});

test("an extra-ticket purchase that fills the pool returns to My Activity even if its receipt is still open", async () => {
  createPreviewEntry.mockResolvedValue({ status: "succeeded", message: "Entry confirmed.",
    href: "/account/entries?filter=active&item=playstation-5-slim&entry=ent_1234", outcome: "active" });
  render(<EntryPageActions {...props} remaining={2} />);
  fireEvent.click(screen.getByRole("button", { name: "Add one extra entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 2 more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm 2 entries for $2" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/entries?viewed=ent_1234"));
});

test("a pending last-ticket purchase returns to My Activity after confirmation", async () => {
  const request = {
    requestId: "22222222-2222-4222-8222-222222222222",
    slug: props.slug, title: props.itemTitle, quantity: 1, amountCents: 100,
    status: "pending" as const, undoUntil: new Date(Date.now() + 30000).toISOString(),
    serverNow: new Date().toISOString(), href: null,
  };
  createPreviewEntry.mockResolvedValue({ status: "request", message: "Reserved", request });
  confirmPendingEntryRequest.mockResolvedValue({ request: { ...request, status: "accepted", entryId: "ent_1234",
    href: "/account/entries?filter=active&item=playstation-5-slim&entry=ent_1234" } });
  render(<EntryPageActions {...props} remaining={1} />);
  fireEvent.click(screen.getByRole("button", { name: "Add more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry for $1" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm entry" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry" }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith("/account/entries?viewed=ent_1234"));
});

test("a stale checkout shows the recovered receipt honestly and uses it for the next attempt", async () => {
  const recoveredId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  createPreviewEntry.mockResolvedValueOnce({
    status: "request", message: "Earlier submission recovered",
    request: { requestId: recoveredId, slug: props.slug, title: props.itemTitle, quantity: 1,
      amountCents: 100, status: "accepted", duplicate: true,
      undoUntil: new Date(Date.now() - 30000).toISOString(), serverNow: new Date().toISOString(),
      href: "/account/entries" },
  }).mockResolvedValueOnce({ status: "succeeded", message: "Entry confirmed.", href: "/account/entries", outcome: "active" });
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry for $1" }));
  await waitFor(() => expect(screen.getByText(/No additional entries were added or charged/)).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Add another entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Add more entries to PlayStation 5" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry for $1" }));
  await waitFor(() => expect(createPreviewEntry).toHaveBeenCalledTimes(2));
  expect((createPreviewEntry.mock.calls[1][1] as FormData).get("previousRequestId")).toBe(recoveredId);
});
