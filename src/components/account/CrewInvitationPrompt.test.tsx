import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CrewInvitationPrompt } from "./CrewInvitationPrompt";
const mocks = vi.hoisted(() => ({ respond: vi.fn(), leave: vi.fn(), shareBack: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/crew/actions", () => ({ respondToCrewRequest: mocks.respond, removeCrewConnection: mocks.leave, setCrewShareBack: mocks.shareBack }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
const invitation = { id: "11111111-1111-4111-8111-111111111111", name: "Alex", status: "pending" as const };
beforeEach(() => {
  vi.resetAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterEach(cleanup);
test("shows the pending request immediately, but Not now makes no membership change", () => {
  render(<CrewInvitationPrompt invitation={invitation} />);
  expect(screen.getByRole("dialog", { name: "Join Alex’s Crew?" })).toBeTruthy();
  expect(mocks.respond).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Not now" }));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(mocks.respond).not.toHaveBeenCalled();
});
test.each([["Join Crew", true], ["Decline invitation", false]] as const)("%s submits only the explicit recipient decision", async (label, accept) => {
  mocks.respond.mockResolvedValue({ ok: true, message: accept ? "You’re connected." : "Request declined." });
  render(<CrewInvitationPrompt invitation={invitation} />);
  fireEvent.click(screen.getByRole("button", { name: label }));
  await waitFor(() => expect(mocks.respond).toHaveBeenCalledExactlyOnceWith(invitation.id, accept));
  expect(await screen.findByRole("status")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Join Crew" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Done" })); expect(mocks.refresh).toHaveBeenCalled();
});
test("failed acceptance remains retryable and does not claim a connection", async () => {
  mocks.respond.mockRejectedValue(new Error("offline")); render(<CrewInvitationPrompt invitation={invitation} />);
  fireEvent.click(screen.getByRole("button", { name: "Join Crew" }));
  expect(await screen.findByRole("alert")).toBeTruthy(); expect(screen.getByRole("button", { name: "Join Crew" }).hasAttribute("disabled")).toBe(false);
});
test("missing or already handled invitations cannot be accepted", () => {
  const { rerender } = render(<CrewInvitationPrompt invitation={null} unavailable />);
  expect(screen.queryByRole("button", { name: "Join Crew" })).toBeNull();
  expect(screen.getByText(/account that received the email/)).toBeTruthy();
  rerender(<CrewInvitationPrompt key="accepted" invitation={{ ...invitation, status: "accepted" }} />);
  expect(screen.getByRole("heading", { name: "You’re connected" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Join Crew" })).toBeNull();
});

test("an automatic connection can be left without approving or sharing back", async () => {
 mocks.leave.mockResolvedValue({ok:true,message:"Connection removed."});
 render(<CrewInvitationPrompt invitation={{...invitation,status:"accepted"}} />);
 expect(mocks.shareBack).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"Leave connection"}));
 await waitFor(()=>expect(mocks.leave).toHaveBeenCalledExactlyOnceWith(invitation.id));
 expect(await screen.findByRole("status")).toHaveProperty("textContent","Connection removed.");
 expect(mocks.respond).not.toHaveBeenCalled();
});
