import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: () => true }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { setDeclinedOfferEmailReminder } from "./lifecycle-actions";

const optionId = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner", email_confirmed_at: "2026-01-01T00:00:00Z" } } });
  mocks.rpc.mockResolvedValue({ data: { status: "pending" } });
});

test("a verified account can save an option-specific reminder without changing its offer", async () => {
  expect(await setDeclinedOfferEmailReminder(optionId, true)).toMatchObject({ status: "pending" });
  expect(mocks.rpc).toHaveBeenCalledWith("set_declined_offer_email_reminder", {
    p_completion_option_id: optionId, p_enabled: true,
  });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/declined-offers");
});

test("invalid, signed-out, or unverified requests do not save an opt-in", async () => {
  expect((await setDeclinedOfferEmailReminder("invalid", true)).status).toBe("error");
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await setDeclinedOfferEmailReminder(optionId, true)).status).toBe("error");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner", email_confirmed_at: null } } });
  expect((await setDeclinedOfferEmailReminder(optionId, true)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
