import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/lib/account/lifecycle-actions", () => ({ setDeclinedOfferEmailReminder: mocks.save }));
import { DeclinedOfferCountdown, DeclinedOfferReminder } from "./DeclinedOfferDeadline";

const optionId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date("2026-10-09T12:00:00Z")); mocks.save.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

test("counts down to the next original deadline and advances after an offer expires", async () => {
  const deadlines = [Date.parse("2026-10-09T12:00:30Z"), Date.parse("2026-11-08T12:00:00Z")];
  render(<DeclinedOfferCountdown deadlines={deadlines} />);
  expect(await screen.findByText("Less than 1 hour left")).toBeTruthy();
  expect(screen.getByText("Next offer expires")).toBeTruthy();
  await act(async () => vi.advanceTimersByTime(60_000));
  expect(screen.getByText("29 days left")).toBeTruthy();
});

test.each([
  ["2026-10-10T12:01:00Z", "1 day left"],
  ["2026-10-10T11:59:00Z", "23 hours left"],
  ["2026-10-09T19:30:00Z", "7 hours left"],
  ["2026-10-09T13:30:00Z", "1 hour left"],
])("shows the correct countdown unit for a deadline at %s", async (deadline, label) => {
  render(<DeclinedOfferCountdown deadlines={[Date.parse(deadline)]} />);
  expect(await screen.findByText(label)).toBeTruthy();
});

test("saves an explicit two-day email opt-in", async () => {
  mocks.save.mockResolvedValue({ status: "pending", message: "Two-day email reminder saved." });
  render(<DeclinedOfferReminder optionId={optionId} expiresAt="2026-11-08T12:00:00Z" initialReminderStatus={null} canRequestReminder />);
  const checkbox = screen.getByRole("checkbox", { name: /Please remind me by email two days before/ }) as HTMLInputElement;
  expect(checkbox.disabled).toBe(false);
  fireEvent.click(checkbox);
  await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(optionId, true));
  await waitFor(() => expect(checkbox.checked).toBe(true));
  expect(screen.getByRole("status").textContent).toContain("saved");
});

test.each([null, "invalid"])("a missing or unreadable deadline (%s) disables reminder scheduling", expiresAt => {
  render(<DeclinedOfferReminder optionId={optionId} expiresAt={expiresAt} initialReminderStatus={null} canRequestReminder />);
  expect(screen.getByRole("checkbox")).toHaveProperty("disabled", true);
  expect(screen.getByText("A deadline is needed to schedule a reminder.")).toBeTruthy();
});

test("too-late and already-sent reminders cannot be scheduled again", async () => {
  const view = render(<DeclinedOfferReminder optionId={optionId} expiresAt="2026-10-10T12:00:00Z" initialReminderStatus={null} canRequestReminder />);
  const checkbox = await screen.findByRole("checkbox");
  await waitFor(() => expect((checkbox as HTMLInputElement).disabled).toBe(true));
  expect(screen.getByText(/Too close to the deadline/)).toBeTruthy();
  view.unmount();
  render(<DeclinedOfferReminder optionId={optionId} expiresAt="2026-11-08T12:00:00Z" initialReminderStatus="sent" canRequestReminder />);
  expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
  expect(mocks.save).not.toHaveBeenCalled();
});

test('new reminder statuses update the checkbox and protect an already sent reminder',async()=>{
 let finish!:(value:unknown)=>void;mocks.save.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const props={optionId,expiresAt:'2026-11-08T12:00:00Z',canRequestReminder:true};
 const view=render(<DeclinedOfferReminder {...props} initialReminderStatus={null}/>);
 view.rerender(<DeclinedOfferReminder {...props} initialReminderStatus='pending'/>);
 expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);
 view.rerender(<DeclinedOfferReminder {...props} initialReminderStatus='cancelled'/>);
 expect(screen.getByRole('checkbox')).toHaveProperty('checked',false);
 fireEvent.click(screen.getByRole('checkbox'));
 view.rerender(<DeclinedOfferReminder {...props} initialReminderStatus='sent'/>);
 await act(async()=>finish({status:'pending',message:'Saved'}));
 expect(screen.getByText('Two-day reminder sent.')).toBeTruthy();expect(screen.getByRole('checkbox')).toHaveProperty('disabled',true);
});

test.each([null,'pending'])('a lost reminder reply for %s offers a saved-status reload without changing its confirmed checkbox',async initialReminderStatus=>{
 mocks.save.mockRejectedValueOnce(new Error('Connection lost'));
 render(<DeclinedOfferReminder optionId={optionId} expiresAt="2026-11-08T12:00:00Z" initialReminderStatus={initialReminderStatus} canRequestReminder/>);
 const checkbox=screen.getByRole('checkbox');fireEvent.click(checkbox);
 expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('Reload its saved status'));
 expect(checkbox).toHaveProperty('checked',initialReminderStatus==='pending');expect(checkbox).toHaveProperty('disabled',true);
 expect(screen.getByRole('link',{name:'Reload reminder status →'})).toHaveProperty('href',expect.stringContaining(`/account/declined-offers?offer=${optionId}#declined-offer-${optionId}`));
 expect(mocks.save).toHaveBeenCalledOnce();
});

test('a normal reminder rejection remains an inline error with a safe retry',async()=>{
 mocks.save.mockResolvedValueOnce({status:'error',message:'Reminder unavailable. Try again.'}).mockResolvedValueOnce({status:'pending',message:'Saved'});
 render(<DeclinedOfferReminder optionId={optionId} expiresAt="2026-11-08T12:00:00Z" initialReminderStatus={null} canRequestReminder/>);
 fireEvent.click(screen.getByRole('checkbox'));await screen.findByText('Reminder unavailable. Try again.');
 expect(screen.getByRole('checkbox')).toHaveProperty('disabled',false);
 fireEvent.click(screen.getByRole('checkbox'));await screen.findByText('Saved');
 expect(screen.getByRole('checkbox')).toHaveProperty('checked',true);
});
