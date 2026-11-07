import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ save: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/lib/support/actions", () => ({ saveSupportCase: mocks.save }));
import { SupportForm } from "./SupportForm";
const caseId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);
test("transaction-linked form keeps the chosen transaction and exact retry after a dropped response", async () => {
  mocks.save.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ status: "saved", caseId });
  const view = render(<SupportForm requestKey="support_request_001" transactionId={caseId} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Tell us what happened" }), { target: { value: "Please check this transaction." } });
  fireEvent.click(screen.getByRole("button", { name: "Send support request" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Connection interrupted"));
  expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("disabled", true);
  view.rerender(<SupportForm requestKey="unrelated_refresh_002" transactionId={caseId} />);
  fireEvent.click(screen.getByRole("button", { name: "Check saved message" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(`/support?case=${caseId}#conversation`));
  const first = mocks.save.mock.calls[0][1] as FormData;
  expect(mocks.save.mock.calls[1][1]).toBe(first);
  expect(first.get("transactionId")).toBe(caseId);
  expect(first.get("requestKey")).toBe("support_request_001");
  expect(first.get("subject")).toBe("Question about this wallet transaction");
});
test("ordinary customers get a reply box but no status or financial controls", () => {
  render(<SupportForm requestKey="support_request_001" caseId={caseId} />);
  expect(screen.getByRole("textbox", { name: "Your reply" })).toBeTruthy();
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(screen.queryByRole("button", { name: /refund|balance/i })).toBeNull();
  expect(screen.getByText(/does not move funds/)).toBeTruthy();
});
test("staff can accompany a reply with a review status, never value changes", () => {
  render(<SupportForm requestKey="support_request_001" caseId={caseId} staff />);
  expect(screen.getByRole("combobox", { name: "Case status" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /refund|balance/i })).toBeNull();
});
test("a definitive rejection leaves message editable and does not show success", async () => {
  mocks.save.mockResolvedValue({ status: "error", message: "Please wait a few minutes." });
  render(<SupportForm requestKey="support_request_001" caseId={caseId} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Your reply" }), { target: { value: "Here is more information." } });
  fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("textbox", { name: "Your reply" })).toHaveProperty("disabled", false);
  expect(mocks.replace).not.toHaveBeenCalled();
});

test("validation preserves the selected category and draft for a corrected retry", async () => {
  mocks.save.mockResolvedValueOnce({ status: "error", field: "subject", message: "Please enter a subject of 5–140 characters." })
    .mockResolvedValueOnce({ status: "saved", caseId });
  render(<SupportForm requestKey="support_request_001" />);
  fireEvent.change(screen.getByRole("combobox", { name: "What do you need help with?" }), { target: { value: "reward" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "     " } });
  fireEvent.change(screen.getByRole("textbox", { name: "Tell us what happened" }), { target: { value: "My reward needs a closer look." } });
  fireEvent.click(screen.getByRole("button", { name: "Send support request" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("combobox")).toHaveProperty("value", "reward");
  expect(screen.getByRole("textbox", { name: "Subject" })).toHaveProperty("value", "     ");
  expect(screen.getByRole("textbox", { name: "Subject" }).getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("value", "My reward needs a closer look.");
  fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "Reward question" } });
  fireEvent.click(screen.getByRole("button", { name: "Send support request" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
  const corrected = mocks.save.mock.calls[1][1] as FormData;
  expect(corrected.get("category")).toBe("reward");
  expect(corrected.get("subject")).toBe("Reward question");
  expect(corrected.get("body")).toBe("My reward needs a closer look.");
});

test("a rejected staff reply keeps its selected case status", async () => {
  mocks.save.mockResolvedValue({ status: "error", message: "Please wait a few minutes." });
  render(<SupportForm requestKey="support_request_001" caseId={caseId} staff />);
  fireEvent.change(screen.getByRole("combobox", { name: "Case status" }), { target: { value: "resolved" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Your reply" }), { target: { value: "Here is more information." } });
  fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("combobox", { name: "Case status" })).toHaveProperty("value", "resolved");
});
