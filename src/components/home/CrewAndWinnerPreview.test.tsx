import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CrewAndWinnerPreview } from "./CrewAndWinnerPreview";

const actions = vi.hoisted(() => ({
  inviteToCrew: vi.fn(), inviteToCrewById: vi.fn(), inviteToCrewByPhone: vi.fn(), searchCrewByName: vi.fn(),
}));
vi.mock("@/lib/crew/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  actions.searchCrewByName.mockResolvedValue({ ok: true, message: "Choose someone to send a Crew request.", people: [] });
  actions.inviteToCrewById.mockResolvedValue({ ok: true, message: "Crew request sent." });
  actions.inviteToCrewByPhone.mockResolvedValue({ ok: true, message: "Request saved." });
  actions.inviteToCrew.mockResolvedValue({ ok: true, message: "Request saved." });
});
afterEach(cleanup);

test("the sample Crew action is clearly a preview, not a sent invitation", () => {
  render(<CrewAndWinnerPreview />);

  fireEvent.click(screen.getAllByRole("button", { name: "Add to Crew" })[0]);

  expect(screen.getByRole("status").textContent).toContain("no invitation was sent to Maya");
  expect(screen.getByRole("button", { name: "Preview added" })).toBeTruthy();
  expect(localStorage.getItem("zero-loss-sample-crew-v1")).toContain("Maya");
});

test("fictional winner scenes open an honest sample disclosure", () => {
  render(<CrewAndWinnerPreview />);

  fireEvent.click(screen.getByRole("button", { name: "Open illustrative story preview: A TV day at home" }));

  expect(screen.getByRole("dialog").textContent).toContain("not a real winner account");
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("Crew discovery shows ten extra sample people and keeps their prizes in an orange push-down", async () => {
  render(<CrewAndWinnerPreview />);

  expect(screen.getAllByRole("button", { name: "Add to Crew" })).toHaveLength(4);
  expect(screen.getAllByRole("button", { name: /Open illustrative story preview:/ })).toHaveLength(12);

  expect(screen.getAllByRole("button", { name: "Add to Your Crew" })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Add to Your Crew" })[1]);
  expect(screen.getByRole("dialog", { name: "Add to Your Crew" })).toBeTruthy();
  expect(screen.getByRole("dialog").textContent).toContain("Real connections require their approval");
  expect(within(screen.getByRole("dialog")).getAllByRole("button", { name: /'s sample prizes/ })).toHaveLength(14);

  fireEvent.click(screen.getByRole("button", { name: "See Mateo's sample prizes" }));
  expect(within(screen.getByRole("dialog")).getByRole("region", { name: "Mateo's shared activity" })).toBeTruthy();
  expect(screen.getByText("Mateo’s shared activity")).toBeTruthy();
  const mateo = screen.getByRole("button", { name: "See Mateo's sample prizes" }).parentElement!;
  fireEvent.click(within(mateo).getByRole("button", { name: "Add to Crew" }));
  expect(localStorage.getItem("zero-loss-sample-crew-v1")).toContain("Mateo");
  expect(within(mateo).getByRole("button", { name: "Preview added" })).toBeTruthy();

  fireEvent.change(screen.getByRole("searchbox", { name: "Search by name" }), { target: { value: "Maya" } });
  fireEvent.click(screen.getByRole("button", { name: "Search Crew by name" }));
  await waitFor(() => expect(actions.searchCrewByName).toHaveBeenCalledWith("Maya"));
  expect(within(screen.getByRole("dialog")).getAllByRole("button", { name: /'s sample prizes/ })).toHaveLength(1);

  fireEvent.click(screen.getByRole("button", { name: "Close Crew search" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});

test("Crew activity expands beneath the portraits without opening a page or dialog", () => {
  render(<CrewAndWinnerPreview />);
  fireEvent.click(screen.getByRole("button", { name: "See Maya's prizes" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("region", { name: "Maya's shared activity" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Hide prizes" })).toBeTruthy();
  expect(screen.getByText(/Illustrative picks from a fictional profile/)).toBeTruthy();
  expect(screen.getByText("Maya’s shared activity")).toBeTruthy();
  expect(screen.getByRole("link", { name: /Samsung 50.*M70H Mini LED TV/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next shared item" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Daniel's prizes" }));
  expect(screen.getByText("Daniel’s shared activity")).toBeTruthy();
  expect(screen.getByRole("link", { name: /PlayStation 5 Slim/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Ari's prizes" }));
  expect(screen.getByText("Ari’s shared activity")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Leo's prizes" }));
  expect(screen.getByText("Leo’s shared activity")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "See Daniel's prizes" }));
  fireEvent.click(screen.getByRole("button", { name: "Close Daniel's shared activity" }));
  expect(screen.queryByRole("region", { name: "Daniel's shared activity" })).toBeNull();
});

test("a discoverable real member receives a request, while sample profiles remain previews", async () => {
  actions.searchCrewByName.mockResolvedValue({ ok: true, message: "Choose someone to send a Crew request.", people: [{ memberId: "33333333-3333-4333-8333-333333333333", name: "Sam Test", avatarUrl: null }] });
  render(<CrewAndWinnerPreview />);
  fireEvent.click(screen.getAllByRole("button", { name: "Add to Your Crew" })[0]);
  fireEvent.change(screen.getByRole("searchbox", { name: "Search by name" }), { target: { value: "Sam" } });
  fireEvent.click(screen.getByRole("button", { name: "Search Crew by name" }));
  const result = await screen.findByText("Sam Test");
  fireEvent.click(within(result.parentElement!).getByRole("button", { name: "Add to Crew" }));
  await waitFor(() => expect(actions.inviteToCrewById).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333"));
  expect(screen.getByRole("button", { name: "Request sent" })).toBeTruthy();
});
