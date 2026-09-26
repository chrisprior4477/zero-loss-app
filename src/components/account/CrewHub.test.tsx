import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrewHub } from "./CrewHub";
import { CrewSearchPanel } from "./CrewSearchDialog";
import { addSampleCrewPreview } from "@/lib/crew/sample-preview";

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
  requestCrewInvitationFromLink: vi.fn(),
}));

vi.mock("@/lib/crew/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  actions.searchCrewByName.mockResolvedValue({ ok: true, message: "Choose someone to send a Crew request.", people: [{ memberId: "33333333-3333-4333-8333-333333333333", name: "Sam Test", avatarUrl: null }] });
  actions.inviteToCrewById.mockResolvedValue({ ok: true, message: "Crew request sent." });
  actions.inviteToCrewByPhone.mockResolvedValue({ ok: true, message: "Request saved." });
  actions.inviteToCrew.mockResolvedValue({ ok: true, message: "Request saved." });
  actions.getCrewSharedPicks.mockResolvedValue({ ok: true, picks: [] });
  actions.requestCrewInvitationFromLink.mockResolvedValue({ ok: true, message: "Crew request sent." });
});
afterEach(cleanup);

test("the four legacy homepage sample additions appear in the account carousel, clearly separate from real connections", async () => {
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  expect(await screen.findByRole("button", { name: "See Maya's sample shared activity" })).toBeTruthy();
  for (const person of ["Maya", "Daniel", "Ari", "Leo"]) {
    expect(screen.getByRole("button", { name: `See ${person}'s sample shared activity` })).toBeTruthy();
  }
  expect(screen.getByText("4 sample previews")).toBeTruthy();
  expect(screen.getByText("0 connected")).toBeTruthy();
  expect(screen.getByText(/fictional.*did not send invitations/i)).toBeTruthy();
  expect(await screen.findByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Maya's sample shared activity" }));
  expect(screen.queryByRole("region", { name: "Maya's shared activity" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "See Maya's sample shared activity" }));
  expect(screen.getByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("a homepage preview choice carries into Your Crew and can be removed", async () => {
  addSampleCrewPreview("Ari");
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" />);
  expect(screen.getByRole("button", { name: "See Ari's sample shared activity" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "See Maya's sample shared activity" })).toBeNull();
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
    expect(panel.className).toContain("connectedOutline");
    expect(panel.textContent).toContain(`Viewing ${name}'s picks`);
    expect(personButton.getAttribute("aria-expanded")).toBe("true");
    expect(personButton.parentElement?.className).toContain("personSelected");
  }
  fireEvent.click(screen.getByRole("tab", { name: "Requests" }));
  expect(screen.queryByRole("region", { name: "Leo's shared activity" })).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: "Your Crew" }));
  expect(screen.getByRole("region", { name: "Leo's shared activity" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Close/ }));
  expect(screen.queryByRole("region", { name: "Leo's shared activity" })).toBeNull();
  expect(actions.removeCrewConnection).not.toHaveBeenCalled();
  expect(actions.setEntryCrewSharing).not.toHaveBeenCalled();
});

test("a personal invite link is copyable and an incoming link sends an approval request", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<CrewHub currentUserId="11111111-1111-4111-8111-111111111111" invitations={[]} members={[]} discoverable={false} entries={[]} selectedMemberId={null} selectedPicks={[]} available initialTab="crew" ownInviteToken="11111111-2222-4333-8444-555555555555" incomingInviteToken="22222222-3333-4444-8555-666666666666" />);
  fireEvent.click(screen.getByRole("button", { name: "Copy invite link" }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("http://localhost:3000/account/crew?invite=11111111-2222-4333-8444-555555555555"));
  fireEvent.click(screen.getByRole("button", { name: "Request to join" }));
  await waitFor(() => expect(actions.requestCrewInvitationFromLink).toHaveBeenCalledWith("22222222-3333-4444-8555-666666666666"));
  expect(await screen.findByRole("button", { name: "Request sent" })).toBeTruthy();
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
  expect(await screen.findByRole("link", { name: /Nike Court Shot Shoes/ })).toHaveProperty("href", "http://localhost:3000/items/nike-court-shot-shoes");
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Add to Your Crew" })).toBeTruthy();
  expect(screen.getByRole("searchbox", { name: "Search by name" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Invite by verified phone" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Invite by email" })).toBeTruthy();
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
  expect(await screen.findByRole("button", { name: "Requested" })).toBeTruthy();
});

test("phone contacts fill the fields only after selection; sending still needs a separate click", async () => {
  const picker = vi.fn().mockResolvedValue([{ name: ["Pat Friend"], email: ["pat@example.com"], tel: ["+1 555 123 4567"] }]);
  Object.defineProperty(navigator, "contacts", { configurable: true, value: { select: picker } });
  render(<CrewSearchPanel onSamplePicks={vi.fn()} disabled={false} />);
  fireEvent.click(screen.getByRole("button", { name: "Choose from phone contacts" }));
  await waitFor(() => expect(picker).toHaveBeenCalledWith(["name", "email", "tel"], { multiple: false }));
  expect((screen.getByRole("textbox", { name: "Invite by email" }) as HTMLInputElement).value).toBe("pat@example.com");
  expect((screen.getByRole("textbox", { name: "Invite by verified phone" }) as HTMLInputElement).value).toBe("+1 555 123 4567");
  expect(actions.inviteToCrew).not.toHaveBeenCalled();
  expect(actions.inviteToCrewByPhone).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send Crew request by email" }));
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
