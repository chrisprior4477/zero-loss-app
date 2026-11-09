import { beforeEach, expect, test, vi } from "vitest";
const request = "11111111-1111-4111-8111-111111111111";
const receipt = "22222222-2222-4222-8222-222222222222";
const mock = vi.hoisted(() => ({ preview: true, user: { id: "owner" } as { id: string } | null,
  rpc: vi.fn(), from: vi.fn(), eq: vi.fn(), read: false, readError: false, hidden: new Set<string>(), shares: [] as unknown[] }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: () => mock.preview }));
vi.mock("@/lib/catalog/shopping-catalog", () => ({ getShoppingCatalog: async () => ({ hidden: mock.hidden }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mock.user } }) }, rpc: mock.rpc, from: mock.from,
}) }));
import { sendDemoShare } from "./demo-share-action";
beforeEach(() => {
  vi.clearAllMocks(); mock.preview = true; mock.user = { id: "owner" }; mock.read = false; mock.readError = false; mock.hidden = new Set();
  mock.shares = [{ id: receipt, token: request, slug: "amazon-100-gift-card", title: "$100 Amazon Gift Card", sender: "Chris", createdAt: "2026-11-09T12:00:00Z" }];
  mock.rpc.mockImplementation(async name => ({ data: name === "send_demo_product_share" ? receipt : mock.shares, error: null }));
  mock.from.mockImplementation(() => {
    const query = { select: () => query, eq: (...args: unknown[]) => { mock.eq(...args); return query; },
      maybeSingle: async () => ({ data: mock.read ? { notification_id: `shared-${receipt}` } : null, error: mock.readError ? { code: "offline" } : null }) };
    return query;
  });
});
test("sends only to the authenticated account through the self-demo RPC", async () => {
  expect((await sendDemoShare(request)).ok).toBe(true);
  expect(mock.rpc).toHaveBeenCalledWith("send_demo_product_share", { p_request_id: request });
  expect(mock.eq).toHaveBeenCalledWith("customer_id", "owner");
});
test("production, guests, and malformed requests cannot send a demo", async () => {
  mock.preview = false; expect((await sendDemoShare(request)).ok).toBe(false);
  mock.preview = true; mock.user = null; expect((await sendDemoShare(request)).ok).toBe(false);
  mock.user = { id: "owner" }; expect((await sendDemoShare("bad")).ok).toBe(false);
  expect(mock.rpc).not.toHaveBeenCalled();
});
test("a database failure is never reported as a delivered share", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "42501" } }); expect((await sendDemoShare(request)).ok).toBe(false);
});
test("no available prize produces a useful message instead of an unavailable link", async () => {
  mock.rpc.mockResolvedValue({ error: { code: "P0001", message: "No open demo prize is available to share right now." } });
  expect(await sendDemoShare(request)).toEqual({ ok: false, message: "No open demo prize is available to share right now." });
});
test("the confirmed prize and exact receipt replace the old hardcoded Walmart alert", async () => {
  const result = await sendDemoShare(request);
  expect(result.notification).toMatchObject({ id: `shared-${receipt}`, title: "Chris shared $100 Amazon Gift Card", href: `/account/favorites?tab=shared&share=${receipt}` });
  expect(result.message).toContain("$100 Amazon Gift Card");
  expect(result.isRead).toBe(false);
  mock.read = true; expect((await sendDemoShare(request)).isRead).toBe(true);
});
test("a prize closing or resolving after the database save cannot create a clickable alert", async () => {
  mock.hidden.add("amazon-100-gift-card"); const result = await sendDemoShare(request);
  expect(result.notification).toBeUndefined(); expect(result.message).toContain("no longer available");
});
test("receipt or read-status failures never fabricate an alert", async () => {
  mock.readError = true; expect((await sendDemoShare(request)).notification).toBeUndefined();
  mock.readError = false; mock.shares = []; expect((await sendDemoShare(request)).notification).toBeUndefined();
});
