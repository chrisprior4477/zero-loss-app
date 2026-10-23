import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostEntryCrewToast } from "./PostEntryCrewToast";
import type { EntryRequest } from "@/lib/entries/request";

const mocks = vi.hoisted(() => ({ options: vi.fn(), share: vi.fn(), prize: vi.fn(), search: vi.fn(), invite: vi.fn(), phone: vi.fn(), email: vi.fn(), save: vi.fn(), item: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ getCrewShareOptions: mocks.options, shareConfirmedEntryWithCrew: mocks.share, sharePrizeWithCrew: mocks.prize, searchCrewByName: mocks.search, inviteToCrewById: mocks.invite, inviteToCrewByPhone: mocks.phone, inviteToCrew: mocks.email, saveCrewGroup: mocks.save }));
vi.mock("@/lib/sharing/actions", () => ({ getProductShareItem: mocks.item }));
const request: EntryRequest = { requestId: "11111111-1111-4111-8111-111111111111", slug: "test-prize", title: "Test prize", quantity: 1, amountCents: 100, status: "accepted", duplicate: false, undoUntil: "2026-10-22T12:00:30Z", serverNow: "2026-10-22T12:01:00Z", href: "/account/entries" };
const groupId = "22222222-2222-4222-8222-222222222222";
const memberId = "33333333-3333-4333-8333-333333333333";
const options = { ok: true, message: "", memberCount: 1, members: [{ id: memberId, name: "Member" }], groups: [{ id: groupId, name: "Mom", memberCount: 1, memberIds: [memberId] }] };
beforeEach(() => { vi.resetAllMocks(); mocks.item.mockResolvedValue(null); mocks.options.mockResolvedValue(options); Object.defineProperty(navigator, "share", { configurable: true, value: undefined }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function open() { render(<PostEntryCrewToast request={request} onClose={vi.fn()} />); }
async function audiences() { fireEvent.click(screen.getByRole("button", { name: "Share with your Crew" })); fireEvent.click(screen.getByRole("button", { name: /Use my Crew/ })); await screen.findByLabelText(/Everyone in my Crew/); }

test.each(["Not now", "Close sharing toast"])("%s only dismisses; no sharing or membership write", label => {
  const close = vi.fn(); render(<PostEntryCrewToast request={request} onClose={close} />);
  expect(screen.getByRole("heading", { name: /Would you like to share this/ })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(close).toHaveBeenCalledOnce(); expect(mocks.share).not.toHaveBeenCalled(); expect(mocks.options).not.toHaveBeenCalled();
});

test("main Share calls native sharing directly with public listing, not account receipt", async () => {
  const share = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, "share", { configurable: true, value: share });
  open(); fireEvent.click(screen.getByRole("button", { name: "Share…" }));
  expect(share).toHaveBeenCalledWith({ title: request.title, text: expect.stringContaining(request.title), url: `${location.origin}/items/test-prize` });
  await waitFor(() => expect(screen.getByRole("button", { name: "Share…" }).hasAttribute("disabled")).toBe(false));
  expect(screen.queryByText(/Message sent/)).toBeNull(); expect(mocks.share).not.toHaveBeenCalled();
});

test("native cancellation is quiet; failure and unsupported browsers get three compact shortcuts", async () => {
  const share = vi.fn().mockRejectedValueOnce({ name: "AbortError" }).mockRejectedValueOnce(new Error("blocked"));
  Object.defineProperty(navigator, "share", { configurable: true, value: share }); open();
  fireEvent.click(screen.getByRole("button", { name: "Share…" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Share…" }).hasAttribute("disabled")).toBe(false));
  expect(screen.getByRole("heading", { name: /Would you like/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Share…" }));
  expect(await screen.findByRole("heading", { name: "Send to anyone" })).toBeTruthy();
  for (const name of ["Messages", "Email", "Copy link"]) expect(screen.getByRole("button", { name })).toBeTruthy();
});

test("Messages and Email provide optional recipients and real encoded app links", () => {
  open(); fireEvent.click(screen.getByRole("button", { name: "Share…" })); fireEvent.click(screen.getByRole("button", { name: "Messages" }));
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "+1 (202) 555-0123" } });
  const sms = screen.getByRole("link", { name: /Open Messages/ }).getAttribute("href")!;
  expect(sms).toContain("sms:+12025550123?"); expect(decodeURIComponent(sms)).toContain(`${location.origin}/items/test-prize`);
  expect(screen.getByAltText("Test prize sharing picture").getAttribute("src")).toBe("/items/test-prize/opengraph-image");
  fireEvent.click(screen.getByRole("button", { name: /Back/ })); fireEvent.click(screen.getByRole("button", { name: "Email" }));
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "friend@example.test" } });
  expect(screen.getByRole("link", { name: /Open Email/ }).getAttribute("href")).toMatch(/^mailto:friend%40example.test\?subject=/);
});

test("copy denial exposes a selectable public link instead of claiming success", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  open(); fireEvent.click(screen.getAllByRole("button", { name: "Copy link" })[0]);
  expect(await screen.findByLabelText("Product link")).toHaveProperty("value", `${location.origin}/items/test-prize`);
  expect(screen.queryByText(/Link copied/)).toBeNull();
});

test("group audience shares only on explicit confirmation", async () => {
  mocks.share.mockResolvedValue({ ok: true, message: "Shared with selected approved Crew members." }); open(); await audiences();
  fireEvent.click(screen.getByLabelText(/Mom/)); expect(mocks.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Share this pick" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(request.requestId, groupId));
  expect(await screen.findByRole("button", { name: "Done" })).toBeTruthy();
});

test("empty groups cannot expose an entry and offer real creation", async () => {
  mocks.options.mockResolvedValue({ ...options, memberCount: 0, members: [], groups: [{ ...options.groups[0], memberCount: 0, memberIds: [] }] }); open(); await audiences();
  expect(screen.getByRole("button", { name: "Share this pick" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByLabelText(/Mom/).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /Don’t have a Crew/ }));
  expect(screen.getByRole("heading", { name: "Find someone on Zero Loss" })).toBeTruthy();
});

test("create group persists exact approved members before adding the saved choice", async () => {
  mocks.save.mockResolvedValue({ ok: true, message: "Group saved." }); open(); await audiences();
  fireEvent.click(screen.getByRole("button", { name: /Create a new group/ }));
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Family" } }); fireEvent.click(screen.getByLabelText("Member"));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ group: { id: expect.any(String), name: "Family", memberIds: [memberId], contacts: [] }, remove: false }));
  expect(await screen.findByLabelText(/Family/)).toHaveProperty("checked", true); expect(mocks.share).not.toHaveBeenCalled();
});

test("private email lookup does not enumerate accounts or send until Add to Crew", async () => {
  mocks.email.mockResolvedValue({ ok: true, message: "If a confirmed account matches, they can approve your request." });
  open(); fireEvent.click(screen.getByRole("button", { name: "Share with your Crew" })); fireEvent.click(screen.getByRole("button", { name: /Find someone on Zero Loss/ }));
  fireEvent.change(screen.getByLabelText("Name, email address, or phone number"), { target: { value: "friend@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Search for a member" })); expect(mocks.search).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew" }));
  await waitFor(() => expect(mocks.email).toHaveBeenCalledWith("friend@example.test"));
  expect(mocks.share).not.toHaveBeenCalled(); expect(await screen.findByText(/If a confirmed account matches/)).toBeTruthy();
});

test("manual item sharing uses approved recipient ids without creating an entry", async () => {
  mocks.prize.mockResolvedValue({ ok: true, message: "Saved for email delivery." });
  render(<PostEntryCrewToast product={{ slug: request.slug, title: request.title }} onClose={vi.fn()} />); await audiences();
  fireEvent.click(screen.getByRole("button", { name: "Send item to Crew" }));
  await waitFor(() => expect(mocks.prize).toHaveBeenCalledWith(request.slug, [memberId])); expect(mocks.share).not.toHaveBeenCalled();
});

test("server failure remains retryable without claiming success", async () => {
  mocks.share.mockRejectedValue(new Error("offline")); open(); await audiences();
  fireEvent.click(screen.getByRole("button", { name: "Share this pick" })); expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull(); expect(screen.getByRole("button", { name: "Share this pick" }).hasAttribute("disabled")).toBe(false);
});
