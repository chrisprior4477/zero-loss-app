import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ account: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/components/support/SupportForm", () => ({ SupportForm: ({ caseId, transactionId, staff }: { caseId?: string; transactionId?: string; staff?: boolean }) => <div data-testid="support-form" data-case={caseId} data-transaction={transactionId} data-staff={String(staff ?? false)}>Message form</div> }));
import SupportPage from "./page";
const caseId = "11111111-1111-4111-8111-111111111111";
const own = "22222222-2222-4222-8222-222222222222";
function query(data: unknown, error: unknown = null) {
  const result = { data, error };
  const chain = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), maybeSingle: vi.fn(), then: (resolve: (r: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  [chain.select, chain.eq, chain.order, chain.range].forEach(fn => fn.mockReturnValue(chain));
  chain.maybeSingle.mockResolvedValue(result);
  return chain;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.account.mockResolvedValue({ userId: own, wallet: { scope: "demo" } });
  mocks.rpc.mockResolvedValue({ data: false });
  mocks.from.mockReturnValue(query([]));
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
test("sign-in preserves a selected wallet transaction", async () => {
  mocks.account.mockResolvedValue(null);
  render(await SupportPage({ searchParams: Promise.resolve({ transaction: caseId }) }));
  expect(screen.getByRole("link", { name: "Sign in to get help" }).getAttribute("href")).toBe(`/login?next=${encodeURIComponent(`/support?transaction=${caseId}`)}`);
  expect(mocks.from).not.toHaveBeenCalled();
});
test("an ordinary customer cannot open the private inbox", async () => {
  render(await SupportPage({ searchParams: Promise.resolve({ view: "inbox" }) }));
  expect(screen.getByRole("alert").textContent).toContain("not available");
  expect(mocks.from).not.toHaveBeenCalled();
});
test("foreign transaction fails closed instead of rendering a misleading linked form", async () => {
  const ledger = query(null);
  mocks.from.mockImplementation(table => table === "ledger_entries" ? ledger : query([]));
  render(await SupportPage({ searchParams: Promise.resolve({ transaction: caseId }) }));
  expect(ledger.eq).toHaveBeenCalledWith("customer_id", own);
  expect(ledger.eq).not.toHaveBeenCalledWith("wallet_scope", expect.anything());
  expect(screen.queryByTestId("support-form")).toBeNull();
  expect(screen.getByRole("alert").textContent).toContain("transaction is unavailable");
});
test("authorized Ledger read uses only customer-readable columns and renders the linked form", async () => {
  const ledger = query({ id: caseId, amount: -100, created_at: "2026-09-21T12:00:00Z" });
  mocks.from.mockImplementation(table => table === "ledger_entries" ? ledger : query([]));
  render(await SupportPage({ searchParams: Promise.resolve({ transaction: caseId }) }));
  expect(ledger.select).toHaveBeenCalledWith("id,amount,created_at");
  expect(ledger.eq.mock.calls).toEqual([["id", caseId], ["customer_id", own]]);
  expect(screen.getByTestId("support-form").getAttribute("data-transaction")).toBe(caseId);
  expect(screen.getByText(/Linked wallet transaction/).textContent).toContain("-$1");
});
test("a non-demo or unavailable wallet cannot prefill a demo support transaction", async () => {
  mocks.account.mockResolvedValue({ userId: own, wallet: { scope: "production" } });
  render(await SupportPage({ searchParams: Promise.resolve({ transaction: caseId }) }));
  expect(mocks.from).not.toHaveBeenCalledWith("ledger_entries");
  expect(screen.queryByTestId("support-form")).toBeNull();
});
test("case list always has an explicit owner filter outside the staff inbox", async () => {
  mocks.rpc.mockResolvedValue({ data: true });
  const cases = query(Array.from({ length: 51 }, (_, i) => ({ id: `case-${i}`, case_number: `sup_${i}`, subject: `Question ${i}`, status: "open" })));
  mocks.from.mockReturnValue(cases);
  render(await SupportPage({ searchParams: Promise.resolve({}) }));
  expect(cases.eq).toHaveBeenCalledWith("customer_id", own);
  expect(cases.range).toHaveBeenCalledWith(0, 50);
  expect(screen.getByRole("link", { name: "Older cases →" }).getAttribute("href")).toBe("/support?page=2#case-list");
  expect(screen.queryByText("Question 50")).toBeNull();
});
test("the latest conversation page loads newest messages then displays them chronologically", async () => {
  const events = query([
    { id: "newer", actor_kind: "staff", body: "Newest support answer", created_at: "2026-09-21T12:01:00Z" },
    { id: "older", actor_kind: "customer", body: "Original customer message", created_at: "2026-09-21T12:00:00Z" },
  ]);
  mocks.from.mockImplementation(table => table === "support_cases" ? query({ id: caseId, case_number: "sup_test", subject: "Funding question", status: "awaiting_customer", customer_id: own }) : events);
  render(await SupportPage({ searchParams: Promise.resolve({ case: caseId }) }));
  expect(events.order).toHaveBeenCalledWith("created_at", { ascending: false });
  expect(screen.getAllByRole("listitem")[0].textContent).toContain("Original customer message");
  expect(screen.getAllByRole("listitem")[1].textContent).toContain("Newest support answer");
  expect(screen.getByTestId("support-form").getAttribute("data-staff")).toBe("false");
});
test("older conversation pages can navigate back without hiding the latest reply behind a limit", async () => {
  const events = query([]);
  mocks.from.mockImplementation(table => table === "support_cases" ? query({ id: caseId, case_number: "sup_test", subject: "Funding question", status: "open", customer_id: own }) : events);
  render(await SupportPage({ searchParams: Promise.resolve({ case: caseId, messages: "2" }) }));
  expect(events.range).toHaveBeenCalledWith(50, 100);
  expect(screen.getByRole("link", { name: /Return to the latest messages/ }).getAttribute("href")).toBe(`/support?case=${caseId}#conversation`);
});
test("a missing or unauthorized case never produces a reply form", async () => {
  mocks.from.mockReturnValue(query(null));
  render(await SupportPage({ searchParams: Promise.resolve({ case: caseId }) }));
  expect(screen.getByRole("alert").textContent).toContain("case is unavailable");
  expect(screen.queryByTestId("support-form")).toBeNull();
});
