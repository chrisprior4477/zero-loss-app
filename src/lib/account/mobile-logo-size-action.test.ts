import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveMobileLogoSize } from "./mobile-logo-size-action";
import { mobileLogoSizes, mobileLogoSizeOrOriginal } from "@/lib/navigation/mobile-logo-size";
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } }); mocks.rpc.mockResolvedValue({ error: null }); });
test.each(mobileLogoSizes)("saves size %s for the authenticated account", async size => {
  expect(await saveMobileLogoSize(size)).toEqual({ ok: true });
  expect(mocks.rpc).toHaveBeenCalledWith("set_mobile_logo_size", { p_size: size });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
test.each([40, -5, 12, "35", null, undefined, {}, NaN])("rejects invalid size %s before authentication or writes", async size => {
  expect((await saveMobileLogoSize(size)).ok).toBe(false);
  expect(mocks.getUser).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mobileLogoSizeOrOriginal(size)).toBe(0);
});
test("requires a current session", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await saveMobileLogoSize(5)).ok).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("does not report rejected writes as saved", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "unavailable" } });
  expect((await saveMobileLogoSize(5)).ok).toBe(false);
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
