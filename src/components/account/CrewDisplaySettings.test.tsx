import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrewDisplaySettings } from "./CrewDisplaySettings";

const { saveCrewDisplaySettings, saveCrewGroup, inviteToCrew, inviteToCrewByPhone } = vi.hoisted(() => ({ saveCrewDisplaySettings: vi.fn(), saveCrewGroup: vi.fn(), inviteToCrew: vi.fn(), inviteToCrewByPhone: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ saveCrewDisplaySettings, saveCrewGroup, inviteToCrew, inviteToCrewByPhone }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.clearAllMocks(); vi.useRealTimers(); });

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const pick = "33333333-3333-4333-8333-333333333333";

test("a refreshed group editor restores its draft and detects an edit saved in another tab", () => {
  const initial = { ownerId: first, available: true, initialDiscoverable: false,
    initialDefaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] },
    initialGroups: [{ id: second, name: "Family", memberIds: [] }], initialEntryRules: {}, members: [], sharedPicks: [] };
  const firstView = render(<CrewDisplaySettings {...initial} />);
  fireEvent.click(screen.getByRole("button", { name: "Add people to group" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Group name" }), { target: { value: "Family trip" } });
  firstView.unmount();
  const refreshed = render(<CrewDisplaySettings {...initial} initialGroups={[{ ...initial.initialGroups[0], name: "Family reunion" }]} />);
  expect(screen.getByRole("textbox", { name: "Group name" })).toHaveProperty("value", "Family trip");
  expect(screen.getByRole("button", { name: "Save group" })).toHaveProperty("disabled", true);
  expect(saveCrewGroup).not.toHaveBeenCalled();
  refreshed.unmount();
  render(<CrewDisplaySettings {...initial} ownerId={pick} />);
  expect(screen.queryByRole("textbox", { name: "Group name" })).toBeNull();
});

test("cleanup's unchanged empty audiences do not block a privacy-only save", async () => {
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved" });
  const empty = { audience: "groups" as const, memberIds: [], groupIds: [] };
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{ [pick]: empty }} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByLabelText(/Find me by display name/i));
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledOnce());
  expect(saveCrewDisplaySettings.mock.calls[0][0]).toMatchObject({ entryRules: {}, expected: { entryRules: {} } });
  expect(Object.keys(saveCrewDisplaySettings.mock.calls[0][0].entryRules)).toHaveLength(0);
});

test("Crew Privacy keeps the save button before the collapsed pick editor and saves both edits together", async () => {
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved" });
  render(<CrewDisplaySettings
    available embedded section="privacy" initialDiscoverable={false}
    initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }}
    initialGroups={[]} initialEntryRules={{}} members={[]}
    sharedPicks={[{ id: pick, title: "Switch", retailer: "Best Buy", image: null }]}
  />);

  const save = screen.getByRole("button", { name: "OK · Save to my profile" });
  const disclosure = screen.getByText("Choose who sees what").closest("details");
  expect(disclosure?.open).toBe(false);
  expect(disclosure?.textContent).toContain("1 shared pick");
  expect(save.compareDocumentPosition(disclosure!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

  fireEvent.click(screen.getByLabelText(/Find me by display name/i));
  fireEvent.click(screen.getByText("Choose who sees what").closest("summary")!);
  expect(disclosure?.open).toBe(true);
  fireEvent.change(screen.getByRole("combobox", { name: "Who can see this pick?" }), { target: { value: "everyone" } });
  fireEvent.click(screen.getByRole("button", { name: /Back to Save/ }));
  expect(document.activeElement).toBe(save);
  expect(saveCrewDisplaySettings).not.toHaveBeenCalled();

  fireEvent.click(save);
  await screen.findByText("Saved");
  expect(saveCrewDisplaySettings).toHaveBeenCalledOnce();
  expect(saveCrewDisplaySettings).toHaveBeenCalledWith(expect.objectContaining({
    discoverable: true,
    entryRules: { [pick]: { audience: "everyone", memberIds: [], groupIds: [] } },
  }));
});

test("a newly chosen empty audience still needs a deliberate selection", () => {
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByRole("radio", { name: /Only selected groups/ }));
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  expect(screen.getByRole("alert").textContent).toContain("Choose at least one group");
  expect(saveCrewDisplaySettings).not.toHaveBeenCalled();
});

test("confirmed group removal updates the baseline before a later privacy save", async () => {
  saveCrewGroup.mockResolvedValue({ ok: true, message: "Removed" });
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved" });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[{ id: first, name: "Family", memberIds: [] }]} initialEntryRules={{ [pick]: { audience: "groups", memberIds: [], groupIds: [first] } }} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  await screen.findByText(/Family removed from your profile/);
  fireEvent.click(await screen.findByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledOnce());
  expect(saveCrewDisplaySettings.mock.calls[0][0].expected.entryRules).toEqual({});
});

test("an unsaved privacy edit survives a refresh that adds a group", async () => {
  const initial = { available: true, initialDiscoverable: false, initialDefaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] }, initialGroups: [], initialEntryRules: {}, members: [], sharedPicks: [] };
  const latestGroups = [{ id: first, name: "New group from another tab", memberIds: [] }];
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved", settings: { discoverable: true, discovery: { real: true, email: true, phone: true }, defaultRule: initial.initialDefaultRule, groups: latestGroups, entryRules: {} } });
  const view = render(<CrewDisplaySettings {...initial} />);
  fireEvent.click(screen.getByLabelText(/Find me by display name/i));
  view.rerender(<CrewDisplaySettings {...initial} initialGroups={latestGroups} />);
  expect(screen.getByText("New group from another tab")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledOnce());
  expect(saveCrewDisplaySettings.mock.calls[0][0]).toMatchObject({ discoverable: true, expected: { discoverable: false } });
  expect(await screen.findByText("New group from another tab")).toBeTruthy();
});

test("a group draft stays open through another group's update and warns on a same-group conflict", () => {
  const family = { id: first, name: "Family", memberIds: [] };
  const friends = { id: second, name: "Friends", memberIds: [] };
  const props = { available: true, embedded: true, section: "groups" as const, initialDiscoverable: false, initialDefaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] }, initialEntryRules: {}, members: [], sharedPicks: [] };
  const view = render(<CrewDisplaySettings {...props} initialGroups={[family, friends]} />);
  fireEvent.click(screen.getAllByRole("button", { name: "Add people to group" })[0]);
  const name = screen.getByRole("textbox", { name: "Group name" });
  fireEvent.change(name, { target: { value: "Family weekend" } });
  name.focus();
  const updatedFriends = { ...friends, name: "School friends" };
  view.rerender(<CrewDisplaySettings {...props} initialGroups={[family, updatedFriends]} />);
  expect(screen.getByText("School friends")).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Group name" })).toBe(name);
  expect(document.activeElement).toBe(name);
  view.rerender(<CrewDisplaySettings {...props} initialGroups={[{ ...family, name: "Family trip" }, updatedFriends]} />);
  expect(name).toHaveProperty("value", "Family weekend");
  expect(screen.getByRole("alert").textContent).toContain("This group changed in another tab");
  expect(screen.getByRole("button", { name: "Save group" })).toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("button", { name: "Load saved group" }));
  expect(name).toHaveProperty("value", "Family trip");
  expect(screen.getByRole("button", { name: "Save group" })).toHaveProperty("disabled", false);
  expect(saveCrewGroup).not.toHaveBeenCalled();
});

test("account settings framing keeps every existing sharing control available", () => {
  render(<CrewDisplaySettings withinAccountSettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  expect(screen.getByRole("heading", { level: 2, name: "How to display my picks" })).toBeTruthy();
  expect(screen.getByText("Choose who sees what").closest("details")).toHaveProperty("open", false);
  for (const name of ["Can people find me?", "Who sees my shared picks by default?", "Make your own groups"]) {
    expect(screen.getByRole("heading", { name })).toBeTruthy();
  }
  expect(screen.getByRole("button", { name: "OK · Save to my profile" })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Back to Your Crew/ })).toBeTruthy();
  expect(saveCrewDisplaySettings).not.toHaveBeenCalled();
});

test("creates multiple named groups and assigns a shared pick to a chosen group", async () => {
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved to your profile." });
  saveCrewGroup.mockResolvedValue({ ok: true, message: "Group saved." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[{ id: first, name: "Ari" }, { id: second, name: "Maya" }]} sharedPicks={[{ id: pick, title: "Gift card", retailer: "Walmart", image: null }]} />);
  const name = screen.getByLabelText("New group name");
  fireEvent.change(name, { target: { value: "Family" } });
  fireEvent.click(screen.getByRole("button", { name: /Create group/ }));
  expect(screen.getByText("Your groups").compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save group" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "+ Add Ari" }));
  expect(screen.getByRole("button", { name: "Remove Ari from Family" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(saveCrewGroup).toHaveBeenCalledWith(expect.objectContaining({ group: expect.objectContaining({ name: "Family", memberIds: [first] }), remove: false })));
  fireEvent.change(name, { target: { value: "Friends" } });
  fireEvent.click(screen.getByRole("button", { name: /Create group/ }));
  expect(screen.getByText("Family")).toBeTruthy();
  expect(screen.getByDisplayValue("Friends")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "+ Add Maya" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove Maya from Friends" }));
  expect(screen.getByRole("button", { name: "+ Add Maya" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "+ Add Maya" }));
  fireEvent.click(screen.getByText("Choose who sees what").closest("summary")!);
  fireEvent.change(screen.getByLabelText("Who can see this pick?"), { target: { value: "groups" } });
  fireEvent.click(screen.getByLabelText("Family"));
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledOnce());
  const saved = saveCrewDisplaySettings.mock.calls[0][0];
  expect(saved).not.toHaveProperty("groups");
  expect(saved.expected).not.toHaveProperty("groups");
  expect(saved.entryRules[pick]).toMatchObject({ audience: "groups", groupIds: [saveCrewGroup.mock.calls[0][0].group.id] });
  expect(screen.getByDisplayValue("Friends")).toBeTruthy();
});

test("only removes a saved group after countdown confirmation, leaving other groups intact", async () => {
  saveCrewGroup.mockResolvedValue({ ok: true, message: "Group removed." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[{ id: first, name: "Family", memberIds: [] }, { id: second, name: "Friends", memberIds: [] }]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Add people to group/ })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
  expect(saveCrewGroup).not.toHaveBeenCalled();
  expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("30 seconds");
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  const family = { id: first, name: "Family", memberIds: [] };
  await waitFor(() => expect(saveCrewGroup).toHaveBeenCalledWith({ group: family, remove: true, expected: family }));
  await waitFor(() => expect(screen.queryByText("Family")).toBeNull());
  expect(screen.getByText("Friends")).toBeTruthy();
});

test.each(["Undo", "timeout", "collapse"])("%s preserves a saved group without a removal request", mode => {
  vi.useFakeTimers();
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[{ id: first, name: "Family", memberIds: [] }]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
  if (mode === "Undo") fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  else if (mode === "collapse") fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  act(() => vi.advanceTimersByTime(31_000));
  expect(saveCrewGroup).not.toHaveBeenCalled();
  expect(screen.getByText("Family")).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Confirm group removal" })).toBeNull();
  if (mode !== "collapse") expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove group" }));
});

test("failed removal keeps the group and allows a deliberate retry", async () => {
  saveCrewGroup.mockResolvedValueOnce({ ok: false, message: "Couldn’t confirm removal. Please try again." }).mockResolvedValueOnce({ ok: true });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[{ id: first, name: "Family", memberIds: [] }]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Couldn’t confirm removal. Please try again.");
  expect(screen.getByText("Family")).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: "Confirm removal" }));
  await waitFor(() => expect(screen.getByText(/No groups yet/)).toBeTruthy());
  expect(saveCrewGroup).toHaveBeenCalledTimes(2);
});

test("discarding a never-saved group needs no countdown or server removal", () => {
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.change(screen.getByLabelText("New group name"), { target: { value: "Draft" } });
  fireEvent.click(screen.getByRole("button", { name: /Create group/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
  expect(screen.getByText(/No groups yet/)).toBeTruthy();
  expect(screen.queryByRole("timer")).toBeNull();
  expect(saveCrewGroup).not.toHaveBeenCalled();
});

test("search discoverability remains separate from pick audience", async () => {
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved to your profile." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByLabelText(/Find me by display name/i));
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledWith(expect.objectContaining({ discoverable: true, defaultRule: { audience: "everyone", memberIds: [], groupIds: [] } })));
});

test.each(["saved", "offline"] as const)("privacy locks every audience input during a slow save (%s)", async outcome => {
  let finish!: (value: { ok: boolean; message: string }) => void;
  let disconnect!: (reason: Error) => void;
  saveCrewDisplaySettings.mockImplementationOnce(() => new Promise((resolve, reject) => {
    finish = resolve;
    disconnect = reject;
  }));
  saveCrewDisplaySettings.mockResolvedValueOnce({ ok: true, message: "Saved to your profile." });
  render(<CrewDisplaySettings available embedded section="privacy" initialDiscoverable={false}
    initialDefaultRule={{ audience: "people", memberIds: [first], groupIds: [] }}
    initialGroups={[{ id: second, name: "Football", memberIds: [first] }]}
    initialEntryRules={{ [pick]: { audience: "groups", memberIds: [], groupIds: [second] } }}
    members={[{ id: first, name: "Ari" }]}
    sharedPicks={[{ id: pick, title: "Gift card", retailer: "Walmart", image: null }]} />);

  const discover = screen.getByLabelText(/Find me by display name/) as HTMLInputElement;
  const everyone = screen.getByRole("radio", { name: /Everyone in my Crew/ }) as HTMLInputElement;
  const person = screen.getByRole("checkbox", { name: "Ari" }) as HTMLInputElement;
  const group = screen.getByRole("checkbox", { name: "Football" }) as HTMLInputElement;
  const pickAudience = screen.getByRole("combobox", { name: "Who can see this pick?" }) as HTMLSelectElement;
  const save = screen.getByRole("button", { name: "OK · Save to my profile" }) as HTMLButtonElement;
  fireEvent.click(discover);
  fireEvent.click(save);

  const controls = [...screen.getAllByRole<HTMLInputElement>("radio"), discover, person, group, pickAudience, save];
  for (const control of controls) expect(control.disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("temporarily locked");
  everyone.click();
  person.click();
  group.click();
  save.click();
  expect(everyone.checked).toBe(false);
  expect(person.checked).toBe(true);
  expect(group.checked).toBe(true);
  expect(saveCrewDisplaySettings).toHaveBeenCalledOnce();

  await act(async () => {
    if (outcome === "saved") finish({ ok: true, message: "Saved to your profile." });
    else disconnect(new Error("offline"));
  });
  for (const control of controls) expect(control.disabled).toBe(false);
  expect(discover.checked).toBe(true);
  expect(person.checked).toBe(true);
  expect(pickAudience.value).toBe("groups");
  expect(group.checked).toBe(true);
  if (outcome === "offline") expect(screen.getByRole("alert").textContent).toContain("Your edits are still here");
  else expect(screen.getByRole("status").textContent).toBe("Saved to your profile.");

  fireEvent.click(everyone);
  expect(screen.queryByText("Saved to your profile.")).toBeNull();
  fireEvent.click(save);
  expect(await screen.findByText("Saved to your profile.")).toBeTruthy();
  expect(saveCrewDisplaySettings).toHaveBeenNthCalledWith(2, expect.objectContaining({
    discoverable: true, defaultRule: expect.objectContaining({ audience: "everyone" }),
  }));
});

test("Mom contact details save and reappear without silently inviting or granting access", async () => {
  saveCrewGroup.mockResolvedValue({ ok: true, message: "Saved." });
  const props = { available: true, embedded: true, initialDiscoverable: false, initialDefaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] }, initialEntryRules: {}, members: [], sharedPicks: [] };
  const view = render(<CrewDisplaySettings {...props} initialGroups={[{ id: first, name: "Mom", memberIds: [] }]} />);
  expect(screen.queryByRole("heading", { name: "How to display my picks" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Mom Contact" } });
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+1.202.555.0123" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "mom@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Add contact to group" }));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(saveCrewGroup).toHaveBeenCalledOnce());
  const group = saveCrewGroup.mock.calls[0][0].group;
  expect(group.memberIds).toEqual([]);
  expect(group.contacts).toEqual([expect.objectContaining({ name: "Mom Contact", phone: "+1-202-555-0123", email: "mom@example.test" })]);
  expect(await screen.findByText(/Mom saved to your profile · 0 connected members · 1 saved contacts/)).toBeTruthy();
  expect(inviteToCrew).not.toHaveBeenCalled(); expect(inviteToCrewByPhone).not.toHaveBeenCalled();
  view.unmount();
  render(<CrewDisplaySettings {...props} initialGroups={[group]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  expect(screen.getByText("Mom Contact")).toBeTruthy();
  expect(screen.getByText(/mom@example.test/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add to Crew by email" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add to Crew by phone" })).toBeTruthy();
});

test("failed group save keeps the editor and draft available for retry", async () => {
  saveCrewGroup.mockRejectedValue(new Error("offline"));
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[{ id: first, name: "Mom", memberIds: [] }]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  expect(await screen.findByText(/Couldn’t confirm the save/)).toBeTruthy();
  expect(screen.getByDisplayValue("Mom")).toBeTruthy();
  expect(await screen.findByRole("button", { name: "Save group" })).toBeTruthy();
});
