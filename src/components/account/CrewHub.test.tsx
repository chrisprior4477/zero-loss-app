import { crewViewReturnKey } from "@/lib/crew/view-return";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CrewHub } from "./CrewHub";
import { CrewSearchPanel } from "./CrewSearchDialog";
import { addSampleCrewPreview } from "@/lib/crew/sample-preview";
import { walletHistoryHref, walletRewardHref, type ActivityItem } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { parseCrewTab } from "@/lib/crew/navigation";

const actions = vi.hoisted(() => ({
  inviteToCrew: vi.fn(),
  inviteToCrewById: vi.fn(),
  inviteToCrewByPhone: vi.fn(),
  searchCrewByName: vi.fn(),
  removeCrewConnection: vi.fn(),
  respondToCrewRequest: vi.fn(),
  setCrewDiscoverable: vi.fn(),
  setEntryCrewSharing: vi.fn(),
  getCrewSharedPicks: vi.fn(),
  setCrewShareBack: vi.fn(),
  requestCrewInvitationFromLink: vi.fn(),
  saveCrewGroup: vi.fn(),
  saveCrewDisplaySettings: vi.fn(),
}));

vi.mock("@/lib/crew/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));

beforeEach(() => {
  window.history.replaceState({}, "", "/account/crew");
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  localStorage.clear();
  vi.clearAllMocks();
  actions.searchCrewByName.mockResolvedValue({ ok: true, message: "Choose someone to send a Crew request.", people: [{ memberId: "33333333-3333-4333-8333-333333333333", name: "Sam Test", avatarUrl: null }] });
  actions.inviteToCrewById.mockResolvedValue({ ok: true, message: "Crew request sent." });
  actions.inviteToCrewByPhone.mockResolvedValue({ ok: true, message: "Request saved." });
  actions.inviteToCrew.mockResolvedValue({ ok: true, message: "Request saved." });
  actions.getCrewSharedPicks.mockResolvedValue({ ok: true, picks: [] });
  actions.requestCrewInvitationFromLink.mockResolvedValue({ ok: true, message: "Crew request sent." });
  actions.saveCrewGroup.mockResolvedValue({ ok: true, message: "Group saved." });
  actions.saveCrewDisplaySettings.mockResolvedValue({ ok: true, message: "Settings saved." });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });

const statusReward: ActivityItem = {
  slug: "playstation-5-slim", title: "PlayStation 5 Slim Model", retailer: "Best Buy",
  image: "/catalog/playstation-5-slim.png", status: "prize", rewardKind: "digital",
  priceCents: 65000, paidCents: 100, remainingCents: 64900, availability: "Ready",
  rewardStatus: "ready", rewardId: "reward-one",
};

test.each([1, 2])("Crew retains the account ticket strip with live values and destinations (%s ready rewards)", count => {
  const activity = [
    ...Array.from({ length: count }, (_, i) => ({ ...statusReward, rewardId: `reward-${i}` })),
    { ...statusReward, rewardId: "redeemed", rewardStatus: "redeemed" as const },
    ...Array.from({ length: 2 }, (_, i) => ({ ...statusReward, status: "completion" as const, rewardId: null, rewardStatus: null, entryId: `entry-${i}` })),
  ];
  const { container } = render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" overview={{ balanceLabel: "$978", fundingEnabled: true, activity: { isPreview: true, source: "stored", activeCount: 0, activity } }} />);
  const overview = container.querySelector('[aria-label="Your account overview"]')!;
  expect(overview.querySelectorAll('[data-size="top"]')).toHaveLength(3);
  expect(within(overview as HTMLElement).getByRole("link", { name: "Playable Wallet: $978" }).getAttribute("href")).toBe(walletHistoryHref);
  expect(within(overview as HTMLElement).getByRole("link", { name: "Add funds" }).getAttribute("href")).toBe(`${walletHistoryHref}#add-funds`);
  expect(within(overview as HTMLElement).getByRole("link", { name: `Prize Ready: ${count}. View reward${count === 1 ? "" : "s"}` }).getAttribute("href")).toBe(count === 1 ? walletRewardHref(activity[0]) : accountRoutes.rewards);
  expect(within(overview as HTMLElement).getByRole("link", { name: "Purchase Options: 2. Continue with Purchase" }).getAttribute("href")).toBe(accountRoutes.purchaseOptions);
});

test("account tickets keep unavailable states and disabled funding without inventing zero balances", () => {
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" overview={{ balanceLabel: "Unavailable", fundingEnabled: false, activity: { isPreview: false, source: "unavailable", activeCount: null, activity: [] } }} />);
  expect(screen.getByRole("link", { name: "Playable Wallet: Unavailable" }).getAttribute("href")).toBe(walletHistoryHref);
  expect(screen.getByRole("button", { name: "Add funds" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("link", { name: "Add funds" })).toBeNull();
  expect(screen.getByRole("link", { name: "Prize Ready: Unavailable. View rewards" }).getAttribute("href")).toBe(accountRoutes.rewards);
  expect(screen.getByRole("link", { name: "Purchase Options: Unavailable. Continue with Purchase" }).getAttribute("href")).toBe(accountRoutes.purchaseOptions);
});

test.each([false, true])("Add to Your Crew opens one focused search without sending (reduced motion: %s)", reducedMotion => {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query.includes("prefers-reduced-motion") && reducedMotion })));
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  expect(screen.queryByRole("searchbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add to Your Crew" }));
  expect(document.activeElement).toBe(screen.getByRole("searchbox", { name: "Name, email, or phone" }));
  expect(screen.queryByRole("region", { name: "Approved Crew" })).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Email address" })).toBeNull();
  expect(actions.inviteToCrew).not.toHaveBeenCalled();
  expect(actions.inviteToCrewByPhone).not.toHaveBeenCalled();
});

test("the four legacy homepage sample additions appear in the account carousel, clearly separate from real connections", async () => {
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  expect(await screen.findByRole("button", { name: "See Maya's sample shared activity" })).toBeTruthy();
  for (const person of ["Maya", "Daniel", "Ari", "Leo"]) {
    expect(screen.getByRole("button", { name: `See ${person}'s sample shared activity` })).toBeTruthy();
  }
  expect(screen.getByText("4 sample previews")).toBeTruthy();
  expect(screen.getByText("0 connected")).toBeTruthy();
  expect(screen.getByText("SAMPLE PROFILE")).toBeTruthy();
  expect(await screen.findByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Maya's sample shared activity" }));
  expect(screen.getByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Maya's sample shared activity" }));
  expect(screen.getByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("a homepage preview choice carries into Your Crew and can be removed", async () => {
  addSampleCrewPreview("Ari");
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  expect(screen.getByRole("button", { name: "See Ari's sample shared activity" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "See Maya's sample shared activity" })).toBeNull();
  fireEvent.click(screen.getByText("Manage"));
  fireEvent.click(screen.getByRole("button", { name: "Remove preview" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "See Ari's sample shared activity" })).toBeNull());
  expect(localStorage.getItem("zero-loss-sample-crew-v1")).toBe("[]");
});

test("Maya opens first when saved sample previews were added in a different order", async () => {
  addSampleCrewPreview("Leo");
  addSampleCrewPreview("Maya");
  addSampleCrewPreview("Daniel");
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  expect(await screen.findByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
});

test("every sample clearly highlights the selected person and matches the shared-activity panel", async () => {
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  await screen.findByRole("region", { name: "Maya's shared activity" });
  for (const name of ["Maya", "Daniel", "Ari", "Leo"]) {
    const personButton = await screen.findByRole("button", { name: `See ${name}'s sample shared activity` });
    if (personButton.getAttribute("aria-expanded") !== "true") fireEvent.click(personButton);
    const panel = screen.getByRole("region", { name: `${name}'s shared activity` });
    expect(panel.className).toContain("activityPanel");
    expect(panel.textContent).toContain(`${name}’s shared picks`);
    expect(personButton.getAttribute("aria-expanded")).toBe("true");
    expect(personButton.getAttribute("data-selected")).toBe("true");
  }
  fireEvent.click(screen.getByRole("button", { name: "Groups" }));
  expect(screen.queryByRole("region", { name: "Leo's shared activity" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Your Crew" }));
  expect(screen.getByRole("region", { name: "Leo's shared activity" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Leo's sample shared activity" }));
  expect(screen.getByRole("region", { name: "Leo's shared activity" })).toBeTruthy();
  expect(actions.removeCrewConnection).not.toHaveBeenCalled();
  expect(actions.setEntryCrewSharing).not.toHaveBeenCalled();
});

test("a personal invite link is copyable and an incoming link joins through the saved action", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" ownInviteToken="11111111-2222-4333-8444-555555555555" incomingInviteToken="22222222-3333-4444-8555-666666666666" />);
  fireEvent.click(screen.getByRole("button", { name: "Add people" }));
  fireEvent.click(screen.getByText("Invite with your personal link"));
  fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("http://localhost:3000/account/crew?invite=11111111-2222-4333-8444-555555555555"));
  fireEvent.click(screen.getByRole("button", { name: "Join Crew" }));
  await waitFor(() => expect(actions.requestCrewInvitationFromLink).toHaveBeenCalledWith("22222222-3333-4444-8555-666666666666"));
  expect(await screen.findByRole("button", { name: "Joined" })).toBeTruthy();
  Reflect.deleteProperty(navigator, "clipboard");
});

test("the account Crew section expands approved people's activity in place", async () => {
  actions.getCrewSharedPicks.mockResolvedValue({ ok: true, picks: [{ title: "Nike Court Shot Shoes", retailer: "Dick’s Sporting Goods", image: "/catalog/nike-court-shot-side-cutout.png", offeringSlug: "nike-court-shot-shoes", sharedAt: "2026-09-19T10:00:00Z" }] });
  render(<CrewHub
    currentUserId="11111111-1111-4111-8111-111111111111"
    invitations={[{
      id: "44444444-4444-4444-8444-444444444444", requester_id: "11111111-1111-4111-8111-111111111111",
      recipient_id: "22222222-2222-4222-8222-222222222222", requester_name: "Me", recipient_name: "Old name",
      status: "accepted", created_at: "2026-09-19T10:00:00Z",
    }]}
    members={[{ memberId: "22222222-2222-4222-8222-222222222222", name: "Taylor Crew", avatarUrl: null }]}
    discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew"
  />);

  expect(screen.getByText("People in your Crew")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Taylor Crew's shared activity" }));
  await waitFor(() => expect(actions.getCrewSharedPicks).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222"));
  expect(screen.getByRole("region", { name: "Taylor Crew's shared activity" })).toBeTruthy();
  expect(await screen.findByRole("link", { name: /Nike Court Shot Shoes/ })).toHaveProperty("href", "http://localhost:3000/items/nike-court-shot-shoes?from=%2Faccount%2Fcrew%3Fmember%3D22222222-2222-4222-8222-222222222222%26pick%3Dnike-court-shot-shoes");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Add to Your Crew" })).toBeTruthy();
  expect(screen.queryByRole("searchbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Add people" }));
  expect(screen.getByRole("searchbox", { name: "Name, email, or phone" })).toBeTruthy();
  expect(screen.queryByText(/fictional click-through/i)).toBeNull();
  expect(screen.queryByText(/Maya’s shared picks|Daniel’s shared picks/)).toBeNull();
  expect(screen.queryByRole("button", { name: /find people/i })).toBeNull();
});

test("name search requests an actual database-backed invitation", async () => {
  render(<CrewSearchPanel onSamplePicks={vi.fn()} disabled={false} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search by name" }), { target: { value: "Sam" } });
  fireEvent.click(screen.getByRole("button", { name: "Search Crew by name" }));
  await waitFor(() => expect(actions.searchCrewByName).toHaveBeenCalledWith("Sam"));
  expect(await screen.findByText("Sam Test")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew" }));
  await waitFor(() => expect(actions.inviteToCrewById).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333"));
  expect(await screen.findByRole("button", { name: "Added" })).toBeTruthy();
});

test("phone contacts fill the fields only after selection; sending still needs a separate click", async () => {
  const picker = vi.fn().mockResolvedValue([{ name: ["Pat Friend"], email: ["pat@example.com"], tel: ["+1 555 123 4567"] }]);
  Object.defineProperty(navigator, "contacts", { configurable: true, value: { select: picker } });
  render(<CrewSearchPanel onSamplePicks={vi.fn()} disabled={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Choose from phone contacts" }));
  await waitFor(() => expect(picker).toHaveBeenCalledWith(["name", "email", "tel"], { multiple: false }));
  expect((screen.getByRole("textbox", { name: "Email address" }) as HTMLInputElement).value).toBe("pat@example.com");
  expect((screen.getByRole("textbox", { name: "Verified phone number" }) as HTMLInputElement).value).toBe("+1 555 123 4567");
  expect(actions.inviteToCrew).not.toHaveBeenCalled();
  expect(actions.inviteToCrewByPhone).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew by email" }));
  await waitFor(() => expect(actions.inviteToCrew).toHaveBeenCalledWith("pat@example.com"));
  Reflect.deleteProperty(navigator, "contacts");
});

test("sample people can be found by name without pretending a real invitation was sent", async () => {
  const onSamplePicks = vi.fn();
  actions.searchCrewByName.mockResolvedValue({ ok: true, message: "No discoverable members match that name.", people: [] });
  render(<CrewSearchPanel onSamplePicks={onSamplePicks} disabled={false} />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search by name" }), { target: { value: "Maya" } });
  fireEvent.click(screen.getByRole("button", { name: "Search Crew by name" }));
  expect(await screen.findByText("Sample profiles—not real invitations")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "View sample picks" }));
  expect(onSamplePicks).toHaveBeenCalledWith("Maya");
  expect(actions.inviteToCrewById).not.toHaveBeenCalled();
});

test.each([["pat@example.test", "inviteToCrew"], ["+1 (202) 555-0123", "inviteToCrewByPhone"]] as const)("compact lookup of %s waits for an explicit request", async (value, action) => {
  render(<CrewSearchPanel compact onSamplePicks={vi.fn()} disabled={false} />);
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Find person" }));
  expect(screen.getByText(value)).toBeTruthy();
  expect(actions.searchCrewByName).not.toHaveBeenCalled();
  expect(actions[action]).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew" }));
  await waitFor(() => expect(actions[action]).toHaveBeenCalledExactlyOnceWith(value));
  expect((await screen.findByRole("button", { name: "Added" }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(input, { target: { value: "someone-else@example.test" } });
  expect(screen.queryByRole("button", { name: "Added" })).toBeNull();
});

test("groups and privacy share the same editor state across compact navigation", async () => {
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  const nav = within(screen.getByRole("navigation", { name: "Your Crew sections" }));
  expect(screen.queryByRole("heading", { name: "Make your own groups" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Can people find me?" })).toBeNull();
  fireEvent.click(nav.getByRole("button", { name: "Groups" }));
  expect(screen.queryByRole("heading", { name: "Can people find me?" })).toBeNull();
  fireEvent.change(screen.getByLabelText("New group name"), { target: { value: "Family" } });
  fireEvent.click(screen.getByRole("button", { name: /Create group/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save group" }));
  await screen.findByText(/Family saved to your profile/);
  const openGroup = screen.getByRole("button", { name: "Add people to group" });
  await waitFor(() => expect(openGroup).toHaveProperty("disabled", false));
  fireEvent.click(openGroup);
  fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "Family draft" } });
  fireEvent.click(nav.getByRole("button", { name: "Shared Picks & Cleanup" }));
  fireEvent.click(screen.getByRole("button", { name: "Privacy Settings" }));
  expect(screen.queryByRole("heading", { name: "Make your own groups" })).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: /Only selected groups/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Family" }));
  fireEvent.click(nav.getByRole("button", { name: "Your Crew" }));
  fireEvent.click(nav.getByRole("button", { name: "Shared Picks & Cleanup" }));
  fireEvent.click(screen.getByRole("button", { name: "Privacy Settings" }));
  expect((screen.getByRole("checkbox", { name: "Family" }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "OK · Save to my profile" }));
  await waitFor(() => expect(actions.saveCrewDisplaySettings).toHaveBeenCalledOnce());
  const payload = actions.saveCrewDisplaySettings.mock.calls[0][0];
  expect(payload).not.toHaveProperty("groups");
  expect(payload.expected.groups).toEqual([expect.objectContaining({ name: "Family" })]);
  expect(payload.defaultRule).toEqual({ audience: "groups", memberIds: [], groupIds: [payload.expected.groups[0].id] });
  await screen.findByText("Settings saved.");
  fireEvent.click(nav.getByRole("button", { name: "Groups" }));
  expect(screen.getByLabelText("Group name")).toHaveProperty("value", "Family draft");
  expect(actions.saveCrewGroup).toHaveBeenCalledTimes(1);
});

test("a failed member activity request can be retried without a blank panel", async () => {
  actions.getCrewSharedPicks.mockRejectedValueOnce(new Error("offline"));
  render(<CrewHub currentUserId="me" invitations={[{ id: "connection", requester_id: "me", recipient_id: "taylor", requester_name: "Me", recipient_name: "Taylor", status: "accepted", created_at: "2026-10-23T10:00:00Z" }]} members={[{ memberId: "taylor", name: "Taylor", avatarUrl: null }]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  fireEvent.click(screen.getByRole("button", { name: "See Taylor's shared activity" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry shared activity" }));
  await screen.findByText("No activity shared with Crew yet.");
  expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(2);
});

test("server refresh and tapping the same Crew member replace withdrawn picks in place", async () => {
  const memberId = "taylor";
  const memberPick = { title: "Spinning Reel", retailer: "Bass Pro Shops", image: "/catalog/reel.png", offeringSlug: "penn-battle-iv-2500", sharedAt: "2026-11-01T12:00:00Z" };
  const props = {
    currentUserId: "me", invitations: [{ id: "connection", requester_id: "me", recipient_id: memberId, requester_name: "Me", recipient_name: "Taylor", status: "accepted" as const, created_at: "2026-10-01T12:00:00Z" }],
    members: [{ memberId, name: "Taylor", avatarUrl: null }], discoverable: false, entries: [],
    selectedMemberId: null, selectedPicks: [], available: true, initialTab: "crew" as const,
  };
  const view = render(<CrewHub {...props} />);
  const person = screen.getByRole("button", { name: "See Taylor's shared activity" });
  actions.getCrewSharedPicks.mockResolvedValueOnce({ ok: true, picks: [memberPick] });
  fireEvent.click(person);
  await screen.findByRole("link", { name: /Spinning Reel/ });
  const rail = screen.getByRole("group", { name: "Taylor's shared picks" });
  actions.getCrewSharedPicks.mockResolvedValueOnce({ ok: true, picks: [memberPick] });
  fireEvent.click(person);
  await waitFor(() => expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("group", { name: "Taylor's shared picks" })).toBe(rail);
  view.rerender(<CrewHub {...props} selectedMemberId={memberId} />);
  expect(screen.queryByRole("link", { name: /Spinning Reel/ })).toBeNull();
  expect(screen.getByRole("region", { name: "Taylor's shared activity" })).toBeTruthy();
  expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(2);
});

test("a fresh Crew roster triggers a new authorized read for a locally selected member", async () => {
  const memberId = "taylor";
  const memberPick = { title: "Spinning Reel", retailer: "Bass Pro Shops", image: "/catalog/reel.png", offeringSlug: "penn-battle-iv-2500", sharedAt: "2026-11-01T12:00:00Z" };
  const invitations = [{ id: "connection", requester_id: "me", recipient_id: memberId, requester_name: "Me", recipient_name: "Taylor", status: "accepted" as const, created_at: "2026-10-01T12:00:00Z" }];
  const props = { currentUserId: "me", invitations, members: [{ memberId, name: "Taylor", avatarUrl: null }], discoverable: false, entries: [], selectedMemberId: null, selectedPicks: [], available: true, initialTab: "crew" as const };
  actions.getCrewSharedPicks.mockResolvedValueOnce({ ok: true, picks: [memberPick] });
  const view = render(<CrewHub {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "See Taylor's shared activity" }));
  await screen.findByRole("link", { name: /Spinning Reel/ });
  view.rerender(<CrewHub {...props} invitations={[...invitations]} />);
  await screen.findByText("No activity shared with Crew yet.");
  expect(actions.getCrewSharedPicks).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("link", { name: /Spinning Reel/ })).toBeNull();
});

test("sample lookup reopens the same person rather than toggling their picks off", async () => {
  actions.searchCrewByName.mockResolvedValue({ ok: true, people: [], message: "No discoverable members." });
  render(<CrewHub currentUserId="me" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  await screen.findByRole("region", { name: "Maya's shared activity" });
  fireEvent.click(screen.getByRole("button", { name: "Add people" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Maya" } });
  fireEvent.click(screen.getByRole("button", { name: "Find" }));
  fireEvent.click(await screen.findByRole("button", { name: "Add sample" }));
  expect(screen.getByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
});

function crewPageAtCurrentUrl() {
  return <CrewHub currentUserId="me" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab={parseCrewTab(new URLSearchParams(window.location.search).get("tab"))} />;
}

test.each([
  ["Groups", "groups", "#crew-groups", "Make your own groups"],
  ["Shared Picks & Cleanup", "picks", "#sharing", "My Shared Picks Cleanup"],
  ["Privacy Settings", "privacy", "#crew-privacy", "Can people find me?"],
] as const)("%s keeps the same section on refresh and when reopening its link", (label, tab, hash, heading) => {
  const page = render(crewPageAtCurrentUrl());
  if (tab === "privacy") fireEvent.click(screen.getByRole("button", { name: "Shared Picks & Cleanup" }));
  fireEvent.click(screen.getByRole("button", { name: label }));
  expect(window.location.search).toBe(`?tab=${tab}`);
  expect(window.location.hash).toBe(hash);
  expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
  const copiedLink = window.location.href;
  page.unmount();
  // A fresh document/server render derives its initial section from the URL.
  window.history.replaceState({}, "", copiedLink);
  render(crewPageAtCurrentUrl());
  expect(screen.getByRole("heading", { name: heading })).toBeTruthy();
  expect(actions.saveCrewDisplaySettings).not.toHaveBeenCalled();
  expect(actions.setEntryCrewSharing).not.toHaveBeenCalled();
});

test("Back and Forward follow Crew sections while retaining an unsaved group draft", async () => {
  render(crewPageAtCurrentUrl());
  fireEvent.click(screen.getByRole("button", { name: "Groups" }));
  fireEvent.change(screen.getByLabelText("New group name"), { target: { value: "Unsubmitted draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Shared Picks & Cleanup" }));
  fireEvent.click(screen.getByRole("button", { name: "Privacy Settings" }));
  act(() => window.history.back());
  await waitFor(() => expect(screen.getByRole("heading", { name: "My Shared Picks Cleanup" })).toBeTruthy());
  act(() => window.history.back());
  await waitFor(() => expect(screen.getByRole("button", { name: "Groups" }).getAttribute("aria-pressed")).toBe("true"));
  expect((screen.getByLabelText("New group name") as HTMLInputElement).value).toBe("Unsubmitted draft");
  act(() => window.history.forward());
  await waitFor(() => expect(screen.getByRole("heading", { name: "My Shared Picks Cleanup" })).toBeTruthy());
  expect(actions.saveCrewGroup).not.toHaveBeenCalled();
  expect(actions.saveCrewDisplaySettings).not.toHaveBeenCalled();
});

test("section links retain invitation/member context, replace stale anchors, and avoid duplicate Back steps", () => {
  window.history.replaceState({ framework: "current" }, "", "/account/crew?member=known-member&invite=known-invite&tab=groups#crew-group-old");
  render(crewPageAtCurrentUrl());
  const push = vi.spyOn(window.history, "pushState");
  fireEvent.click(screen.getByRole("button", { name: "Groups" }));
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Shared Picks & Cleanup" }));
  expect(window.location.search).toBe("?member=known-member&invite=known-invite&tab=picks");
  expect(window.location.hash).toBe("#sharing");
  fireEvent.click(screen.getByRole("button", { name: "Your Crew" }));
  expect(new URLSearchParams(window.location.search).get("tab")).toBe("crew");
  expect(window.location.hash).toBe("#crew-intro");
  expect(screen.getByRole("button", { name: "Your Crew" }).getAttribute("aria-pressed")).toBe("true");
  expect(push).toHaveBeenCalledTimes(2);
});

test("unknown section values fall back to Your Crew without changing saved data", () => {
  window.history.replaceState({}, "", "/account/crew?tab=not-a-section");
  render(crewPageAtCurrentUrl());
  expect(screen.getByRole("button", { name: "Your Crew" }).getAttribute("aria-pressed")).toBe("true");
  expect(actions.saveCrewDisplaySettings).not.toHaveBeenCalled();
});


test("Back restores Daniel and the shared-pick position without switching to Maya", async () => {
  const props = { currentUserId: "me", invitations: [], members: [], discoverable: false, entries: [], selectedMemberId: null, selectedPicks: [], available: true, initialTab: "crew" as const };
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const view = render(<CrewHub {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "See Daniel's sample shared activity" }));
  const group = screen.getByRole("group", { name: "Daniel's shared picks" });
  Object.defineProperty(group, "scrollLeft", { configurable: true, writable: true, value: 280 });
  const link = within(screen.getByRole("region", { name: "Daniel's shared activity" })).getAllByRole("link", { name: "View item" })[1];
  fireEvent.click(link);
  expect(window.history.state[crewViewReturnKey]).toMatchObject({ ownerId: "me", selectedKey: "sample-Daniel", pickSlug: "dyson-v8-cordless-vacuum", picksLeft: 280 });
  view.unmount();
  render(<CrewHub {...props} />);
  expect(await screen.findByRole("region", { name: "Daniel's shared activity" })).toBeTruthy();
  expect(screen.queryByRole("region", { name: "Maya's shared activity" })).toBeNull();
  await waitFor(() => expect(screen.getByRole("group", { name: "Daniel's shared picks" }).scrollLeft).toBe(280));
  expect(scroll).toHaveBeenCalled();
});

test.each(["other account", "removed member", "valid member"])("Crew return validates and reloads a %s", async kind => {
  const bookmark = { ownerId: kind === "other account" ? "someone-else" : "me", href: window.location.href, selectedKey: "taylor", pickSlug: "nike-court-shot-shoes", peopleLeft: 0, picksLeft: 0, scrollY: 0 };
  window.history.replaceState({ [crewViewReturnKey]: bookmark }, "");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const connection = { id: "connection", requester_id: "me", recipient_id: "taylor", requester_name: "Me", recipient_name: "Taylor", status: "accepted" as const, created_at: "2026-10-23T10:00:00Z" };
  render(<CrewHub currentUserId="me" invitations={kind === "removed member" ? [] : [connection]} members={[{ memberId: "taylor", name: "Taylor", avatarUrl: null }]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  if (kind === "valid member") {
    await waitFor(() => expect(actions.getCrewSharedPicks).toHaveBeenCalledWith("taylor"));
    expect(screen.getByRole("region", { name: "Taylor's shared activity" })).toBeTruthy();
  } else {
    expect(actions.getCrewSharedPicks).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Taylor's shared activity" })).toBeNull();
  }
});

test("the product's explicit Crew return selects Daniel and retains the exact pick", async () => {
  window.history.replaceState({}, "", "/account/crew?member=sample-Daniel&pick=dyson-v8-cordless-vacuum#crew-intro");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  render(<CrewHub currentUserId="me" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  const panel = await screen.findByRole("region", { name: "Daniel's shared activity" });
  const link = within(panel).getAllByRole("link", { name: "View item" })[1];
  const from = new URL(link.getAttribute("href")!, "https://example.test").searchParams.get("from");
  expect(from).toBe("/account/crew?member=sample-Daniel&pick=dyson-v8-cordless-vacuum");
  expect(screen.queryByRole("region", { name: "Maya's shared activity" })).toBeNull();
});

test("a direct Crew return hint cannot request an unconnected member's activity", () => {
  window.history.replaceState({}, "", "/account/crew?member=unknown-person&pick=dyson-v8-cordless-vacuum#crew-intro");
  render(<CrewHub currentUserId="me" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  expect(actions.getCrewSharedPicks).not.toHaveBeenCalled();
});
