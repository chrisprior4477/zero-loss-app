import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EntryPageActions } from "./EntryPageActions";

const createPreviewEntry = vi.hoisted(() => vi.fn());
const confirmPendingEntryRequest = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
vi.mock("@/lib/entries/actions", () => ({ createPreviewEntry, confirmPendingEntryRequest, resolvePendingEntryRequest: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./EntryOutcomeEmailPreference", () => ({ EntryOutcomeEmailPreference: () => null }));
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); });

const props = {
  itemTitle: "PlayStation 5 Slim Model",
  slug: "playstation-5-slim",
  remaining: 6,
  entryPriceCents: 100,
  balanceCents: 2400,
  entryEnabled: true,
  requestKey: "11111111-1111-4111-8111-111111111111",
  crew: [{ id: "member-1", name: "Jordan", avatarUrl: null }],
  senderName: "Chris",
  emailEnabled: true,
  returnHref: "/account/entries?viewed=ent_11111111111111111111111111111111",
};

test("additional entries are reviewed and confirmed on the same page", async () => {
  createPreviewEntry.mockResolvedValue({ status: "succeeded", message: "2 entries confirmed.", href: "/account/entries", outcome: "active" });
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Add one extra entry" }));
  fireEvent.click(screen.getByRole("button", { name: "Add 2 more entries" }));
  expect(screen.getByText(/2 separate entries × \$1 =/)).toBeTruthy();
  expect(screen.queryByRole("link", { name: /Review 2 more entries/ })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm 2 entries for $2" }));
  await waitFor(() => expect(createPreviewEntry).toHaveBeenCalledOnce());
  const form = createPreviewEntry.mock.calls[0][1] as FormData;
  expect(form.get("offeringSlug")).toBe("playstation-5-slim");
  expect(form.get("quantity")).toBe("2");
  await waitFor(() => expect(screen.getByText(/You can stay on this page/)).toBeTruthy());
  expect(refresh).toHaveBeenCalled();
});

test("Crew tiles select blue-to-green and show an honest preview acknowledgement", async () => {
  render(<EntryPageActions {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Notify Jordan" }));
  expect(screen.getByRole("button", { name: "Remove Jordan" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Send to My Crew" }));
  expect(screen.getByRole("button", { name: "Crew preview prepared" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("No emails or messages were actually delivered.")).toBeTruthy();
  expect(screen.getByRole("link", { name: /View the PlayStation 5 Slim Model prize page/ }).getAttribute("href"))
    .toBe("/items/playstation-5-slim");
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
  fireEvent.click(screen.getByRole("button", { name: "Add one more entry" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /approve this demo entry transaction/i }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry for $1" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm entry" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Confirm entry" }));
  await waitFor(() => expect(screen.getByText(/new entry is confirmed and saved in My Activity/)).toBeTruthy());
  expect(confirmPendingEntryRequest).toHaveBeenCalledWith(request.requestId);
  expect(refresh).toHaveBeenCalled();
});
