import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ account: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/components/support/SupportForm", () => ({ SupportForm: ({ caseId, transactionId, rewardId, deposit, staff }: { caseId?: string; transactionId?: string; rewardId?: string; deposit?: { key: string }; staff?: boolean }) => <div data-testid="support-form" data-case={caseId} data-transaction={transactionId} data-reward={rewardId} data-deposit={deposit?.key} data-staff={String(staff ?? false)}>Message form</div> }));
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

test('sign-in preserves an exact reward support handoff',async()=>{
 mocks.account.mockResolvedValue(null);
 render(await SupportPage({searchParams:Promise.resolve({rewardId:caseId})}));
 expect(screen.getByRole('link',{name:'Sign in to get help'}).getAttribute('href')).toBe(`/login?next=${encodeURIComponent(`/support?rewardId=${caseId}#report-problem`)}`);
 expect(mocks.from).not.toHaveBeenCalled();
});

test('reward prefill authorizes ownership and never uses a wallet transaction',async()=>{
 const reward=query({id:caseId});mocks.from.mockImplementation(table=>table==='customer_rewards'?reward:query([]));
 render(await SupportPage({searchParams:Promise.resolve({rewardId:caseId})}));
 expect(reward.select).toHaveBeenCalledWith('id');expect(reward.eq.mock.calls).toEqual([['id',caseId],['customer_id',own]]);
 expect(screen.getByTestId('support-form').getAttribute('data-reward')).toBe(caseId);
 expect(screen.getByTestId('support-form').getAttribute('data-transaction')).toBeNull();
 expect(screen.getByText(`Reward reference: ${caseId}`)).toBeTruthy();
 expect(screen.getByRole('link',{name:'Back to this reward'}).getAttribute('href')).toBe(`/account/wallet?rewardId=${caseId}#reward-pass`);
 expect(mocks.from).not.toHaveBeenCalledWith('ledger_entries');
});

test.each([null,{data:null,error:{message:'Unavailable'}}])('a foreign or unavailable reward has no support form (%s)',async failure=>{
 mocks.from.mockImplementation(table=>table==='customer_rewards'?query(null,failure):query([]));
 render(await SupportPage({searchParams:Promise.resolve({rewardId:caseId})}));
 expect(screen.queryByTestId('support-form')).toBeNull();expect(screen.getByRole('alert').textContent).toContain('reward is unavailable');
 expect(screen.queryByRole('link',{name:'Back to this reward'})).toBeNull();
});

test('a reward cannot silently attach an unrelated transaction',async()=>{
 render(await SupportPage({searchParams:Promise.resolve({rewardId:caseId,transaction:own})}));
 expect(screen.queryByTestId('support-form')).toBeNull();expect(mocks.from).not.toHaveBeenCalled();
});

test("a deposit report uses the account's exact receipt and keeps a direct wallet return", async () => {
  const deposit = { id: own, idempotencyKey: caseId, amount: 7300, currency: "USD", status: "processing", reconciliation: "discrepancy", created_at: "2026-11-12T12:00:00Z" };
  mocks.rpc.mockImplementation(async name => ({ data: name === "get_demo_funding_requests" ? [deposit] : false }));
  render(await SupportPage({ searchParams: Promise.resolve({ deposit: caseId }) }));
  expect(screen.getByTestId("support-form").getAttribute("data-deposit")).toBe(caseId);
  expect(screen.getByText("$73 USD")).toBeTruthy();
  expect(screen.getByText(`Deposit reference: ${own}`)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Back to this deposit" }).getAttribute("href")).toBe(`/account/wallet?view=history&deposit=${caseId}#purchase-deposit`);
});

test("a receipt missing from the signed-in account cannot open a linked deposit report", async () => {
  mocks.rpc.mockImplementation(async name => ({ data: name === "get_demo_funding_requests" ? [] : false }));
  render(await SupportPage({ searchParams: Promise.resolve({ deposit: caseId }) }));
  expect(screen.getByRole("alert").textContent).toContain("couldn’t verify that deposit");
  expect(screen.queryByTestId("support-form")).toBeNull();
  expect(screen.queryByRole("link", { name: "Back to this deposit" })).toBeNull();
});

test("sign-in preserves the deposit report destination", async () => {
  mocks.account.mockResolvedValue(null);
  render(await SupportPage({ searchParams: Promise.resolve({ deposit: caseId }) }));
  expect(screen.getByRole("link", { name: "Sign in to get help" }).getAttribute("href")).toBe(`/login?next=${encodeURIComponent(`/support?deposit=${caseId}#report-problem`)}`);
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
  expect(mocks.from).not.toHaveBeenCalledWith("customer_orders");
  expect(screen.getByRole("alert").textContent).toContain("transaction is unavailable");
});
test("authorized Ledger read uses only customer-readable columns and renders the linked form", async () => {
  const ledger = query({ id: caseId, amount: 100, created_at: "2026-09-21T12:00:00Z", entry_type: "DEPOSIT", source_event: "funding-event" });
  mocks.from.mockImplementation(table => table === "ledger_entries" ? ledger : query([]));
  render(await SupportPage({ searchParams: Promise.resolve({ transaction: caseId }) }));
  expect(ledger.select).toHaveBeenCalledWith("id,amount,created_at,entry_type,source_event");
  expect(ledger.eq.mock.calls).toEqual([["id", caseId], ["customer_id", own]]);
  expect(screen.getByTestId("support-form").getAttribute("data-transaction")).toBe(caseId);
  expect(screen.getByText(/Linked wallet transaction/).textContent).toContain("+$1");
  expect(mocks.from).not.toHaveBeenCalledWith("customer_orders");
  expect(screen.queryByRole("link", { name: "Back to this order" })).toBeNull();
});

test.each(["matched", "archived", "unavailable"] as const)("a purchase report keeps the exact charge when its order is %s", async state => {
  const title = "Nintendo Switch – OLED Model";
  const orders = ["ord_first", "ord_second"].map(orderNumber => ({ orderNumber, title, image: "/catalog/nintendo-switch-oled.jpg" }));
  mocks.account.mockResolvedValue({ userId: own, wallet: { scope: "demo" }, timezone: "America/New_York", orders: { orders } });
  const ledger = query({ id: caseId, amount: -39900, created_at: "2026-11-06T17:46:00Z", entry_type: "PURCHASE_DEBIT", source_event: "second-checkout" });
  const order = query(state === "unavailable" ? null : { order_number: state === "matched" ? "ord_second" : "ord_archived" },
    state === "unavailable" ? { message: "Unavailable" } : null);
  mocks.from.mockImplementation(table => table === "ledger_entries" ? ledger : table === "customer_orders" ? order : query([]));
  render(await SupportPage({ searchParams: Promise.resolve({ transaction: caseId }) }));
  expect(order.eq.mock.calls).toEqual([["customer_id", own], ["provider_event_id", "second-checkout"]]);
  expect(screen.getByTestId("support-form").getAttribute("data-transaction")).toBe(caseId);
  expect(screen.getByText(/-\$399/)).toBeTruthy();
  expect(screen.getByText(/Nov 6, 2026, 12:46 PM EST/)).toBeTruthy();
  const back = screen.queryByRole("link", { name: "Back to this order" });
  if (state === "matched") {
    expect(screen.getByText(title)).toBeTruthy();
    expect(document.querySelector("#report-problem img")?.getAttribute("width")).toBe("36");
    expect(back?.getAttribute("href")).toBe("/account/orders?order=ord_second#order-ord_second");
  } else {
    expect(screen.queryByText(title)).toBeNull();
    expect(back).toBeNull();
  }
});

test.each([
  ["2026-01-15T17:00:00Z", "12:00 PM EST"],
  ["2026-07-15T16:00:00Z", "12:00 PM EDT"],
])("support transaction dates use the account zone and daylight-saving label for %s", async (created_at, expected) => {
  mocks.account.mockResolvedValue({ userId: own, wallet: { scope: "demo" }, timezone: "America/New_York" });
  mocks.from.mockImplementation(table => table === "ledger_entries" ? query({ id: caseId, amount: -100, created_at }) : query([]));
  render(await SupportPage({ searchParams: Promise.resolve({ transaction: caseId }) }));
  expect(screen.getByText(/Linked wallet transaction/).textContent).toContain(expected);
  expect(screen.queryByText(/America\/New_York/)).toBeNull();
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
  expect(screen.getByRole("link", { name: "My support cases" }).getAttribute("href")).toBe("/support#case-list");
  expect(document.getElementById("case-list")).not.toBeNull();
  expect(screen.getByRole("link", { name: "Wallet history" }).getAttribute("href")).toBe("/account/wallet?view=history");
  expect(screen.getByRole("link", { name: "Quick answers" }).getAttribute("href")).toBe("/faq#faq-intro");
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

test("conversation dates retain an international account's time zone without technical region labels", async () => {
  mocks.account.mockResolvedValue({ userId: own, wallet: { scope: "demo" }, timezone: "Asia/Tokyo" });
  mocks.from.mockImplementation(table => table === "support_cases"
    ? query({ id: caseId, case_number: "sup_test", subject: "Funding question", status: "open", customer_id: own })
    : query([{ id: "message", actor_kind: "customer", body: "My question", created_at: "2026-01-15T17:00:00Z" }]));
  render(await SupportPage({ searchParams: Promise.resolve({ case: caseId }) }));
  expect(screen.getAllByRole("listitem")[0].textContent).toContain("Jan 16, 2026, 2:00 AM GMT+9");
  expect(screen.queryByText(/Asia\/Tokyo/)).toBeNull();
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
