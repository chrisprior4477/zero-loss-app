import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrewDisplaySettings } from "./CrewDisplaySettings";

const { saveCrewDisplaySettings, saveCrewGroup, inviteToCrew, inviteToCrewByPhone } = vi.hoisted(() => ({ saveCrewDisplaySettings: vi.fn(), saveCrewGroup: vi.fn(), inviteToCrew: vi.fn(), inviteToCrewByPhone: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ saveCrewDisplaySettings, saveCrewGroup, inviteToCrew, inviteToCrewByPhone }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const pick = "33333333-3333-4333-8333-333333333333";

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

test("removes a saved group from the profile within the inline editor", async () => {
  saveCrewGroup.mockResolvedValue({ ok: true, message: "Group removed." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[{ id: first, name: "Family", memberIds: [] }]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByRole("button", { name: /Add people to group/ }));
  fireEvent.click(screen.getByRole("button", { name: "Remove group" }));
  await waitFor(() => expect(saveCrewGroup).toHaveBeenCalledWith({ group: { id: first, name: "Family", memberIds: [] }, remove: true }));
  await waitFor(() => expect(screen.getByText(/No groups yet/)).toBeTruthy());
});

test("search discoverability remains separate from pick audience", async () => {
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved to your profile." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByLabelText(/Let other members find my display name in Crew search/i));
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
  expect(await screen.findByText(/Mom saved to your profile · 0 approved members · 1 saved contacts/)).toBeTruthy();
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
