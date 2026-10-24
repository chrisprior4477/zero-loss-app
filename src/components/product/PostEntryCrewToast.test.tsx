import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostEntryCrewToast } from "./PostEntryCrewToast";
import type { EntryRequest } from "@/lib/entries/request";

const mocks = vi.hoisted(() => ({ options: vi.fn(), share: vi.fn(), prize: vi.fn(), search: vi.fn(), invite: vi.fn(), phone: vi.fn(), email: vi.fn(), save: vi.fn(), item: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ getCrewShareOptions: mocks.options, shareConfirmedEntryWithCrew: mocks.share, sharePrizeWithCrew: mocks.prize, searchCrewByName: mocks.search, inviteToCrewById: mocks.invite, inviteToCrewByPhone: mocks.phone, inviteToCrew: mocks.email, saveCrewGroup: mocks.save }));
vi.mock("@/lib/sharing/receiving-actions", () => ({ prepareProductShareLink: vi.fn(async () => null) }));
vi.mock("@/lib/sharing/actions", () => ({ getProductShareItem: mocks.item }));
const request: EntryRequest = { requestId: "11111111-1111-4111-8111-111111111111", slug: "test-prize", title: "Test prize", quantity: 1, amountCents: 100, status: "accepted", duplicate: false, undoUntil: "2026-10-22T12:00:30Z", serverNow: "2026-10-22T12:01:00Z", href: "/account/entries" };
const groupId = "22222222-2222-4222-8222-222222222222";
const memberId = "33333333-3333-4333-8333-333333333333";
const options = { ok: true, message: "", memberCount: 1, members: [{ id: memberId, name: "Member" }], groups: [{ id: groupId, name: "Mom", memberCount: 1, memberIds: [memberId] }] };
beforeEach(() => {
  vi.resetAllMocks(); mocks.item.mockResolvedValue(null); mocks.options.mockResolvedValue(options);
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.show = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function open() { render(<PostEntryCrewToast request={request} onClose={vi.fn()} />); }
async function audiences() { fireEvent.click(screen.getByRole("button", { name: "Share with your Crew" })); fireEvent.click(screen.getByRole("button", { name: /Use my Crew/ })); await screen.findByLabelText(/Everyone in my Crew/); }

test("perforated home exposes Text and Email directly with just one Copy link", () => {
  open();
  expect(screen.getByText("Or send directly")).toBeTruthy();
  for (const name of ["Text", "Email"]) {
    expect(screen.getByRole("button", { name }).closest("details")).toBeNull();
  }
  expect(screen.getAllByRole("button", { name: "Copy link" })).toHaveLength(1);
  expect(screen.queryByText("Messages & email shortcuts")).toBeNull();
});

test("email starts with three app choices and keeps advanced options collapsed", () => {
  open(); fireEvent.click(screen.getByRole("button", { name: "Email" }));
  expect(screen.getByRole("heading", { name: "Email this item" })).toBeTruthy();
  const apps = screen.getByRole("region", { name: "Email apps" });
  expect(apps.querySelectorAll("a")).toHaveLength(3);
  for (const link of apps.querySelectorAll("a")) expect(link.getAttribute("href")).toBeTruthy();
  expect(screen.getByText("Add recipient · optional").closest("details")).toHaveProperty("open", false);
  expect(screen.getByText("Preview & other email options").closest("details")).toHaveProperty("open", false);
  fireEvent.click(screen.getByText("Preview & other email options"));
  const work = new URL(screen.getByRole("link", { name: /Outlook for work or school/ }).getAttribute("href")!);
  expect(work.hostname).toBe("outlook.office.com");
  expect(work.search).not.toContain("+");
  expect(screen.getByLabelText("Message with item link")).toHaveProperty("value", expect.stringContaining("/items/test-prize"));
});

test("invalid optional email blocks handoff and reveals the field to correct", () => {
  open(); fireEvent.click(screen.getByRole("button", { name: "Email" }));
  const recipient = screen.getByLabelText("Email address");
  fireEvent.change(recipient, { target: { value: "not-an-email" } });
  fireEvent.click(screen.getByText("Gmail").closest("a")!);
  expect(screen.getByRole("alert").textContent).toContain("Enter a valid email");
  expect(recipient.closest("details")).toHaveProperty("open", true);
  expect(document.activeElement).toBe(recipient);
  fireEvent.change(recipient, { target: { value: "" } });
  expect(screen.getByRole("link", { name: /Gmail in browser/ }).getAttribute("href")).toBeTruthy();
  expect(mocks.share).not.toHaveBeenCalled(); expect(mocks.prize).not.toHaveBeenCalled();
});

test.each([
  [/^Outlook in browser/, "outlook.live.com", "subject"],
  [/Outlook for work or school/, "outlook.office.com", "subject"],
  [/Gmail in browser/, "mail.google.com", "su"],
] as const)("%s opens a complete draft directly without clipboard or a paste screen", (label, host, subjectKey) => {
  const write = vi.fn();
  const writeText = vi.fn();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write, writeText } });
  open(); fireEvent.click(screen.getByRole("button", { name: "Email" }));
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "friend+gift@example.test" } });
  const link = screen.getByRole("link", { name: label });
  const draft = new URL(link.getAttribute("href")!);
  expect(draft.hostname).toBe(host);
  expect(draft.searchParams.get(subjectKey)).toBe(request.title);
  expect(draft.searchParams.get("to")).toBe("friend+gift@example.test");
  expect(draft.searchParams.get("body")).toBe(`Thought you might like Test prize on Zero Loss. Take a look:\n${location.origin}/items/test-prize`);
  expect(draft.search).not.toContain("+");
  expect(link.getAttribute("target")).toBe("_blank");
  expect(fireEvent.click(link)).toBe(true);
  expect(write).not.toHaveBeenCalled();
  expect(writeText).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Email this item" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Copy formatted/ })).toBeNull();
  expect(screen.getByRole("status").textContent).not.toMatch(/paste/i);
});

test.each(["Not now", "Close sharing toast"])("%s only dismisses; no sharing or membership write", label => {
  const close = vi.fn(); render(<PostEntryCrewToast request={request} onClose={close} />);
  expect(screen.getByRole("heading", { name: "Share this find" })).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
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
  expect(screen.getByRole("heading", { name: "Share this find" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Share…" }));
  expect(await screen.findByRole("heading", { name: "Send to anyone" })).toBeTruthy();
  for (const name of ["Text", "Email", "Copy link"]) expect(screen.getByRole("button", { name })).toBeTruthy();
});

test("Text and Email provide optional recipients and real encoded app links", () => {
  open(); fireEvent.click(screen.getByRole("button", { name: "Text" }));
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "+1 (202) 555-0123" } });
  const sms = screen.getByRole("link", { name: /Send text/ }).getAttribute("href")!;
  expect(sms).toContain("sms:+12025550123?"); expect(decodeURIComponent(sms)).toContain(`${location.origin}/items/test-prize`);
  expect(screen.getByAltText("Test prize sharing picture").getAttribute("src")).toBe("/items/test-prize/opengraph-image");
  fireEvent.click(screen.getByRole("button", { name: /Back/ })); fireEvent.click(screen.getByRole("button", { name: "Email" }));
  fireEvent.click(screen.getByText("Add recipient · optional"));
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "friend@example.test" } });
  expect(screen.getByRole("link", { name: /Use my default email app/ }).getAttribute("href")).toMatch(/^mailto:friend%40example.test\?subject=/);
  for (const name of [/Outlook in browser/, /Gmail in browser/]) {
    const url = new URL(screen.getByRole("link", { name }).getAttribute("href")!);
    expect(url.searchParams.get("to")).toBe("friend@example.test");
    expect(url.searchParams.get("subject") ?? url.searchParams.get("su")).toBe(request.title);
    expect(url.searchParams.get("body")).toContain(`${location.origin}/items/test-prize`);
  }
});

test("copy denial exposes a selectable public link instead of claiming success", async () => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
  open(); fireEvent.click(screen.getAllByRole("button", { name: "Copy link" })[0]);
  expect(await screen.findByLabelText("Product link")).toHaveProperty("value", `${location.origin}/items/test-prize`);
  expect(screen.queryByText(/Link copied/)).toBeNull();
});

test("group audience shares only on explicit confirmation", async () => {
  mocks.share.mockResolvedValue({ ok: true, message: "Shared with selected approved Crew members." }); open(); await audiences();
  fireEvent.click(screen.getByRole("radio", { name: "Share with Mom" })); expect(mocks.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Share this pick" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(request.requestId, groupId));
  expect(await screen.findByRole("button", { name: "Done" })).toBeTruthy();
});

test("empty groups cannot expose an entry and offer real creation", async () => {
  mocks.options.mockResolvedValue({ ...options, memberCount: 0, members: [], groups: [{ ...options.groups[0], memberCount: 0, memberIds: [] }] }); open(); await audiences();
  expect(screen.getByRole("button", { name: "Share this pick" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByRole("radio", { name: "Share with Mom" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: /Don’t have a Crew/ }));
  expect(screen.getByRole("heading", { name: "Find someone on Zero Loss" })).toBeTruthy();
});

test("create group persists exact approved members before adding the saved choice", async () => {
  mocks.save.mockResolvedValue({ ok: true, message: "Group saved." }); open(); await audiences();
  fireEvent.click(screen.getByRole("button", { name: /Create a new group/ }));
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Family" } }); fireEvent.click(screen.getByLabelText("Member"));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ group: { id: expect.any(String), name: "Family", memberIds: [memberId], contacts: [] }, remove: false }));
  expect(await screen.findByRole("radio", { name: "Share with Family" })).toHaveProperty("checked", true); expect(mocks.share).not.toHaveBeenCalled();
});

test.each(["Add People to Mom", "Edit Mom"])("%s edits the existing group without erasing saved contacts", async label => {
  const contacts = [{ id: request.requestId, name: "Saved contact", email: "saved@example.test", phone: "" }];
  mocks.options.mockResolvedValue({ ...options, groups: [{ ...options.groups[0], contacts }] });
  mocks.save.mockResolvedValue({ ok: true, message: "Mom saved." }); open(); await audiences();
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(screen.getByLabelText("Group name")).toHaveProperty("value", "Mom");
  expect(screen.getByLabelText("Member")).toHaveProperty("checked", true);
  fireEvent.click(screen.getByLabelText("Member"));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ group: { id: groupId, name: "Mom", memberIds: [], contacts }, remove: false }));
  expect(await screen.findByRole("radio", { name: "Share with Mom" })).toHaveProperty("disabled", true);
  expect(mocks.share).not.toHaveBeenCalled();
});

test("empty groups stay editable and Crew Add People opens private discovery", async () => {
  mocks.options.mockResolvedValue({ ...options, memberCount: 0, members: [], groups: [{ ...options.groups[0], memberCount: 0, memberIds: [] }] });
  open(); await audiences(); fireEvent.click(screen.getByRole("button", { name: "Add People to Mom" }));
  expect(screen.getByRole("heading", { name: "Add people to your group" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Find someone to add to my Crew" }));
  expect(screen.getByRole("heading", { name: "Find someone on Zero Loss" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  expect(screen.getByLabelText("Group name")).toHaveProperty("value", "Mom");
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add People to my Crew" }));
  expect(screen.getByRole("heading", { name: "Find someone on Zero Loss" })).toBeTruthy();
});

test("desktop dialog restores page scroll and focus after unmount", () => {
  const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
  const { unmount } = render(<PostEntryCrewToast request={request} onClose={vi.fn()} />);
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Share this find" }));
  unmount(); expect(document.body.style.overflow).not.toBe("hidden"); expect(document.activeElement).toBe(trigger); trigger.remove();
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
  await waitFor(() => expect(mocks.prize).toHaveBeenCalledWith(request.slug, [memberId], null)); expect(mocks.share).not.toHaveBeenCalled();
});

test("manual group shares keep their group identity in the recipient link", async () => {
  mocks.prize.mockResolvedValue({ ok: true, message: "Saved for email delivery." });
  render(<PostEntryCrewToast product={{ slug: request.slug, title: request.title }} onClose={vi.fn()} />);
  await audiences();
  fireEvent.click(screen.getByRole("radio", { name: "Share with Mom" }));
  fireEvent.click(screen.getByRole("button", { name: "Send item to Crew" }));
  await waitFor(() => expect(mocks.prize).toHaveBeenCalledWith(request.slug, [memberId], groupId));
});

test("server failure remains retryable without claiming success", async () => {
  mocks.share.mockRejectedValue(new Error("offline")); open(); await audiences();
  fireEvent.click(screen.getByRole("button", { name: "Share this pick" })); expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull(); expect(screen.getByRole("button", { name: "Share this pick" }).hasAttribute("disabled")).toBe(false);
});
