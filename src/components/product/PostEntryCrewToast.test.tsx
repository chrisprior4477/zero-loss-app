import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PostEntryCrewToast } from "./PostEntryCrewToast";
import type { EntryRequest } from "@/lib/entries/request";

const mocks = vi.hoisted(() => ({ options: vi.fn(), share: vi.fn(), prize: vi.fn(), win: vi.fn(), search: vi.fn(), invite: vi.fn(), phone: vi.fn(), email: vi.fn(), save: vi.fn(), item: vi.fn(), contact: vi.fn(), remove: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ getCrewShareOptions: mocks.options, shareConfirmedEntryWithCrew: mocks.share, sharePrizeWithCrew: mocks.prize, shareWinWithCrew: mocks.win, searchCrewByName: mocks.search, inviteToCrewById: mocks.invite, inviteToCrewByPhone: mocks.phone, inviteToCrew: mocks.email, saveCrewGroup: mocks.save, saveCrewMemberContact: mocks.contact, removeCrewMember: mocks.remove }));
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
afterEach(() => { cleanup(); vi.useRealTimers(); Reflect.deleteProperty(navigator, "contacts"); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function open() { render(<PostEntryCrewToast request={request} onClose={vi.fn()} />); }
async function audiences() { fireEvent.click(screen.getByRole("button", { name: "Share with Crew" })); await screen.findByRole("button", { name: "Send to my Crew" }); }
async function groups() { fireEvent.click(screen.getByRole("button", { name: "Choose a group" })); await screen.findByRole("checkbox", { name: "Share with Mom" }); }

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
  await groups();
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Mom" })); expect(mocks.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send to Mom" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(request.requestId, groupId));
  expect(await screen.findByRole("button", { name: "Done" })).toBeTruthy();
});

test("the group name selects the audience while Edit and Add people stay separate", async () => {
  open(); await audiences(); await groups();
  fireEvent.click(screen.getByText("Mom", { exact: true }));
  expect(screen.getByRole("checkbox", { name: "Share with Mom" })).toHaveProperty("checked", true);
  expect(screen.getByRole("heading", { name: "Share with my groups" })).toBeTruthy();
  expect(screen.queryByLabelText("Group name")).toBeNull();
  expect(screen.getByRole("button", { name: "Send to Mom" })).toHaveProperty("disabled", false);
  expect(mocks.share).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit Mom" }));
  expect(screen.getByLabelText("Group name")).toHaveProperty("value", "Mom");
});

test("several selected groups stay checked and confirmed entries share with every chosen group", async () => {
  const second = "44444444-4444-4444-8444-444444444444";
  mocks.options.mockResolvedValue({ ...options, groups: [...options.groups, { id: second, name: "Friends", memberIds: [memberId], memberCount: 1 }] });
  mocks.share.mockResolvedValue({ ok: true, message: "Shared." });
  open(); await audiences(); await groups();
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Mom" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Friends" }));
  expect(screen.getByRole("checkbox", { name: "Share with Mom" })).toHaveProperty("checked", true);
  expect(screen.getByRole("checkbox", { name: "Share with Friends" })).toHaveProperty("checked", true);
  fireEvent.click(screen.getByRole("button", { name: "Send to 2 groups" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(request.requestId, [groupId, second]));
  expect(await screen.findByRole("heading", { name: "Shared with 2 groups" })).toBeTruthy();
});

test("item sharing combines overlapping groups into one unique recipient list", async () => {
  const second = "44444444-4444-4444-8444-444444444444";
  mocks.options.mockResolvedValue({ ...options, groups: [...options.groups, { id: second, name: "Friends", memberIds: [memberId], memberCount: 1 }] });
  mocks.prize.mockResolvedValue({ ok: true, message: "Saved." });
  render(<PostEntryCrewToast product={{ slug: request.slug, title: request.title }} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Share with group(s)" }));
  await screen.findByRole("checkbox", { name: "Share with Mom" });
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Mom" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Friends" }));
  fireEvent.click(screen.getByRole("button", { name: "Send to 2 groups" }));
  await waitFor(() => expect(mocks.prize).toHaveBeenCalledWith(request.slug, [memberId], null));
  expect(mocks.prize).toHaveBeenCalledOnce();
});

test("larger audiences use safe delivery batches without an audience selection cap", async () => {
  const people = Array.from({ length: 21 }, (_, i) => ({ id: `50000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, name: `Member ${i + 1}` }));
  mocks.options.mockResolvedValue({ ...options, memberCount: 21, members: people, groups: [{ ...options.groups[0], memberCount: 21, memberIds: people.map(person => person.id) }] });
  mocks.prize.mockResolvedValue({ ok: true, message: "Saved." });
  render(<PostEntryCrewToast product={{ slug: request.slug, title: request.title }} onClose={vi.fn()} />);
  await audiences();
  fireEvent.click(screen.getByRole("button", { name: "Send to my Crew" }));
  await waitFor(() => expect(mocks.prize).toHaveBeenCalledTimes(2));
  expect(mocks.prize.mock.calls[0][1]).toHaveLength(20);
  expect(mocks.prize.mock.calls[1][1]).toEqual([people[20].id]);
});

test("an empty selected group becomes sendable after explicitly adding a Crew member", async () => {
  mocks.options.mockResolvedValue({ ...options, groups: [{ ...options.groups[0], memberCount: 0, memberIds: [] }] });
  mocks.save.mockResolvedValue({ ok: true, message: "Saved." });
  mocks.share.mockResolvedValue({ ok: true, message: "Shared." });
  open(); await audiences(); await groups();
  fireEvent.click(screen.getByText("Mom", { exact: true }));
  expect(screen.getByText("Add people to Mom to send this item.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Send to Mom" })).toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("button", { name: "Add People to Mom" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to group" }));
  await screen.findByText("Member added to your Crew and Mom.");
  fireEvent.click(screen.getByRole("button", { name: "Done · back to sharing" }));
  fireEvent.click(screen.getByRole("button", { name: "Send to Mom" }));
  await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(request.requestId, groupId));
});

test("manual win sharing uses the existing owner-checked win action for the selected Crew", async () => {
  mocks.win.mockResolvedValue({ ok: true, message: "Win update shared." });
  render(<PostEntryCrewToast product={{ slug: request.slug, title: request.title, image: "/test.png", retailer: "Best Buy", value: 400, win: { rewardId: request.requestId, demo: true } }} onClose={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "Share your win" })).toBeTruthy();
  expect(mocks.win).not.toHaveBeenCalled();
  await audiences();
  await groups();
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Mom" }));
  fireEvent.click(screen.getByRole("button", { name: "Send to Mom" }));
  await waitFor(() => expect(mocks.win).toHaveBeenCalledWith(request.requestId, [memberId]));
  expect(mocks.prize).not.toHaveBeenCalled();
});

test("empty groups cannot expose an entry and offer real creation", async () => {
  mocks.options.mockResolvedValue({ ...options, memberCount: 0, members: [], groups: [{ ...options.groups[0], memberCount: 0, memberIds: [] }] }); open(); await audiences();
  expect(screen.getByRole("button", { name: "Send to my Crew" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Add People to my Crew" }));
  expect(screen.getByRole("heading", { name: "Add people" })).toBeTruthy();
});

test("create group persists exact approved members before adding the saved choice", async () => {
  mocks.save.mockResolvedValue({ ok: true, message: "Group saved." }); open(); await audiences();
  await groups();
  fireEvent.click(screen.getByRole("button", { name: /Create a new group/ }));
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Family" } }); fireEvent.click(screen.getByLabelText("Member"));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ group: { id: expect.any(String), name: "Family", memberIds: [memberId], contacts: [] }, remove: false }));
  expect(await screen.findByRole("checkbox", { name: "Share with Family" })).toHaveProperty("checked", true); expect(mocks.share).not.toHaveBeenCalled();
});

test("editing the existing group does not erase saved contacts", async () => {
  const contacts = [{ id: request.requestId, name: "Saved contact", email: "saved@example.test", phone: "" }];
  mocks.options.mockResolvedValue({ ...options, groups: [{ ...options.groups[0], contacts }] });
  mocks.save.mockResolvedValue({ ok: true, message: "Mom saved." }); open(); await audiences();
  await groups();
  fireEvent.click(screen.getByRole("button", { name: "Edit Mom" }));
  expect(screen.getByLabelText("Group name")).toHaveProperty("value", "Mom");
  expect(screen.getByLabelText("Member")).toHaveProperty("checked", true);
  fireEvent.click(screen.getByLabelText("Member"));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ group: { id: groupId, name: "Mom", memberIds: [], contacts }, remove: false }));
  expect(await screen.findByRole("checkbox", { name: "Share with Mom" })).toHaveProperty("checked", true);
  expect(screen.getByRole("button", { name: "Send to Mom" })).toHaveProperty("disabled", true);
  expect(mocks.share).not.toHaveBeenCalled();
});

test("empty groups stay editable and Crew Add People opens private discovery", async () => {
  mocks.options.mockResolvedValue({ ...options, memberCount: 0, members: [], groups: [{ ...options.groups[0], memberCount: 0, memberIds: [] }] });
  open(); await audiences(); await groups(); fireEvent.click(screen.getByRole("button", { name: "Edit Mom" }));
  expect(screen.getByRole("heading", { name: "Edit your group" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Find someone to add to my Crew" }));
  expect(screen.getByRole("heading", { name: "Add people" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  expect(screen.getByLabelText("Group name")).toHaveProperty("value", "Mom");
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  fireEvent.click(screen.getByRole("button", { name: /Back/ }));
  fireEvent.click(screen.getByRole("button", { name: "Add People to my Crew" }));
  expect(screen.getByRole("heading", { name: "Add people" })).toBeTruthy();
});

test.each([false, true])("sharing uses a modal and restores scroll/focus at either breakpoint (desktop: %s)", desktop => {
  vi.stubGlobal("matchMedia", () => ({ matches: desktop, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
  const show = vi.spyOn(HTMLDialogElement.prototype, "show");
  const trigger = document.createElement("button"); document.body.append(trigger); trigger.focus();
  const { unmount } = render(<PostEntryCrewToast request={request} onClose={vi.fn()} />);
  expect(showModal).toHaveBeenCalledOnce();
  expect(show).not.toHaveBeenCalled();
  expect(document.body.style.overflow).toBe("hidden");
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Share this find" }));
  unmount(); expect(document.body.style.overflow).not.toBe("hidden"); expect(document.activeElement).toBe(trigger); trigger.remove();
});

test("Not now remains after every sharing option in the home action order", () => {
  open();
  expect(screen.getAllByRole("button").map(button => button.textContent)).toEqual([
    "×", "Share…", "Copy link", "Share with Crew", "Share with group(s)", "Find & add someone", "Text", "Email", "Not now",
  ]);
});

test("private email lookup does not enumerate accounts or send until Add to Crew", async () => {
  mocks.email.mockResolvedValue({ ok: true, message: "Added where a matching account allows connections." });
  open(); fireEvent.click(screen.getByRole("button", { name: "Find & add someone" })); await screen.findByText("Member");
  fireEvent.change(screen.getByLabelText("Name, email address, or phone number"), { target: { value: "friend@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Search for a member" })); expect(mocks.search).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew" }));
  await waitFor(() => expect(mocks.email).toHaveBeenCalledWith("friend@example.test"));
  expect(mocks.share).not.toHaveBeenCalled(); expect(await screen.findByText(/Lookup saved/)).toBeTruthy();
});

test("manual item sharing uses approved recipient ids without creating an entry", async () => {
  mocks.prize.mockResolvedValue({ ok: true, message: "Saved for email delivery." });
  render(<PostEntryCrewToast product={{ slug: request.slug, title: request.title }} onClose={vi.fn()} />); await audiences();
  fireEvent.click(screen.getByRole("button", { name: "Send to my Crew" }));
  await waitFor(() => expect(mocks.prize).toHaveBeenCalledWith(request.slug, [memberId], null)); expect(mocks.share).not.toHaveBeenCalled();
});

test("the phone row adds through the real Crew action only on a separate tap", async () => {
  mocks.phone.mockResolvedValue({ ok: true, message: "Added where a matching account allows connections." });
  open(); fireEvent.click(screen.getByRole("button", { name: "Text" }));
  expect(screen.queryByText("Texting from a Windows PC?")).toBeNull();
  expect(screen.queryByText("Copy the message instead")).toBeNull();
  const input = screen.getByLabelText(/Phone number/);
  fireEvent.change(input, { target: { value: "+1 (202) 555-0123" } });
  expect(mocks.phone).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew" }));
  await waitFor(() => expect(mocks.phone).toHaveBeenCalledWith("+1 (202) 555-0123"));
  expect(await screen.findByRole("button", { name: "Added" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("link", { name: /See your Crew/ }).getAttribute("href")).toBe("/account/crew#crew-intro");
  fireEvent.change(input, { target: { value: "12025550123" } });
  expect(screen.getByRole("button", { name: "Added" })).toHaveProperty("disabled", true);
  expect(mocks.share).not.toHaveBeenCalled(); expect(mocks.prize).not.toHaveBeenCalled();
});

test("contacts require an explicit picker tap and selecting a number does not add or share it", async () => {
  const select = vi.fn().mockResolvedValue([{ name: ["Chosen friend"], tel: ["+12025550123"] }]);
  Object.defineProperty(navigator, "contacts", { configurable: true, value: { select } });
  open(); fireEvent.click(screen.getByRole("button", { name: "Text" }));
  fireEvent.click(screen.getByRole("button", { name: "Add people from your phone" }));
  expect(select).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Choose from phone contacts" }));
  await waitFor(() => expect(screen.getByLabelText(/Phone number/)).toHaveProperty("value", "+12025550123"));
  expect(select).toHaveBeenCalledWith(["name", "tel", "email"], { multiple: false });
  expect(mocks.phone).not.toHaveBeenCalled(); expect(mocks.share).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Add to Crew" })).toHaveProperty("disabled", false);
});

test("unsupported contact browsers offer manual entry without claiming access", async () => {
  open(); fireEvent.click(screen.getByRole("button", { name: "Text" }));
  fireEvent.click(screen.getByRole("button", { name: "Add people from your phone" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose from phone contacts" }));
  expect(await screen.findByRole("status")).toHaveProperty("textContent", expect.stringContaining("doesn’t offer phone contacts"));
  fireEvent.click(screen.getByRole("button", { name: "Enter details instead" }));
  expect(screen.getByLabelText(/Phone number/)).toHaveProperty("value", "");
  expect(mocks.phone).not.toHaveBeenCalled();
});

test("named members show an added confirmation; a failed add remains retryable", async () => {
  mocks.options.mockResolvedValue({ ...options, members: [], memberCount: 0 });
  mocks.search.mockResolvedValue({ ok: true, message: "Choose someone.", people: [{ memberId, name: "Alex", avatarUrl: null }] });
  mocks.invite.mockResolvedValueOnce({ ok: false, message: "This connection is unavailable." }).mockResolvedValueOnce({ ok: true, message: "Added to your Crew." });
  open(); fireEvent.click(screen.getByRole("button", { name: "Find & add someone" }));
  fireEvent.change(screen.getByLabelText("Name, email address, or phone number"), { target: { value: "Alex" } });
  fireEvent.click(screen.getByRole("button", { name: "Search for a member" }));
  fireEvent.click(await screen.findByRole("button", { name: "Add to Crew" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "This connection is unavailable.");
  expect(screen.queryByRole("button", { name: "Added" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew" }));
  expect(await screen.findByText("Alex added to your Crew.")).toBeTruthy();
  expect(screen.getByRole("button", { name: "✓ Added" })).toHaveProperty("disabled", true);
});

test("groups have to be selected before sending and success returns to the underlying page", async () => {
  const close = vi.fn();
  mocks.share.mockResolvedValue({ ok: true, message: "Shared with your selected Crew members." });
  render(<PostEntryCrewToast request={request} onClose={close} />);
  fireEvent.click(screen.getByRole("button", { name: "Share with group(s)" }));
  await screen.findByRole("checkbox", { name: "Share with Mom" });
  expect(screen.getByRole("button", { name: "Send to my groups" })).toHaveProperty("disabled", true);
  expect(screen.queryByLabelText(/Everyone in my Crew/)).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Mom" }));
  expect(mocks.share).not.toHaveBeenCalled();
  vi.useFakeTimers();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Send to Mom" })); });
  expect(mocks.share).toHaveBeenCalledWith(request.requestId, groupId);
  expect(screen.getByRole("heading", { name: "Shared with Mom" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Your share is saved");
  expect(close).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(2500));
  expect(close).toHaveBeenCalledOnce();
});

test("manual group shares keep their group identity in the recipient link", async () => {
  mocks.prize.mockResolvedValue({ ok: true, message: "Saved for email delivery." });
  render(<PostEntryCrewToast product={{ slug: request.slug, title: request.title }} onClose={vi.fn()} />);
  await audiences();
  await groups();
  fireEvent.click(screen.getByRole("checkbox", { name: "Share with Mom" }));
  fireEvent.click(screen.getByRole("button", { name: "Send to Mom" }));
  await waitFor(() => expect(mocks.prize).toHaveBeenCalledWith(request.slug, [memberId], groupId));
});

test("the Crew send uses all Crew members without selecting a group", async () => {
  mocks.share.mockResolvedValue({ ok: true, message: "Shared." }); open(); await audiences();
  const crewSend = screen.getByRole("button", { name: "Send to my Crew" });
  expect(screen.queryByRole("checkbox", { name: "Share with Mom" })).toBeNull();
  fireEvent.click(crewSend);
  await waitFor(() => expect(mocks.share).toHaveBeenCalledWith(request.requestId, null));
});

test("home opens group sharing directly without selecting everyone", async () => {
  open(); fireEvent.click(screen.getByRole("button", { name: "Share with group(s)" }));
  await screen.findByRole("checkbox", { name: "Share with Mom" });
  expect(screen.queryByRole("button", { name: "Send to my Crew" })).toBeNull();
  expect(screen.getByRole("button", { name: "Send to my groups" })).toHaveProperty("disabled", true);
  expect(mocks.share).not.toHaveBeenCalled();
});

test("saving a chosen phone contact requires a group and preserves its existing people and contacts", async () => {
  const existing = { id: request.requestId, name: "Existing", phone: "", email: "existing@example.test" };
  mocks.options.mockResolvedValue({ ...options, groups: [{ ...options.groups[0], contacts: [existing] }] });
  mocks.save.mockResolvedValueOnce({ ok: false, message: "Please try again." }).mockResolvedValue({ ok: true, message: "Saved." });
  const select = vi.fn().mockResolvedValue([{ name: ["Chosen friend"], tel: ["+12025550123"] }]);
  Object.defineProperty(navigator, "contacts", { configurable: true, value: { select } });
  open(); fireEvent.click(screen.getByRole("button", { name: "Text" }));
  fireEvent.click(screen.getByRole("button", { name: "Add people from your phone" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose from phone contacts" }));
  fireEvent.click(await screen.findByRole("button", { name: "Save Chosen friend to a group" }));
  await screen.findByRole("radio", { name: "Mom" });
  expect(mocks.save).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Save contact to group" })).toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("radio", { name: "Mom" }));
  fireEvent.click(screen.getByRole("button", { name: "Save contact to group" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Please try again.");
  expect(screen.queryByText(/is now saved in Mom/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save contact to group" }));
  expect(await screen.findByText("Chosen friend is now saved in Mom. No message was sent.")).toBeTruthy();
  expect(mocks.save).toHaveBeenLastCalledWith({ group: { id: groupId, name: "Mom", memberIds: [memberId], contacts: [existing, { id: expect.any(String), name: "Chosen friend", phone: "+12025550123", email: "" }] }, remove: false });
  expect(mocks.phone).not.toHaveBeenCalled(); expect(mocks.share).not.toHaveBeenCalled(); expect(mocks.prize).not.toHaveBeenCalled();
});

test("server failure remains retryable without claiming success", async () => {
  mocks.share.mockRejectedValue(new Error("offline")); open(); await audiences();
  fireEvent.click(screen.getByRole("button", { name: "Send to my Crew" })); expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Done" })).toBeNull(); expect(screen.getByRole("button", { name: "Send to my Crew" }).hasAttribute("disabled")).toBe(false);
});

test("typing a name shows suggestions without Search and keeps the result after adding", async () => {
  const newId = "44444444-4444-4444-8444-444444444444";
  mocks.search.mockResolvedValue({ ok: true, message: "", people: [{ memberId: newId, name: "Test Customer 4", avatarUrl: null }] });
  mocks.invite.mockResolvedValue({ ok: true, message: "Added." });
  mocks.options.mockResolvedValueOnce(options).mockResolvedValue({ ...options, memberCount: 2, members: [...options.members, { id: newId, name: "Test Customer 4" }] });
  open(); fireEvent.click(screen.getByRole("button", { name: "Find & add someone" }));
  await screen.findByText("Member");
  fireEvent.change(screen.getByLabelText("Name, email address, or phone number"), { target: { value: "Test" } });
  fireEvent.click(await screen.findByRole("button", { name: "Add to Crew" }));
  expect(await screen.findByText("Test Customer 4 added to your Crew.")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Save this contact" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByLabelText("Name, email address, or phone number")).toHaveProperty("value", "");
  expect(screen.getByRole("button", { name: "✓ Added" })).toHaveProperty("disabled", true);
  expect(screen.getAllByTitle("Sample portrait").length).toBeGreaterThan(0);
  expect(mocks.invite).toHaveBeenCalledWith(newId);
});

test("adding an existing Crew member to a group saves its members and preserves contacts", async () => {
  const contacts = [{ id: request.requestId, name: "Saved", phone: "", email: "saved@example.test" }];
  mocks.options.mockResolvedValue({ ...options, groups: [{ ...options.groups[0], memberCount: 0, memberIds: [], contacts }] });
  mocks.save.mockResolvedValue({ ok: true, message: "Saved." });
  open(); await audiences(); await groups();
  fireEvent.click(screen.getByRole("button", { name: "Add People to Mom" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to group" }));
  expect(await screen.findByText("Member added to your Crew and Mom.")).toBeTruthy();
  expect(mocks.invite).not.toHaveBeenCalled();
  expect(mocks.save).toHaveBeenCalledWith({ group: { id: groupId, name: "Mom", memberIds: [memberId], contacts }, remove: false });
  fireEvent.click(screen.getByRole("button", { name: "Done · back to sharing" }));
  expect(screen.getByRole("button", { name: "Send to Mom" })).toHaveProperty("disabled", false);
});

test("Crew list has a direct send action and saves edited contact details with retry", async () => {
  mocks.contact.mockResolvedValueOnce({ ok: false, message: "Please try again." }).mockResolvedValue({ ok: true, message: "Saved." });
  open(); await audiences(); fireEvent.click(screen.getByRole("button", { name: "See & Edit your Crew" }));
  expect(screen.getByRole("button", { name: "Send to my Crew" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Back to sharing" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Edit Member" }));
  fireEvent.change(screen.getByLabelText("Name for your Crew"), { target: { value: "Mom" } });
  fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: "1111111111" } });
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "mom@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Save contact" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Please try again.");
  fireEvent.click(screen.getByRole("button", { name: "Save contact" }));
  expect(await screen.findByText("Mom saved to your Crew.")).toBeTruthy();
  expect(mocks.contact).toHaveBeenLastCalledWith(memberId, { name: "Mom", phone: "1111111111", email: "mom@example.test" });
  fireEvent.click(screen.getByRole("button", { name: "Edit Mom" }));
  expect(screen.getByLabelText(/Phone number/)).toHaveProperty("value", "1111111111");
  expect(screen.getByLabelText(/Email address/)).toHaveProperty("value", "mom@example.test");
  expect(mocks.invite).not.toHaveBeenCalled(); expect(mocks.share).not.toHaveBeenCalled();
});

test("contact deletion requires confirmation and removes the exact Crew member", async () => {
  mocks.remove.mockResolvedValue({ ok: true, message: "Removed." });
  open(); await audiences(); fireEvent.click(screen.getByRole("button", { name: "See & Edit your Crew" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Member" }));
  expect(mocks.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Yes, delete contact" }));
  expect(await screen.findByText("Member removed from your Crew.")).toBeTruthy();
  expect(mocks.remove).toHaveBeenCalledWith(memberId);
  expect(screen.queryByRole("button", { name: "Edit Member" })).toBeNull();
  expect(screen.getByRole("button", { name: "Send to my Crew" })).toHaveProperty("disabled", true);
});

test("group deletion can be cancelled and deletes only the saved group after confirmation", async () => {
  mocks.save.mockResolvedValue({ ok: true, message: "Removed." });
  open(); await audiences(); await groups(); fireEvent.click(screen.getByRole("button", { name: "Edit Mom" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete this group" }));
  expect(mocks.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("button", { name: "Yes, delete group" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Delete this group" }));
  fireEvent.click(screen.getByRole("button", { name: "Yes, delete group" }));
  expect(await screen.findByText("Mom deleted. The people are still in your Crew.")).toBeTruthy();
  expect(mocks.save).toHaveBeenCalledWith({ group: { id: groupId, name: "Mom", memberIds: [memberId], contacts: [] }, remove: true });
  expect(mocks.remove).not.toHaveBeenCalled();
});
