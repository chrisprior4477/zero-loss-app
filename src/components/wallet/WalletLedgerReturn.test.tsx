import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import type { AnchorHTMLAttributes } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { WalletLedger } from "./WalletLedger";
import { WalletHistoryLandingScroll } from "./WalletLandingScroll";
import { ledgerReturnKey, type LedgerReturn } from "@/lib/wallet/ledger-return";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({ default: ({ onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) =>
  <a {...props} onClick={event => { onClick?.(event); event.preventDefault(); }} /> }));

const href = "/account/wallet?view=history#transactions";
const entries = Array.from({ length: 12 }, (_, n) => ({ id: `funding-${n}`, entry_type: "DEPOSIT", amount: 100, created_at: "2026-11-05T17:00:00Z" }));
const allEntries = [...entries, { id: "entry-1", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-11-05T17:00:00Z" }];
let frames: Map<number, FrameRequestCallback>;
let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  window.history.replaceState({ frameworkState: "keep" }, "", href);
  scrollTo = vi.fn();
  vi.stubGlobal("scrollTo", scrollTo);
  vi.stubGlobal("scrollY", 1300);
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query.includes("max-width") })));
  frames = new Map();
  let id = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++id, callback); return id; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/"); });
function flush() {
  act(() => {
    while (frames.size) {
      const [id, callback] = frames.entries().next().value!;
      frames.delete(id);
      callback(0);
    }
  });
}
function saveView() {
  const page = render(<WalletLedger walletId="wallet-1" entries={allEntries} />);
  fireEvent.click(screen.getByRole("button", { name: "Funding" }));
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-01" } });
  fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-11-06" } });
  fireEvent.click(screen.getByRole("button", { name: /See more transactions/ }));
  fireEvent.click(screen.getAllByRole("link", { name: "Report a problem" })[2]);
  return page;
}

test("a mobile Support bookmark reopens the exact ticket on its six-ticket desktop page", () => {
  const mobile = saveView();
  mobile.unmount();
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query.includes("min-width") })));
  render(<WalletLedger walletId="wallet-1" entries={allEntries} />);
  flush();
  expect(screen.getByText("Showing 7–12 of 12 transactions")).toBeTruthy();
  expect(document.getElementById("transaction-funding-7")).toBeTruthy();
  expect(screen.getByText("Most recent ↓")).toBeTruthy();
  expect(screen.getByText("Earlier ↓")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Previous" }));
  expect(screen.getByText("Showing 1–6 of 12 transactions")).toBeTruthy();
  const tickets = screen.getAllByRole("listitem");
  expect(tickets.map(row => row.id)).toEqual(entries.slice(0, 6).map(entry => `transaction-${entry.id}`));
  expect(tickets.every(row => row.firstElementChild?.tagName === "TIME")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Entries" }));
  expect(screen.getAllByRole("listitem")).toHaveLength(1);
  expect(screen.queryByText("Earlier ↓")).toBeNull();
});

test("Support Back restores both dates, category, the five-ticket page and position without changing the support link", () => {
  const page = saveView();
  const saved = window.history.state;
  expect(saved.frameworkState).toBe("keep");
  expect(saved[ledgerReturnKey]).toMatchObject({ filter: "funding", from: "2026-11-01", through: "2026-11-06", offset: 5, rowId: "transaction-funding-7" });
  expect(screen.getAllByRole("link", { name: "Report a problem" })[2].getAttribute("href")).toBe("/support?transaction=funding-7");
  page.unmount();
  window.history.replaceState({}, "", "/support?transaction=funding-7");
  window.history.replaceState(saved, "", href);
  render(<WalletLedger walletId="wallet-1" entries={allEntries} />);
  flush();
  expect(screen.getByRole("button", { name: "Funding" }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByLabelText("From date") as HTMLInputElement).value).toBe("2026-11-01");
  expect((screen.getByLabelText("To date") as HTMLInputElement).value).toBe("2026-11-06");
  expect(screen.getByText("Showing 6–10 of 12 transactions")).toBeTruthy();
  expect(document.getElementById("transaction-funding-7")).toBeTruthy();
  expect(document.getElementById("transaction-funding-0")).toBeNull();
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 1300, behavior: "instant" });
  // A second visit stores the customer's current choices, not the first bookmark.
  fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
  fireEvent.click(screen.getByRole("button", { name: "Entries" }));
  fireEvent.click(screen.getByRole("link", { name: "Report a problem" }));
  expect(window.history.state[ledgerReturnKey]).toMatchObject({ filter: "entries", from: "", through: "", offset: 0, rowId: "transaction-entry-1" });
});

test("returning from Support restores the Purchases filter and its page", () => {
  const purchases = entries.map((entry, index) => ({ ...entry, id: `purchase-${index}`, entry_type: "PURCHASE_DEBIT", amount: -9900 }));
  const mixed = [...purchases, ...entries];
  const page = render(<WalletLedger walletId="wallet-1" entries={mixed} />);
  fireEvent.click(screen.getByRole("button", { name: "Purchases" }));
  fireEvent.click(screen.getByRole("button", { name: /See more transactions/ }));
  fireEvent.click(screen.getAllByRole("link", { name: "Report a problem" })[1]);
  expect(window.history.state[ledgerReturnKey]).toMatchObject({ filter: "purchases", offset: 5, rowId: "transaction-purchase-6" });
  page.unmount();
  render(<WalletLedger walletId="wallet-1" entries={mixed} />);
  flush();
  expect(screen.getByRole("button", { name: "Purchases" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Showing 6–10 of 12 transactions")).toBeTruthy();
  expect(document.getElementById("transaction-purchase-6")).toBeTruthy();
  expect(screen.queryByText("Funds added")).toBeNull();
});

test.each(["fresh visit", "another wallet", "different selected transaction"])("does not apply a Support bookmark to %s", kind => {
  const page = saveView();
  page.unmount();
  if (kind === "fresh visit") window.history.replaceState({}, "", href);
  render(<WalletLedger walletId={kind === "another wallet" ? "wallet-2" : "wallet-1"} selectedId={kind === "different selected transaction" ? "entry-1" : undefined} entries={allEntries} />);
  flush();
  expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
  expect((screen.getByLabelText("From date") as HTMLInputElement).value).toBe("");
  expect(scrollTo).not.toHaveBeenCalled();
});

test("Back/Forward can restore a retained wallet component and refresh uses the same bookmark", () => {
  const page = saveView();
  const saved = window.history.state;
  fireEvent.click(screen.getByRole("button", { name: "All" }));
  act(() => window.dispatchEvent(new PopStateEvent("popstate", { state: saved })));
  expect(screen.getByRole("button", { name: "Funding" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Showing 6–10 of 12 transactions")).toBeTruthy();
  page.unmount();
  render(<WalletLedger walletId="wallet-1" entries={allEntries} />);
  flush();
  expect(screen.getByText("Showing 6–10 of 12 transactions")).toBeTruthy();
});

test("a smaller refreshed history clamps the restored batch instead of showing a blank page", () => {
  const page = saveView();
  page.unmount();
  render(<WalletLedger walletId="wallet-1" entries={entries.slice(0, 2)} />);
  flush();
  expect(screen.getByText("Showing 2 of 2 transactions")).toBeTruthy();
  expect(screen.getAllByRole("link", { name: "Report a problem" })).toHaveLength(2);
  expect(scrollTo).toHaveBeenLastCalledWith({ top: 1300, behavior: "instant" });
});

test.each([false, true])("wallet landing does not override Support restoration (selected transaction: %s)", selected => {
  window.history.replaceState({}, "", "/account/wallet?view=history");
  const saved: LedgerReturn = { walletId: "wallet-1", href: window.location.href, selectedId: selected ? "funding-0" : undefined, filter: "funding", from: "", through: "", showArchived: false, offset: 0, scrollY: 1300, rowId: "transaction-funding-0", rowTop: 150, expandedRows: [] };
  window.history.replaceState({ [ledgerReturnKey]: saved }, "");
  render(<><div id="balance" /><WalletHistoryLandingScroll walletId="wallet-1" selectedId={saved.selectedId} selectedRequested={selected} enabled={!selected} target="transaction-funding-0" /></>);
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("opening Support in another tab does not overwrite this tab's return position", () => {
  render(<WalletLedger walletId="wallet-1" entries={entries} />);
  fireEvent.click(screen.getAllByRole("link", { name: "Report a problem" })[0], { ctrlKey: true });
  expect(window.history.state[ledgerReturnKey]).toBeUndefined();
});

test("corrects a late browser scroll but stops immediately when the customer starts scrolling", () => {
  vi.useFakeTimers();
  const page = saveView();
  page.unmount();
  render(<WalletLedger walletId="wallet-1" entries={allEntries} />);
  flush();
  scrollTo.mockClear();
  act(() => vi.advanceTimersByTime(400));
  flush();
  expect(scrollTo).toHaveBeenCalledWith({ top: 1300, behavior: "instant" });
  scrollTo.mockClear();
  fireEvent.wheel(window);
  act(() => vi.advanceTimersByTime(1000));
  flush();
  expect(scrollTo).not.toHaveBeenCalled();
});



test.each(["View product", "View result", "View result for Nintendo Switch", "Nintendo Switch"])("%s preserves purchase filters, dates, page and the clicked transaction", label => {
  const item = { ...storedActivityFixture().activity[0], slug: "nintendo-switch", title: "Nintendo Switch", entryId: "ent_owned", status: "prize" as const, rewardId: "reward-owned", rewardStatus: "ready" as const };
  const purchases = entries.map((entry, index) => ({ ...entry, id: 'purchase-' + index, entry_type: "PURCHASE_DEBIT", amount: -39900, entryIds: [item.entryId], product: { slug: item.slug, title: item.title, image: "/test.png" } }));
  const mixed = [...entries, ...purchases];
  const props = { walletId: "wallet-1", entries: mixed, activity: [item] };
  const view = render(<WalletLedger {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Purchases" }));
  fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-11-01" } });
  fireEvent.click(screen.getByRole("button", { name: /See more transactions/ }));
  fireEvent.click(screen.getAllByRole("link", { name: label })[1]);
  expect(window.history.state[ledgerReturnKey]).toMatchObject({ filter: "purchases", from: "2026-11-01", offset: 5, rowId: "transaction-purchase-6" });
  expect(window.history.state.frameworkState).toBe("keep");
  view.unmount();
  render(<WalletLedger {...props} />); flush();
  expect(screen.getByRole("button", { name: "Purchases" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("Showing 6–10 of 12 transactions")).toBeTruthy();
});
