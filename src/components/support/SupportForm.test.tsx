import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ save: vi.fn(), check: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }) }));
vi.mock("@/lib/support/actions", () => ({ saveSupportCase: mocks.save, checkSupportMessage: mocks.check }));
import { SupportForm } from "./SupportForm";
const caseId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); });
afterEach(cleanup);
test("transaction-linked form keeps the chosen transaction and exact retry after a dropped response", async () => {
  mocks.save.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ status: "saved", caseId });
  mocks.check.mockResolvedValue({ status: "error", uncertain: true, canResend: true, message: "No saved message yet" });
  const view = render(<SupportForm requestKey="support_request_001" transactionId={caseId} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Tell us what happened" }), { target: { value: "Please check this transaction." } });
  fireEvent.click(screen.getByRole("button", { name: "Send support request" }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Connection interrupted"));
  expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("disabled", true);
  view.rerender(<SupportForm requestKey="unrelated_refresh_002" transactionId={caseId} />);
  fireEvent.click(screen.getByRole("button", { name: "Check saved message" }));
  expect(await screen.findByRole("button", { name: "Resend same message" })).toBeTruthy();
  expect(mocks.save).toHaveBeenCalledOnce();
  expect(mocks.check).toHaveBeenCalledWith("support_request_001", undefined);
  fireEvent.click(screen.getByRole("button", { name: "Resend same message" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(`/support?case=${caseId}#conversation`));
  const first = mocks.save.mock.calls[0][1] as FormData;
  expect(mocks.save.mock.calls[1][1]).toBe(first);
  expect(first.get("transactionId")).toBe(caseId);
  expect(first.get("requestKey")).toBe("support_request_001");
  expect(first.get("subject")).toBe("Question about this wallet transaction");
});

test('a reward form keeps its reference and exact retry without asking for a gift-card code',async()=>{
 mocks.save.mockRejectedValueOnce(new Error('Offline'));
 mocks.check.mockResolvedValue({status:'saved',caseId});
 render(<SupportForm requestKey="support_reward_001" rewardId={caseId}/>);
 expect(screen.getByRole('combobox',{name:'What do you need help with?'})).toHaveProperty('value','reward');
 expect(screen.getByRole('textbox',{name:'Subject'})).toHaveProperty('value','Question about this reward');
 fireEvent.change(screen.getByRole('textbox',{name:'Tell us what happened'}),{target:{value:'Please check my winning reward.'}});
 fireEvent.click(screen.getByRole('button',{name:'Send support request'}));await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button',{name:'Check saved message'}));
 await waitFor(()=>expect(mocks.replace).toHaveBeenCalledWith(`/support?case=${caseId}#conversation`));
 const first=mocks.save.mock.calls[0][1] as FormData;
 expect(first.get('rewardId')).toBe(caseId);expect(first.get('transactionId')).toBe('');
 expect(mocks.save).toHaveBeenCalledOnce();
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

test("a draft survives leaving for help and returning, isolated by account and reference", () => {
  let view = render(<SupportForm ownerId="customer-a" requestKey="support_request_001" transactionId={caseId} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "Nintendo receipt question" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Tell us what happened" }), { target: { value: "Please help me check this purchase receipt." } });
  view.unmount();
  view = render(<SupportForm ownerId="customer-b" requestKey="support_request_002" transactionId={caseId} />);
  expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("value", "");
  view.unmount();
  view = render(<SupportForm ownerId="customer-a" requestKey="support_request_003" rewardId={caseId} />);
  expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("value", "");
  view.unmount();
  render(<SupportForm ownerId="customer-a" requestKey="support_request_004" transactionId={caseId} />);
  expect(screen.getByRole("textbox", { name: "Subject" })).toHaveProperty("value", "Nintendo receipt question");
  expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("value", "Please help me check this purchase receipt.");
  fireEvent.click(screen.getByRole("button", { name: "Clear draft" }));
  expect(screen.getByRole("textbox", { name: "Subject" })).toHaveProperty("value", "Question about this wallet transaction");
  expect(sessionStorage.length).toBe(0);
});

test("returning to an uncertain submission checks the original request and clears the draft only after success", async () => {
  mocks.save.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ status: "saved", caseId });
  mocks.check.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ status: "error", uncertain: true, canResend: true, message: "No saved message yet" });
  const view = render(<SupportForm ownerId="customer-a" requestKey="support_request_001" transactionId={caseId} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Tell us what happened" }), { target: { value: "Please check this transaction." } });
  fireEvent.click(screen.getByRole("button", { name: "Send support request" }));
  await screen.findByRole("alert");
  const first = mocks.save.mock.calls[0][1] as FormData;
  view.unmount();
  render(<SupportForm ownerId="customer-a" requestKey="support_request_new" transactionId={caseId} />);
  expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: "Clear draft" })).toHaveProperty("disabled", true);
  fireEvent.click(screen.getByRole("button", { name: "Check saved message" }));
  await screen.findByText("Could not check your message. Your text is still here. Try checking again.");
  fireEvent.click(screen.getByRole("button", { name: "Check saved message" }));
  fireEvent.click(await screen.findByRole("button", { name: "Resend same message" }));
  await waitFor(() => expect(mocks.replace).toHaveBeenCalled());
  const retried = mocks.save.mock.calls[1][1] as FormData;
  expect(Object.fromEntries(retried)).toEqual(Object.fromEntries(first));
  expect(sessionStorage.length).toBe(0);
});

test("blocked browser storage does not prevent entering a support request", () => {
  const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Blocked"); });
  try {
    render(<SupportForm ownerId="customer-a" requestKey="support_request_001" />);
    fireEvent.change(screen.getByRole("textbox", { name: "Tell us what happened" }), { target: { value: "Please help me check my request." } });
    expect(screen.getByRole("textbox", { name: "Tell us what happened" })).toHaveProperty("value", "Please help me check my request.");
  } finally { read.mockRestore(); write.mockRestore(); }
});
