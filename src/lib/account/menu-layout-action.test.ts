import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveMenuLayout } from "./menu-layout-action";
import { menuLayouts } from "@/lib/navigation/menu-layout";
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } }); mocks.rpc.mockResolvedValue({ error: null }); });
test.each(menuLayouts)("saves $id without accepting a customer identifier", async ({ id }) => {
  expect(await saveMenuLayout(id)).toEqual({ ok: true });
  expect(mocks.rpc).toHaveBeenCalledWith("set_device_menu_layout", { p_layout: id, p_device: "mobile" });
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

test.each(["mobile", "tablet", "desktop"])("all six styles save only to %s", async device => {
  for (const { id } of menuLayouts) {
    expect(await saveMenuLayout(id, device)).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenLastCalledWith("set_device_menu_layout", { p_layout: id, p_device: device });
  }
});

test.each(["all", "owner-id", null, 1])("rejects invalid device %s before writing", async device => {
  expect((await saveMenuLayout("classic", device)).ok).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
