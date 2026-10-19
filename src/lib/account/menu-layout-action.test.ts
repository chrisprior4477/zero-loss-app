import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveMenuLayout } from "./menu-layout-action";
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } }); mocks.rpc.mockResolvedValue({ error: null }); });
test("saves a validated choice without accepting a customer identifier", async () => {
  expect(await saveMenuLayout("search-over")).toEqual({ ok: true });
  expect(mocks.rpc).toHaveBeenCalledWith("set_menu_layout", { p_layout: "search-over" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});
test("invalid choices and expired sessions never write", async () => {
  expect((await saveMenuLayout("unknown")).ok).toBe(false);
  expect(mocks.getUser).not.toHaveBeenCalled();
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await saveMenuLayout("classic")).ok).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
test("a rejected database write is not reported as saved", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "unavailable" } });
  expect((await saveMenuLayout("classic")).ok).toBe(false);
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
