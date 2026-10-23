import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostEntryCrewToast } from "./PostEntryCrewToast";
import type { EntryRequest } from "@/lib/entries/request";
const mocks = vi.hoisted(() => ({ options: vi.fn(), share: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ getCrewShareOptions: mocks.options, shareConfirmedEntryWithCrew: mocks.share }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const request: EntryRequest = { requestId: "11111111-1111-4111-8111-111111111111", slug: "test-prize", title: "Test prize", quantity: 1, amountCents: 100, status: "accepted", duplicate: false, undoUntil: "2026-10-22T12:00:30Z", serverNow: "2026-10-22T12:01:00Z", href: "/account/entries" };
const groupId = "22222222-2222-4222-8222-222222222222";

test("dismissal keeps the entry private without fetching or sharing", () => {
  const close = vi.fn();
  render(<PostEntryCrewToast request={request} onClose={close} />);
  expect(screen.getByRole("heading", { name: /Would you like this pool/ })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Not now · keep private" }));
  expect(close).toHaveBeenCalledOnce();
  expect(mocks.options).not.toHaveBeenCalled(); expect(mocks.share).not.toHaveBeenCalled();
});

test("shares only after choosing a saved group and pressing Share this pick", async () => {
  mocks.options.mockResolvedValue({ ok: true, memberCount: 3, groups: [{ id: groupId, name: "Mom", memberCount: 1 }] });
  mocks.share.mockResolvedValue({ ok: true, message: "Shared with your selected approved Crew members." });
  render(<PostEntryCrewToast request={request} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Share with Crew" }));
  fireEvent.change(await screen.findByLabelText("Who would you like to share with?"), { target: { value: groupId } });
  expect(mocks.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Share this pick" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(request.requestId, groupId));
  expect(await screen.findByRole("button", { name: "Done" })).toBeTruthy();
});

test("contact-only groups explain approval and cannot share", async () => {
  mocks.options.mockResolvedValue({ ok: true, memberCount: 0, groups: [{ id: groupId, name: "Mom", memberCount: 0 }] });
  render(<PostEntryCrewToast request={request} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Share with Crew" }));
  fireEvent.change(await screen.findByLabelText("Who would you like to share with?"), { target: { value: groupId } });
  expect(screen.getByRole("button", { name: "Share this pick" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText(/No approved members/)).toBeTruthy();
  expect(screen.getByRole("link", { name: /Create or manage groups/ }).getAttribute("href")).toBe("/account/crew#crew-groups");
  expect(screen.getByRole("link", { name: "Add friends from phone contacts" }).getAttribute("href")).toBe("/account/crew#crew-search");
});

test("sharing failure offers a retry without claiming success", async () => {
  mocks.options.mockResolvedValue({ ok: true, memberCount: 1, groups: [] });
  mocks.share.mockRejectedValue(new Error("offline"));
  render(<PostEntryCrewToast request={request} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Share with Crew" }));
  fireEvent.click(await screen.findByRole("button", { name: "Share this pick" }));
  expect(await screen.findByText(/Sharing wasn’t confirmed/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
});
