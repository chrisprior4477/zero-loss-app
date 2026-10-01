import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: mocks.preview }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { restartPreviewReward } from "./lifecycle-actions";

const rewardId = "22222222-2222-4222-8222-222222222222";
function form(id = rewardId) {
  const data = new FormData();
  data.set("rewardId", id);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.preview.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.rpc.mockResolvedValue({ data: { status: "restarted", slug: "samsung-m70h-tv" } });
});

test("restarts only the exact owned demo reward and keeps historical records", async () => {
  const data = form();
  data.set("customerId", "someone-else");
  data.set("slug", "an-unrelated-item");
  expect(await restartPreviewReward({ status: "idle" }, data)).toMatchObject({
    status: "succeeded", href: "/items/samsung-m70h-tv#enter-entry",
    message: expect.stringContaining("original entry and wallet history are preserved"),
  });
  expect(mocks.rpc).toHaveBeenCalledWith("restart_preview_reward", {
    p_reward_id: rewardId, p_idempotency_key: "restart_22222222222242228222222222222222",
  });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/wallet");
});

test("production, invalid IDs, and signed-out visitors cannot restart", async () => {
  mocks.preview.mockReturnValue(false);
  expect((await restartPreviewReward({ status: "idle" }, form())).status).toBe("error");
  mocks.preview.mockReturnValue(true);
  expect((await restartPreviewReward({ status: "idle" }, form("bad"))).status).toBe("error");
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await restartPreviewReward({ status: "idle" }, form())).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test.each([
  { error: { code: "P0001", message: "private database details" } },
  { data: { status: "restarted", slug: "not-a-catalog-item" } },
  { data: null },
])("unknown results never claim that the reward was removed: %j", async result => {
  mocks.rpc.mockResolvedValue(result);
  const state = await restartPreviewReward({ status: "idle" }, form());
  expect(state.status).toBe("error");
  expect(JSON.stringify(state)).not.toContain("private database details");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
