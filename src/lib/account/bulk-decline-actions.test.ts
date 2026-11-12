import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ account: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: mocks.preview }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { declineAllDemoPurchaseOptions, undoBulkDemoPurchaseOptions } from "./bulk-decline-actions";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const declineEventId = "44444444-4444-4444-8444-444444444444";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.preview.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.account.mockResolvedValue({ wallet: { scope: "demo" }, activity: { source: "stored", activity: [
    { slug: "gift-card", status: "completion", completionOptionId: first, completionOptionStatus: "available" },
    { slug: "gift-card", status: "completion", completionOptionId: second, completionOptionStatus: "available" },
    { slug: "other-gift-card", status: "completion", completionOptionId: "33333333-3333-4333-8333-333333333333", completionOptionStatus: "available" },
  ] } });
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "decline_preview_purchase_option_with_receipt" ? { status: "declined", declineEventId } : { status: "available" },
    error: null,
  }));
});

test("bulk decline targets the reviewed offers and Undo submits the original event receipts", async () => {
  const result = await declineAllDemoPurchaseOptions("gift-card", [first, second]);
  expect(result).toMatchObject({ status: "succeeded", optionIds: [first, second] });
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.rpc).toHaveBeenCalledWith("decline_preview_purchase_option_with_receipt", { p_completion_option_id: first, p_idempotency_key: expect.stringMatching(/^decline_[0-9a-f]{32}_[0-9a-f]{32}$/) });
  expect(mocks.rpc).not.toHaveBeenCalledWith("decline_preview_purchase_option_with_receipt", expect.objectContaining({ p_completion_option_id: "33333333-3333-4333-8333-333333333333" }));
  expect(await undoBulkDemoPurchaseOptions(result.receipts)).toMatchObject({ status: "succeeded", optionIds: [first, second] });
  expect(mocks.rpc).toHaveBeenCalledWith("undo_preview_purchase_option_decline", { p_completion_option_id: second, p_decline_event_id: declineEventId });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/declined-offers");
});

test("bulk decline is unavailable outside preview and stops when even one offer cannot be verified", async () => {
  mocks.preview.mockReturnValue(false);
  expect((await declineAllDemoPurchaseOptions("gift-card", [first, second])).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.preview.mockReturnValue(true);
  mocks.account.mockResolvedValueOnce({ wallet: { scope: "demo" }, activity: { source: "stored", activity: [
    { slug: "gift-card", status: "completion", completionOptionId: first },
    { slug: "gift-card", status: "completion", completionOptionId: null },
  ] } });
  expect((await declineAllDemoPurchaseOptions("gift-card", [first, second])).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("a partial server result names only confirmed declines for safe undo", async () => {
  mocks.rpc.mockImplementation(async (_name: string, args: { p_completion_option_id: string }) => args.p_completion_option_id === first
    ? { data: { status: "declined", declineEventId }, error: null }
    : { data: null, error: { code: "P0001" } });
  expect(await declineAllDemoPurchaseOptions("gift-card", [first, second])).toMatchObject({ status: "partial", optionIds: [first], message: expect.stringContaining("1 offer was declined") });
});

test("Undo explains a superseded decline and keeps restoring other matching receipts", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "PT409" } });
  expect(await undoBulkDemoPurchaseOptions([{ optionId: first, declineEventId }, { optionId: second, declineEventId }]))
    .toMatchObject({ status: "partial", optionIds: [second], message: expect.stringContaining("newer change") });
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
});

test("one declined offer uses singular wording", async () => {
  expect(await declineAllDemoPurchaseOptions("other-gift-card", ["33333333-3333-4333-8333-333333333333"])).toMatchObject({ status: "succeeded", message: expect.stringContaining("1 offer declined.") });
});

test("a newly available offer is never added to the reviewed decline", async () => {
  const result = await declineAllDemoPurchaseOptions("gift-card", [first]);
  expect(result).toMatchObject({ status: "succeeded", optionIds: [first] });
  expect(mocks.rpc).toHaveBeenCalledOnce();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

test.each([undefined, [], [first, first], [first, "not-an-id"], [first, "33333333-3333-4333-8333-333333333333"]].map(ids => ({ ids })))("invalid, missing or foreign review $ids makes no changes", async ({ ids }) => {
  expect((await declineAllDemoPurchaseOptions("gift-card", ids as string[])).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test.each(["declined", "purchased", "expired"])("a reviewed offer that became %s blocks the whole request", async status => {
  const account = await mocks.account();
  account.activity.activity[1].completionOptionStatus = status;
  expect(await declineAllDemoPurchaseOptions("gift-card", [first, second])).toMatchObject({ status: "error", optionIds: [], message: expect.stringContaining("offers have changed") });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
