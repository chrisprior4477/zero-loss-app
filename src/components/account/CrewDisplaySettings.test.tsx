import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrewDisplaySettings } from "./CrewDisplaySettings";

const { saveCrewDisplaySettings, saveCrewGroup, inviteToCrew, inviteToCrewByPhone } = vi.hoisted(() => ({ saveCrewDisplaySettings: vi.fn(), saveCrewGroup: vi.fn(), inviteToCrew: vi.fn(), inviteToCrewByPhone: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ saveCrewDisplaySettings, saveCrewGroup, inviteToCrew, inviteToCrewByPhone }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const pick = "33333333-3333-4333-8333-333333333333";

test("an older draft retains its original baseline and adopts merged groups after saving", async () => {
  const initial = { available: true, initialDiscoverable: false, initialDefaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] }, initialGroups: [], initialEntryRules: {}, members: [], sharedPicks: [] };
  const latestGroups = [{ id: first, name: "New group from another tab", memberIds: [] }];
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved", settings: { discoverable: true, discovery: { real: true, email: true, phone: true }, defaultRule: initial.initialDefaultRule, groups: latestGroups, entryRules: {} } });
  const view = render(<CrewDisplaySettings {...initial} />);
  fireEvent.click(screen.getByLabelText(/Find me by display name/i));
  view.rerender(<CrewDisplaySettings {...initial} initialGroups={latestGroups} />);
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledOnce());
  expect(saveCrewDisplaySettings.mock.calls[0][0].expected.groups).toEqual([]);
  expect(await screen.findByText("New group from another tab")).toBeTruthy();
});

test("account settings framing keeps every existing sharing control available", () => {
  render(<CrewDisplaySettings withinAccountSettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  expect(screen.getByRole("heading", { level: 2, name: "How to display my picks" })).toBeTruthy();
  for (const name of ["Can people find me?", "Who sees my shared picks by default?", "Make your own groups", "Choose who sees what"]) {
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
  fireEvent.change(screen.getByLabelText("Who can see this pick?"), { target: { value: "groups" } });
  fireEvent.click(screen.getByLabelText("Family"));
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledOnce());
  const saved = saveCrewDisplaySettings.mock.calls[0][0];
  expect(saved.groups).toHaveLength(2);
  expect(saved.groups[0]).toMatchObject({ name: "Family", memberIds: [first] });
  expect(saved.groups[1]).toMatchObject({ name: "Friends", memberIds: [second] });
  expect(saved.entryRules[pick]).toMatchObject({ audience: "groups", groupIds: [saved.groups[0].id] });
});

test("only removes a saved group after countdown confirmation, leaving other groups intact", async () => {
  saveCrewGroup.mockResolvedValue({ ok: true, message: "Group removed." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[{ id: first, name: "Family", memberIds: [] }, { id: second, name: "Friends", memberIds: [] }]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Add people to group/ })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
  expect(saveCrewGroup).not.toHaveBeenCalled();
  expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("30 seconds");
  fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
  await waitFor(() => expect(saveCrewGroup).toHaveBeenCalledWith({ group: { id: first, name: "Family", memberIds: [] }, remove: true }));
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

test("Mom contact details save and reappear without silently inviting or granting access", async () => {
  saveCrewGroup.mockResolvedValue({ ok: true, message: "Saved." });
  const props = { available: true, embedded: true, initialDiscoverable: false, initialDefaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] }, initialEntryRules: {}, members: [], sharedPicks: [] };
  const view = render(<CrewDisplaySettings {...props} initialGroups={[{ id: first, name: "Mom", memberIds: [] }]} />);
  expect(screen.queryByRole("heading", { name: "How to display my picks" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Mom Contact" } });
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "+12025550123" } });
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "mom@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: "Add contact to group" }));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await waitFor(() => expect(saveCrewGroup).toHaveBeenCalledOnce());
  const group = saveCrewGroup.mock.calls[0][0].group;
  expect(group.memberIds).toEqual([]);
  expect(group.contacts).toEqual([expect.objectContaining({ name: "Mom Contact", phone: "+12025550123", email: "mom@example.test" })]);
  expect(await screen.findByText(/Mom saved to your profile · 0 connected members · 1 saved contacts/)).toBeTruthy();
  expect(inviteToCrew).not.toHaveBeenCalled(); expect(inviteToCrewByPhone).not.toHaveBeenCalled();
  view.unmount();
  render(<CrewDisplaySettings {...props} initialGroups={[group]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  expect(screen.getByText("Mom Contact")).toBeTruthy();
  expect(screen.getByText(/mom@example.test/)).toBeTruthy();
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
