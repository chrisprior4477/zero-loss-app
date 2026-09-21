import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { claimReward } from "./lifecycle-actions";
const id = "97999999-9999-4999-8999-999999999971";
function form() { const f = new FormData(); f.set("rewardId", id); return f; }
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id } } }); });
test("server verification gate opens walkthrough instead of claiming or exposing a credential", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001", details: "identity_verification_required" } });
  expect((await claimReward({ status: "idle" }, form())).status).toBe("verification_required");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
test("server-authorized claim still uses the stable key and refreshes wallet", async () => {
  mocks.rpc.mockResolvedValue({ data: { status: "claimed" } });
  expect((await claimReward({ status: "idle" }, form())).status).toBe("succeeded");
  expect(mocks.rpc).toHaveBeenCalledWith("claim_preview_reward", { p_reward_id: id, p_idempotency_key: `claim_${id.replaceAll("-", "")}` });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/wallet");
});
test("expired session cannot claim", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await claimReward({ status: "idle" }, form())).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
