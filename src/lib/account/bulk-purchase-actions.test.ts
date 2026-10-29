import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: mocks.preview }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
import { completeDemoPurchaseOptions } from "./bulk-purchase-actions";
const id = (n: number) => `${String(n).padStart(8,"0")}-1111-4111-8111-111111111111`;
const request = { slug: "gift-card", purchaseIds: [id(1), id(2)], declineIds: [id(3)], totalCents: 29800, requestId: id(4), confirmed: true };
beforeEach(() => { vi.resetAllMocks(); mocks.preview.mockReturnValue(true); mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } }); });
test("uses one atomic RPC with explicit purchase and decline IDs, quoted total and stable request ID", async () => {
  mocks.rpc.mockResolvedValue({ data: { status: "purchased", purchasedCount: 2, declinedCount: 1, totalCents: 29800 } });
  expect(await completeDemoPurchaseOptions(request)).toMatchObject({ status: "succeeded", href: "/account/entries?filter=completed" });
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("complete_preview_purchase_options", { p_slug: "gift-card", p_purchase_ids: [id(1),id(2)], p_decline_ids: [id(3)], p_expected_total: 29800, p_request_id: id(4) });
});
test("opens the issued gift card with its barcode/details instead of the preview artwork", async () => {
  mocks.rpc.mockResolvedValue({ data: { status: "purchased", purchasedCount: 2, declinedCount: 1, totalCents: 29800, rewardIds: [id(8), id(9)] } });
  expect(await completeDemoPurchaseOptions(request)).toMatchObject({ status: "succeeded", href: `/account/wallet?reward=gift-card&rewardId=${id(8)}#reward-pass` });
});
test("rejects unconfirmed, repeated/overlapping IDs, signed-out and non-demo calls", async () => {
  expect((await completeDemoPurchaseOptions({ ...request, confirmed: false })).status).toBe("error");
  expect((await completeDemoPurchaseOptions({ ...request, declineIds: [id(1)] })).status).toBe("error");
  mocks.preview.mockReturnValue(false); expect((await completeDemoPurchaseOptions(request)).status).toBe("error");
  mocks.preview.mockReturnValue(true); mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await completeDemoPurchaseOptions(request)).status).toBe("error"); expect(mocks.rpc).not.toHaveBeenCalled();
});
test("insufficient balance is distinct from an uncertain response and does not fall back to separate writes", async () => {
  mocks.rpc.mockResolvedValueOnce({ error: { code: "P0001", message: "Add demo funds before completing these options." } });
  expect(await completeDemoPurchaseOptions(request)).toMatchObject({ status: "error", recovery: "balance" });
  mocks.rpc.mockRejectedValueOnce(new Error("lost response"));
  expect(await completeDemoPurchaseOptions(request)).toMatchObject({ status: "error", recovery: "check" });
  expect(mocks.rpc).toHaveBeenCalledTimes(2);
});
test("does not report success for malformed receipts and accepts more than 100 choices", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { status: "purchased", purchasedCount: 1 } });
  expect(await completeDemoPurchaseOptions(request)).toMatchObject({ status: "error", recovery: "check" });
  const large = { ...request, purchaseIds: Array.from({length:101},(_,i)=>id(i+1)), declineIds: [], totalCents: 10100 };
  mocks.rpc.mockResolvedValueOnce({ data: { status: "purchased", purchasedCount: 101, declinedCount: 0, totalCents: 10100 } });
  expect((await completeDemoPurchaseOptions(large)).status).toBe("succeeded");
});
