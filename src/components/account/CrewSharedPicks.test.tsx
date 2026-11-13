import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CrewSharedPicks } from "./CrewSharedPicks";
import { defaultCrewVisibilityRule } from "@/lib/crew/visibility";
import type { OwnCrewEntry } from "@/app/account/crew/page";

const actions = vi.hoisted(() => ({ cleanupCrewShares: vi.fn(), undoCrewShareCleanup: vi.fn(), shareOwnedCrewEntry: vi.fn() }));
vi.mock("@/lib/crew/sharing-actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => <span /> }));
const family = "10000000-0000-4000-8000-000000000001";
const football = "10000000-0000-4000-8000-000000000002";
const groups = [{ id: family, name: "Family", memberIds: [] }, { id: football, name: "Football", memberIds: [] }];
const entries: OwnCrewEntry[] = Array.from({ length: 44 }, (_, i) => ({ id: `20000000-0000-4000-8000-${String(i).padStart(12, "0")}`, offeringSlug: i < 42 ? "playstation-5-slim" : "samsung-tv", title: i < 42 ? "PlayStation 5" : "Samsung TV", retailer: "Best Buy", image: null, createdAt: "2026-01-01T12:00:00Z", sharedAt: i === 0 ? new Date().toISOString() : "2026-01-01T12:00:00Z", shared: true }));
const base = { entries, groups, rules: {}, defaultRule: defaultCrewVisibilityRule, available: true, onPrivacy: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  actions.cleanupCrewShares.mockResolvedValue({ ok: true, count: 42, undoId: "undo-id", message: "Stopped sharing 42 entries." });
  actions.undoCrewShareCleanup.mockResolvedValue({ ok: true, message: "Cleanup undone." });
});
afterEach(cleanup);

test("groups repeats and keeps an older prize accessible beyond 40 entries", () => {
  const { container } = render(<CrewSharedPicks {...base} />);
  expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
  expect(screen.getByRole("heading", { name: "Samsung TV" })).toBeTruthy();
  expect(container.querySelectorAll('[data-stacked="true"]')).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "View entries 42" }));
  expect(screen.getByText("Entry 1", { exact: true })).toBeTruthy();
  expect(screen.queryByText("Entry 6", { exact: true })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show more entries · 37 remaining" }));
  expect(screen.getByText("Entry 6", { exact: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Stop Sharing All" })).toBeTruthy();
});
test("trash immediately clears only the selected prize and group, with Undo", async () => {
  render(<CrewSharedPicks {...base} defaultRule={{ audience: "groups", memberIds: [], groupIds: [family, football] }} />);
  fireEvent.change(screen.getByLabelText("Shared with", { selector: "select" }), { target: { value: football } });
  fireEvent.click(screen.getByRole("button", { name: "Stop sharing all PlayStation 5 entries with Football" }));
  await waitFor(() => expect(actions.cleanupCrewShares).toHaveBeenCalledWith(expect.any(String), { scope: football, offeringSlug: "playstation-5-slim" }));
  fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
  await waitFor(() => expect(actions.undoCrewShareCleanup).toHaveBeenCalledWith("undo-id"));
});
test("age cleanup requires review and does not include a recently shared entry", async () => {
  render(<CrewSharedPicks {...base} />);
  fireEvent.click(screen.getByRole("button", { name: "Clean up sharing" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("43 entries match.")).toBeTruthy();
  fireEvent.click(within(dialog).getByRole("button", { name: "Review cleanup" }));
  expect(actions.cleanupCrewShares).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Stop sharing 43 entries" }));
  await waitFor(() => expect(actions.cleanupCrewShares).toHaveBeenCalledWith(expect.any(String), { scope: "crew", before: expect.any(String), reviewedEntryIds: entries.slice(1).map(entry => entry.id) }));
});

test("a share that arrives during review is excluded from confirmation", async () => {
  const { rerender } = render(<CrewSharedPicks {...base} entries={entries.slice(1, 2)} />);
  fireEvent.click(screen.getByRole("button", { name: "Clean up sharing" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "All time" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Review cleanup" }));
  rerender(<CrewSharedPicks {...base} entries={entries.slice(1, 3)} />);
  fireEvent.click(within(dialog).getByRole("button", { name: "Stop sharing 1 entry" }));
  await waitFor(() => expect(actions.cleanupCrewShares).toHaveBeenCalledWith(expect.any(String), {
    scope: "crew", before: undefined, reviewedEntryIds: [entries[1].id],
  }));
});

test('each cleanup step starts at the top with its heading focused and without submitting cleanup',()=>{
 render(<CrewSharedPicks {...base}/>);
 fireEvent.click(screen.getByRole('button',{name:'Clean up sharing'}));
 const dialog=screen.getByRole('dialog');dialog.scrollTop=275;
 const review=within(dialog).getByRole('button',{name:'Review cleanup'});review.focus();fireEvent.click(review);
 expect(screen.getByRole('dialog',{name:'Review cleanup'})).toBe(dialog);
 expect(dialog.scrollTop).toBe(0);
 expect(document.activeElement).toBe(within(dialog).getByRole('heading',{name:'Review cleanup'}));
 expect(within(dialog).getByRole('button',{name:'Close Review cleanup'})).toBeTruthy();
 expect(actions.cleanupCrewShares).not.toHaveBeenCalled();
 dialog.scrollTop=180;fireEvent.click(within(dialog).getByRole('button',{name:'Change selection'}));
 expect(dialog.scrollTop).toBe(0);
 expect(document.activeElement).toBe(within(dialog).getByRole('heading',{name:'Clean up sharing'}));
 fireEvent.click(within(dialog).getByRole('button',{name:'Close Clean up sharing'}));
 expect(screen.queryByRole('dialog')).toBeNull();expect(actions.cleanupCrewShares).not.toHaveBeenCalled();
});

test("cleanup preview and displayed dates use the selected group's own sharing clock", () => {
  const now = new Date().toISOString();
  const scoped = { ...entries[1], audienceSharedAt: { [family]: "2026-01-01T12:00:00Z", [football]: now } };
  render(<CrewSharedPicks {...base} entries={[scoped]} defaultRule={{ audience: "groups", memberIds: [], groupIds: [family, football] }} />);
  fireEvent.change(screen.getByLabelText("Shared with", { selector: "select" }), { target: { value: football } });
  fireEvent.click(screen.getByRole("button", { name: "View entries 1" }));
  expect(screen.getByText(`Shared ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" }).format(new Date(now))} · Football`)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clean up sharing" }));
  expect(screen.getByText("0 entries match.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.change(screen.getByLabelText("Shared with", { selector: "select" }), { target: { value: family } });
  fireEvent.click(screen.getByRole("button", { name: "Clean up sharing" }));
  expect(screen.getByText("1 entry matches.")).toBeTruthy();
});

test("one remaining prize is singular and larger remaining counts stay plural", () => {
  const separatePrizes = Array.from({ length: 7 }, (_, index) => ({ ...entries[index], offeringSlug: `prize-${index}`, title: `Prize ${index}` }));
  const view = render(<CrewSharedPicks {...base} entries={separatePrizes.slice(0,6)} />);
  expect(screen.getByRole("button", { name: "Show more · 1 prize" })).toBeTruthy();
  view.rerender(<CrewSharedPicks {...base} entries={separatePrizes} />);
  expect(screen.getByRole("button", { name: "Show more · 2 prizes" })).toBeTruthy();
});
test("uncertain cleanup retries the same operation instead of starting another", async () => {
  actions.cleanupCrewShares.mockRejectedValueOnce(new Error("offline"));
  render(<CrewSharedPicks {...base} />);
  fireEvent.click(screen.getByRole("button", { name: "Stop sharing all Samsung TV entries with Your Crew" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry cleanup" }));
  await waitFor(() => expect(actions.cleanupCrewShares).toHaveBeenCalledTimes(2));
  expect(actions.cleanupCrewShares.mock.calls[0]).toEqual(actions.cleanupCrewShares.mock.calls[1]);
});

test("one audience picker opens the populated group and switches back to Crew on mobile", () => {
  render(<CrewSharedPicks {...base} defaultRule={{ audience: "groups", memberIds: [], groupIds: [football] }} />);
  expect(screen.getByRole("heading", { name: "My Shared Picks Cleanup" })).toBeTruthy();
  expect((screen.getByLabelText("Shared with", { selector: "select" }) as HTMLSelectElement).value).toBe(football);
  fireEvent.click(screen.getByRole("button", { name: "Shared with Football" }));
  const dialog = screen.getByRole("dialog", { name: "Shared with" });
  fireEvent.click(within(dialog).getByRole("button", { name: /Your Crew/ }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect((screen.getByLabelText("Shared with", { selector: "select" }) as HTMLSelectElement).value).toBe("crew");
  expect(screen.queryByRole("button", { name: /Stop sharing all/ })).toBeNull();
});

test('an open group review never falls back to Crew when refreshed groups remove its target',async()=>{
 const subset=[entries[1],entries[43]];
 const rules={ [subset[0].id]:{audience:'groups' as const,memberIds:[],groupIds:[football]},[subset[1].id]:{audience:'everyone' as const,memberIds:[],groupIds:[]} };
 const view=render(<CrewSharedPicks {...base} entries={subset} rules={rules}/>);
 fireEvent.change(screen.getByLabelText('Shared with',{selector:'select'}),{target:{value:football}});
 fireEvent.click(screen.getByRole('button',{name:'Clean up sharing'}));
 fireEvent.click(screen.getByRole('button',{name:'All time'}));
 fireEvent.click(screen.getByRole('button',{name:'Review cleanup'}));
 view.rerender(<CrewSharedPicks {...base} entries={subset} groups={groups.filter(g=>g.id!==football)} rules={rules}/>);
 const dialog=screen.getByRole('dialog',{name:'Review cleanup'});
 expect(within(dialog).getByRole('heading',{name:'Football'})).toBeTruthy();
 expect(within(dialog).queryByRole('heading',{name:'Your Crew'})).toBeNull();
 expect(within(dialog).getByRole('alert').textContent).toContain('This group is no longer available');
 const confirm=within(dialog).getByRole('button',{name:'Stop sharing 1 entry'});
 expect(confirm).toHaveProperty('disabled',true);
 fireEvent.click(confirm);expect(actions.cleanupCrewShares).not.toHaveBeenCalled();
 fireEvent.click(within(dialog).getByRole('button',{name:'Close review'}));
 expect(screen.queryByRole('dialog')).toBeNull();
 fireEvent.change(screen.getByLabelText('Shared with',{selector:'select'}),{target:{value:'crew'}});
 expect(screen.getByRole('button',{name:'Clean up sharing'})).toHaveProperty('disabled',false);
});
test('a renamed group keeps the reviewed audience ID and label on confirmation',async()=>{
 const view=render(<CrewSharedPicks {...base} defaultRule={{audience:'groups',memberIds:[],groupIds:[football]}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Clean up sharing'}));
 fireEvent.click(screen.getByRole('button',{name:'All time'}));
 fireEvent.click(screen.getByRole('button',{name:'Review cleanup'}));
 view.rerender(<CrewSharedPicks {...base} groups={groups.map(g=>g.id===football?{...g,name:'Renamed Football'}:g)} defaultRule={{audience:'groups',memberIds:[],groupIds:[football]}}/>);
 expect(within(screen.getByRole('dialog')).getByRole('heading',{name:'Football'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Stop sharing 44 entries'}));
 await waitFor(()=>expect(actions.cleanupCrewShares).toHaveBeenCalledWith(expect.any(String),{scope:football,before:undefined,reviewedEntryIds:entries.map(entry=>entry.id)}));
});
