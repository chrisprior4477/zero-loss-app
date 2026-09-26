import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrewDisplaySettings } from "./CrewDisplaySettings";

const { saveCrewDisplaySettings } = vi.hoisted(() => ({ saveCrewDisplaySettings: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ saveCrewDisplaySettings }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const pick = "33333333-3333-4333-8333-333333333333";

test("creates multiple named groups and assigns a shared pick to a chosen group", async () => {
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved to your profile." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[{ id: first, name: "Ari" }, { id: second, name: "Maya" }]} sharedPicks={[{ id: pick, title: "Gift card", retailer: "Walmart", image: null }]} />);
  const name = screen.getByLabelText("New group name");
  fireEvent.change(name, { target: { value: "Family" } });
  fireEvent.click(screen.getByRole("button", { name: /Create group/ }));
  fireEvent.change(name, { target: { value: "Friends" } });
  fireEvent.click(screen.getByRole("button", { name: /Create group/ }));
  expect(screen.getByDisplayValue("Family")).toBeTruthy();
  expect(screen.getByDisplayValue("Friends")).toBeTruthy();
  fireEvent.click(screen.getAllByLabelText("Ari")[0]);
  fireEvent.click(screen.getAllByLabelText("Maya")[1]);
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

test("search discoverability remains separate from pick audience", async () => {
  saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Saved to your profile." });
  render(<CrewDisplaySettings available initialDiscoverable={false} initialDefaultRule={{ audience: "everyone", memberIds: [], groupIds: [] }} initialGroups={[]} initialEntryRules={{}} members={[]} sharedPicks={[]} />);
  fireEvent.click(screen.getByLabelText(/Let other members find my display name in Crew search/i));
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(saveCrewDisplaySettings).toHaveBeenCalledWith(expect.objectContaining({ discoverable: true, defaultRule: { audience: "everyone", memberIds: [], groupIds: [] } })));
});
