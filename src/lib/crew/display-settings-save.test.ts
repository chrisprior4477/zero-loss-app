import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: m.user }, rpc: m.rpc }) }));
import { saveCrewDisplaySettings, saveCrewGroup } from "./actions";
const baseline = { discoverable: false, discovery: { real: true, email: true, phone: true }, defaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] }, groups: [], entryRules: {} };
beforeEach(() => { vi.resetAllMocks(); m.user.mockResolvedValue({ data: { user: { id: "owner" } } }); });
test("sends the draft baseline and returns the authoritative merged settings", async () => {
  const settings = { ...baseline, discoverable: true };
  m.rpc.mockResolvedValue({ data: settings, error: null });
  const result = await saveCrewDisplaySettings({ ...settings, expected: baseline });
  expect(result).toMatchObject({ ok: true, settings });
  expect(m.rpc).toHaveBeenCalledWith("patch_crew_display_preferences", { p_expected: baseline, p_desired: settings });
});
test("stale-edit conflicts explain the refresh and do not fall back to replacing the snapshot", async () => {
  m.rpc.mockResolvedValue({ error: { code: "40001" } });
  expect(await saveCrewDisplaySettings({ ...baseline, expected: baseline })).toMatchObject({ ok: false, message: expect.stringContaining("another tab") });
  expect(m.rpc).toHaveBeenCalledTimes(1);
});
test("signed-out saves never reach the write", async () => {
  m.user.mockResolvedValue({ data: { user: null } });
  expect((await saveCrewDisplaySettings({ ...baseline, expected: baseline })).ok).toBe(false);
  expect(m.rpc).not.toHaveBeenCalled();
});

test("a group editor save uses the checked patch and rejects a competing change", async () => {
  const family = { id: "11111111-1111-4111-8111-111111111111", name: "Family", memberIds: [] };
  const expected = { ...baseline, groups: [family] };
  const group = { ...family, name: "Family weekend" };
  m.rpc.mockResolvedValue({ error: { code: "40001" } });
  expect(await saveCrewGroup({ group, remove: false, expected })).toMatchObject({ ok: false, conflict: true });
  expect(m.rpc).toHaveBeenCalledExactlyOnceWith("patch_crew_display_preferences", {
    p_expected: expected,
    p_desired: { ...expected, groups: [{ ...group, contacts: [] }] },
  });
});
