import { beforeEach, expect, test, vi } from "vitest";
import { inviteToCrew } from "./actions";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc }) }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "owner", email: "owner@example.test" } } });
  mocks.rpc.mockResolvedValue({ data: "accepted_for_delivery", error: null });
});
test("self-invites explain that no email is sent, using only the authenticated user's own address", async () => {
  expect(await inviteToCrew(" OWNER@example.test ")).toEqual({ ok: false, message: expect.stringContaining("no invitation was sent") });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("private recipient feedback does not promise delivery or disclose account existence", async () => {
  const result = await inviteToCrew("friend@example.test");
  expect(result.ok).toBe(true);
  expect(result.message).toContain("matching account");
  expect(result.message).toContain("leave at any time");
  expect(result.message).toContain("opt-outs are unchanged");
  expect(mocks.rpc).toHaveBeenCalledWith("request_crew_invitation", { p_email: "friend@example.test" });
});
test("failed or signed-out invitations never claim success", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "offline" } });
  expect((await inviteToCrew("friend@example.test")).ok).toBe(false);
  mocks.auth.mockResolvedValue({ data: { user: null } });
  expect((await inviteToCrew("friend@example.test")).ok).toBe(false);
});
