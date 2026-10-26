import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const actions = vi.hoisted(() => ({ searchCrewByName: vi.fn(), inviteToCrew: vi.fn(), inviteToCrewByPhone: vi.fn(), inviteToCrewById: vi.fn() }));
vi.mock("@/lib/crew/actions", () => actions);
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
import { CrewInlineFinder } from "./CrewInlineFinder";

beforeEach(() => {
  vi.resetAllMocks();
  actions.searchCrewByName.mockResolvedValue({ ok: true, people: [], message: "No matching members." });
  actions.inviteToCrewByPhone.mockResolvedValue({ ok: true, message: "Request saved." });
});
afterEach(cleanup);
function mount() { return render(<CrewInlineFinder available onSample={vi.fn()} onClose={vi.fn()} />); }
function find(query: string) { fireEvent.change(screen.getByLabelText("Name, email, or phone"), { target: { value: query } }); fireEvent.click(screen.getByRole("button", { name: "Find" })); }

test("Find shows a private contact immediately below the form without sending a request", () => {
  const { container } = mount(); find("+1 239 555 0123");
  expect(screen.getByText("+1 239 555 0123")).toBeTruthy();
  expect(container.querySelector("form")?.nextElementSibling?.contains(screen.getByRole("button", { name: "Add to Crew" }))).toBe(true);
  expect(actions.searchCrewByName).not.toHaveBeenCalled();
  expect(actions.inviteToCrewByPhone).not.toHaveBeenCalled();
  expect(screen.getByText(/We don’t reveal whether/)).toBeTruthy();
});

test("only explicit Add to Crew sends the request and locks the form while sending", async () => {
  let finish!: (result: { ok: boolean; message: string }) => void;
  actions.inviteToCrewByPhone.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mount(); find("+1 239 555 0123");
  fireEvent.click(screen.getByRole("button", { name: "Add to Crew" }));
  expect((screen.getByLabelText("Name, email, or phone") as HTMLInputElement).disabled).toBe(true);
  expect(actions.inviteToCrewByPhone).toHaveBeenCalledExactlyOnceWith("+1 239 555 0123");
  finish({ ok: true, message: "Request saved." });
  await screen.findByRole("button", { name: "Requested" });
  expect((screen.getByRole("button", { name: "Requested" }) as HTMLButtonElement).disabled).toBe(true);
});

test("invalid contact input does not create a request target", () => {
  mount(); find("123");
  expect(screen.queryByRole("button", { name: "Add to Crew" })).toBeNull();
  expect(screen.getByRole("status").textContent).toMatch(/phone number/);
  expect(actions.inviteToCrewByPhone).not.toHaveBeenCalled();
});

test("a stale name lookup cannot replace the current contact result", async () => {
  let finish!: (result: unknown) => void;
  actions.searchCrewByName.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mount(); find("Alex"); find("friend@example.test");
  finish({ ok: true, people: [{ memberId: "private-member", name: "Alex", avatarUrl: null }], message: "Found" });
  await waitFor(() => expect(screen.getByText("friend@example.test")).toBeTruthy());
  expect(screen.queryByText("Alex")).toBeNull();
  expect(actions.inviteToCrew).not.toHaveBeenCalled();
});

test("name lookup respects canonical search and distinguishes sample results", async () => {
  mount(); find("Maya");
  await screen.findByText("Fictional sample profile");
  expect(actions.searchCrewByName).toHaveBeenCalledExactlyOnceWith("Maya");
  expect(screen.getByRole("button", { name: "Add sample" })).toBeTruthy();
  expect(actions.inviteToCrewById).not.toHaveBeenCalled();
});
