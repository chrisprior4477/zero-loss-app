import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ account: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: mocks.preview }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { declineAllDemoPurchaseOptions, undoBulkDemoPurchaseOptions } from "./bulk-decline-actions";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.preview.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.account.mockResolvedValue({ wallet: { scope: "demo" }, activity: { source: "stored", activity: [
    { slug: "gift-card", status: "completion", completionOptionId: first, completionOptionStatus: "available" },
    { slug: "gift-card", status: "completion", completionOptionId: second, completionOptionStatus: "available" },
    { slug: "other-gift-card", status: "completion", completionOptionId: "33333333-3333-4333-8333-333333333333", completionOptionStatus: "available" },
  ] } });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: { status: name === "decline_purchase_option" ? "declined" : "available" }, error: null }));
});

test("bulk decline targets only the signed-in demo account's current item and undo revives those IDs", async () => {
  const result = await declineAllDemoPurchaseOptions("gift-card");
  expect(result).toMatchObject({ status: "succeeded", optionIds: [first, second] });
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
  expect(mocks.rpc).toHaveBeenCalledWith("decline_purchase_option", { p_completion_option_id: first, p_idempotency_key: `decline_${first.replaceAll("-", "")}` });
  expect(mocks.rpc).not.toHaveBeenCalledWith("decline_purchase_option", expect.objectContaining({ p_completion_option_id: "33333333-3333-4333-8333-333333333333" }));
  expect(await undoBulkDemoPurchaseOptions(result.optionIds)).toMatchObject({ status: "succeeded", optionIds: [first, second] });
  expect(mocks.rpc).toHaveBeenCalledWith("revive_preview_purchase_option", { p_completion_option_id: second, p_idempotency_key: `revive_${second.replaceAll("-", "")}` });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/declined-offers");
});

test("bulk decline is unavailable outside preview and stops when even one offer cannot be verified", async () => {
  mocks.preview.mockReturnValue(false);
  expect((await declineAllDemoPurchaseOptions("gift-card")).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.preview.mockReturnValue(true);
  mocks.account.mockResolvedValueOnce({ wallet: { scope: "demo" }, activity: { source: "stored", activity: [
    { slug: "gift-card", status: "completion", completionOptionId: first },
    { slug: "gift-card", status: "completion", completionOptionId: null },
  ] } });
  expect((await declineAllDemoPurchaseOptions("gift-card")).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("a partial server result names only confirmed declines for safe undo", async () => {
  mocks.rpc.mockImplementation(async (_name: string, args: { p_completion_option_id: string }) => args.p_completion_option_id === first
    ? { data: { status: "declined" }, error: null }
    : { data: null, error: { code: "P0001" } });
  expect(await declineAllDemoPurchaseOptions("gift-card")).toMatchObject({ status: "partial", optionIds: [first] });
});
