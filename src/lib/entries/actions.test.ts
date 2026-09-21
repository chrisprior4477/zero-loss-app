import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), provision: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/lib/preview/provisioning", () => ({ ensurePreviewCustomer: mocks.provision }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { acknowledgeExtraEntryExplainer, createPreviewEntry, listPendingEntryRequests, resolvePendingEntryRequest } from "./actions";

function entryForm(quantity = "3") {
  const value = new FormData();
  value.set("offeringSlug", "samsung-m70h-tv");
  value.set("idempotencyKey", "entry_quantity_request_001");
  value.set("quantity", quantity);
  return value;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-user", email_confirmed_at: "2026-09-18" } } });
  mocks.provision.mockResolvedValue({ required: true, succeeded: true, walletAccountId: "99999999-9999-4999-8999-999999999999" });
  mocks.rpc.mockResolvedValue({ data: { status: "active", quantity: 3, entryId: "ent_abcdef123" } });
});
afterEach(() => vi.unstubAllEnvs());

test("sends the selected quantity to the atomic database batch function", async () => {
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toEqual({
    status: "succeeded",
    message: "3 entries confirmed. They are now in My Activity.",
    href: "/account/entries?item=samsung-m70h-tv&entry=ent_abcdef123",
    outcome: "active",
  });
  expect(mocks.rpc).toHaveBeenCalledWith("submit_preview_entries", {
    p_offering_slug: "samsung-m70h-tv",
    p_quantity: 3,
    p_idempotency_key: "entry_quantity_request_001",
    p_share_with_crew: false,
    p_previous_request_id: null,
  });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});

test.each(["0", "11", "2.5", "NaN", "Infinity"])('rejects unsafe quantity %s before database access', async quantity => {
  expect((await createPreviewEntry({ status: "idle" }, entryForm(quantity))).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("stores the extra-entry explainer acknowledgment on the authenticated profile", async () => {
  mocks.rpc.mockResolvedValue({ data: "2026-09-18T15:00:00Z" });
  expect(await acknowledgeExtraEntryExplainer()).toEqual({ status: "succeeded" });
  expect(mocks.rpc).toHaveBeenCalledWith("acknowledge_extra_entry_explainer");
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});

test("explicit Crew sharing uses the atomic entry-and-share function", async () => {
  const form = entryForm("1");
  form.set("shareWithCrew", "yes");
  await createPreviewEntry({ status: "idle" }, form);
  expect(mocks.rpc).toHaveBeenCalledWith("submit_preview_entries", {
    p_offering_slug: "samsung-m70h-tv",
    p_quantity: 1,
    p_idempotency_key: "entry_quantity_request_001",
    p_share_with_crew: true,
    p_previous_request_id: null,
  });
});

test("insufficient balance has an explicit UI code and never reports success", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001", message: "Add demo funds before entering this quantity." } });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toEqual({ status: "error", code: "insufficient_balance", message: "Add funds to cover these entries, then return to this prize." });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

test("a sold-out quantity error is not misidentified as a funding error", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001", message: "There are not enough entries remaining for that quantity." } });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toEqual({ status: "error", message: "There are not enough entries remaining for that quantity." });
});

test("winning batches link to the exact stored reward", async () => {
  mocks.rpc.mockResolvedValue({ data: { status: "winner", quantity: 3, entryId: "ent_abcdef123", rewardId: "11111111-2222-4333-8444-555555555555" } });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toMatchObject({
    status: "succeeded", href: "/account/wallet?reward=samsung-m70h-tv&rewardId=11111111-2222-4333-8444-555555555555",
  });
});

test("non-selected batches open the exact completion entry", async () => {
  mocks.rpc.mockResolvedValue({ data: { status: "not_selected", entryId: "ent_abcdef124" } });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toMatchObject({
    status: "succeeded", href: "/account/entries?item=samsung-m70h-tv&entry=ent_abcdef124",
  });
});

test.each(["active", "not_selected", "winner"])("old %s responses go to an unambiguous list", async status => {
  mocks.rpc.mockResolvedValue({ data: { status, entryId: "invalid?url", rewardId: "invalid?url" } });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toMatchObject({
    status: "succeeded", href: status === "winner" ? "/account/wallet" : "/account/entries",
  });
});

const pendingReceipt = { requestId: "41414141-4141-4141-8141-414141414141", slug: "samsung-m70h-tv", title: "TV", quantity: 3, amountCents: 300, status: "pending", undoUntil: "2026-09-21T12:00:30Z", serverNow: "2026-09-21T12:00:00Z", receipt: null };
test("pending submission has no premature result or redirect", async () => {
  mocks.rpc.mockResolvedValue({ data: pendingReceipt });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toMatchObject({ status: "request", request: { status: "pending", href: null, quantity: 3 } });
});

test("passes last displayed receipt for atomic server comparison, not a customer-supplied owner", async () => {
  const form = entryForm();
  form.set("previousRequestId", pendingReceipt.requestId);
  form.set("customerId", "someone-else");
  await createPreviewEntry({ status: "idle" }, form);
  expect(mocks.rpc).toHaveBeenCalledWith("submit_preview_entries", expect.objectContaining({ p_previous_request_id: pendingReceipt.requestId }));
  expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty("customerId");
});

test("an uncertain server response is not presented as a rejected or unpaid entry", async () => {
  mocks.rpc.mockRejectedValue(new Error("Timeout after commit"));
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toMatchObject({ status: "error", code: "outcome_unknown" });
});
test("Undo is server-authenticated and targets a request rather than an arbitrary amount", async () => {
  mocks.rpc.mockResolvedValue({ data: { ...pendingReceipt, status: "cancelled" } });
  expect(await resolvePendingEntryRequest(pendingReceipt.requestId, true)).toMatchObject({ request: { status: "cancelled" } });
  expect(mocks.getUser).toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledWith("resolve_preview_entry_request", { p_request_id: pendingReceipt.requestId, p_undo: true });
});
test("unsigned users cannot resolve or list another user's request", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect(await listPendingEntryRequests()).toEqual({ requests: [] });
  expect(await resolvePendingEntryRequest(pendingReceipt.requestId, true)).toHaveProperty("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("malformed or missing final receipt fails closed", async () => {
  mocks.rpc.mockResolvedValue({ data: { ...pendingReceipt, status: "accepted" } });
  expect(await resolvePendingEntryRequest(pendingReceipt.requestId, false)).toHaveProperty("error");
  mocks.rpc.mockResolvedValue({ data: { ...pendingReceipt, amountCents: -300 } });
  expect((await createPreviewEntry({ status: "idle" }, entryForm())).status).toBe("error");
});
