import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrewHub } from "./CrewHub";
import { CrewSearchDialog } from "./CrewSearchDialog";

const actions = vi.hoisted(() => ({
  inviteToCrew: vi.fn(),
  inviteToCrewById: vi.fn(),
  inviteToCrewByPhone: vi.fn(),
  searchCrewByName: vi.fn(),
  removeCrewConnection: vi.fn(),
  respondToCrewRequest: vi.fn(),
  setCrewDiscoverable: vi.fn(),
  setEntryCrewSharing: vi.fn(),
}));

vi.mock("@/lib/crew/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));

beforeEach(() => {
  vi.clearAllMocks();
  actions.searchCrewByName.mockResolvedValue({ ok: true, message: "Choose someone to send a Crew request.", people: [{ memberId: "33333333-3333-4333-8333-333333333333", name: "Sam Test", avatarUrl: null }] });
  actions.inviteToCrewById.mockResolvedValue({ ok: true, message: "Crew request sent." });
  actions.inviteToCrewByPhone.mockResolvedValue({ ok: true, message: "Request saved." });
  actions.inviteToCrew.mockResolvedValue({ ok: true, message: "Request saved." });
});
afterEach(cleanup);

test("the account Crew section shows approved people as circular carousel links, not fictional click-throughs", () => {
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
  expect(screen.getByRole("link", { name: "View Taylor Crew's shared picks" }).getAttribute("href")).toBe("/account/crew?member=22222222-2222-4222-8222-222222222222");
  expect(screen.getByRole("button", { name: "Add to Your Crew" })).toBeTruthy();
  expect(screen.queryByText(/fictional click-through/i)).toBeNull();
  expect(screen.queryByText(/Maya’s shared picks|Daniel’s shared picks/)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Add to Your Crew" }));
  expect(screen.getByRole("dialog", { name: "Add to Your Crew" })).toBeTruthy();
});

test("name search requests an actual database-backed invitation", async () => {
  render(<CrewSearchDialog onClose={vi.fn()} />);
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
  render(<CrewSearchDialog onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Choose from phone contacts" }));
  await waitFor(() => expect(picker).toHaveBeenCalledWith(["name", "email", "tel"], { multiple: false }));
  expect((screen.getByRole("textbox", { name: "Invite by email address" }) as HTMLInputElement).value).toBe("pat@example.com");
  expect((screen.getByRole("textbox", { name: "Invite by phone number" }) as HTMLInputElement).value).toBe("+1 555 123 4567");
  expect(actions.inviteToCrew).not.toHaveBeenCalled();
  expect(actions.inviteToCrewByPhone).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send Crew request by email" }));
  await waitFor(() => expect(actions.inviteToCrew).toHaveBeenCalledWith("pat@example.com"));
  Reflect.deleteProperty(navigator, "contacts");
});
