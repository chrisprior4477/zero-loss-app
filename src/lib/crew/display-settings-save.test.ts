import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: m.user }, rpc: m.rpc }) }));
import { saveCrewDisplaySettings, saveCrewGroup } from "./actions";
const baseline = { discoverable: false, discovery: { real: true, email: true, phone: true }, defaultRule: { audience: "everyone" as const, memberIds: [], groupIds: [] }, groups: [], entryRules: {} };
const privacyBaseline = { discoverable: baseline.discoverable, discovery: baseline.discovery, defaultRule: baseline.defaultRule, entryRules: baseline.entryRules };
beforeEach(() => { vi.resetAllMocks(); m.user.mockResolvedValue({ data: { user: { id: "owner" } } }); });
test("sends the draft baseline and returns the authoritative merged settings", async () => {
  const settings = { ...baseline, discoverable: true };
  m.rpc.mockResolvedValue({ data: settings, error: null });
  const result = await saveCrewDisplaySettings({ ...settings, expected: baseline });
  expect(result).toMatchObject({ ok: true, settings });
  expect(m.rpc).toHaveBeenCalledWith("patch_crew_display_preferences", { p_expected: privacyBaseline, p_desired: { ...privacyBaseline, discoverable: true } });
});
test.each(["PT409", "40001"])("stale privacy conflict %s keeps the draft and does not replace the snapshot", async (code) => {
  m.rpc.mockResolvedValue({ error: { code } });
  expect(await saveCrewDisplaySettings({ ...baseline, expected: baseline })).toMatchObject({ ok: false, message: expect.stringContaining("another tab") });
  expect(m.rpc).toHaveBeenCalledTimes(1);
});
test("signed-out saves never reach the write", async () => {
  m.user.mockResolvedValue({ data: { user: null } });
  expect((await saveCrewDisplaySettings({ ...baseline, expected: baseline })).ok).toBe(false);
  expect(m.rpc).not.toHaveBeenCalled();
});

test.each(["PT409", "40001"])("a group editor sends the saved group and reports conflict %s", async (code) => {
  const family = { id: "11111111-1111-4111-8111-111111111111", name: "Family", memberIds: [] };
  const group = { ...family, name: "Family weekend" };
  m.rpc.mockResolvedValue({ error: { code } });
  expect(await saveCrewGroup({ group, remove: false, expected: family })).toMatchObject({ ok: false, conflict: true });
  expect(m.rpc).toHaveBeenCalledExactlyOnceWith("save_crew_group_checked", {
    p_expected: { ...family, contacts: [] },
    p_group: { ...group, contacts: [] },
    p_remove: false,
  });
});

test("privacy ignores a groups payload from an already-open form", async () => {
  const family = { id: "11111111-1111-4111-8111-111111111111", name: "Family", memberIds: [] };
  const expected = { ...baseline, groups: [family] };
  const oldForm = { ...expected, discoverable: true, groups: [{ ...family, name: "Hidden draft" }], expected };
  m.rpc.mockResolvedValue({ data: { ...expected, discoverable: true }, error: null });
  expect((await saveCrewDisplaySettings(oldForm)).ok).toBe(true);
  expect(m.rpc).toHaveBeenCalledExactlyOnceWith("patch_crew_display_preferences", {
    p_expected: privacyBaseline,
    p_desired: { ...privacyBaseline, discoverable: true },
  });
});

test("large cleanup history is omitted while one pick removal and a discovery change are saved", async () => {
  const frozen = { groupIds: [], memberIds: [], audience: "groups" as const };
  const rules = Object.fromEntries(Array.from({ length: 501 }, (_, i) => [
    `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`, frozen,
  ]));
  const [removed, ...retained] = Object.entries(rules);
  const expected = { ...baseline, entryRules: rules };
  const settings = { ...baseline, discoverable: true, entryRules: Object.fromEntries(retained) };
  m.rpc.mockResolvedValue({ data: settings, error: null });
  expect(await saveCrewDisplaySettings({ ...settings, expected })).toMatchObject({ ok: true, settings });
  expect(m.rpc).toHaveBeenCalledExactlyOnceWith("patch_crew_display_preferences", {
    p_expected: { ...privacyBaseline, entryRules: Object.fromEntries([removed]) },
    p_desired: { ...privacyBaseline, discoverable: true },
  });
});
