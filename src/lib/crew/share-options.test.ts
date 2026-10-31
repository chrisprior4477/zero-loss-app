import { beforeEach, expect, test, vi } from "vitest";
import { getCrewShareOptions, saveCrewMemberContact } from "./actions";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), settings: vi.fn(), eq: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc, from: () => ({ select: () => ({ eq: mocks.eq }) }) }) }));
const owner = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ data: { user: { id: owner } } }); mocks.eq.mockReturnValue({ maybeSingle: mocks.settings }); });
test("only current approved connections are included in saved group audiences", async () => {
  mocks.rpc.mockResolvedValue({ data: [{ member_id: member, name: "Member" }], error: null });
  mocks.settings.mockResolvedValue({ data: { groups: [{ id: owner, name: "Family", memberIds: [member, outsider], contacts: [] }] }, error: null });
  expect(await getCrewShareOptions()).toEqual({ ok: true, message: "", memberCount: 1, members: [{ id: member, name: "Member" }], groups: [{ id: owner, name: "Family", memberCount: 1, memberIds: [member], contacts: [] }] });
  expect(mocks.eq).toHaveBeenCalledWith("owner_id", owner);
});
test("signed-out access and failed reads cannot turn into a fake empty successful audience", async () => {
  mocks.auth.mockResolvedValue({ data: { user: null } }); expect((await getCrewShareOptions()).ok).toBe(false); expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ data: { user: { id: owner } } }); mocks.rpc.mockResolvedValue({ error: new Error("offline") }); mocks.settings.mockResolvedValue({ data: null });
  expect((await getCrewShareOptions()).ok).toBe(false);
});

test("only this owner's saved contact details decorate connected members", async () => {
  mocks.rpc.mockResolvedValue({ data: [{ member_id: member, name: "Public name" }], error: null });
  mocks.settings.mockResolvedValue({ data: { groups: [], member_contacts: { [member]: { name: "Mom", phone: "1111111111", email: "mom@example.test" }, [outsider]: { name: "Hidden", phone: "", email: "" } } }, error: null });
  expect((await getCrewShareOptions()).members).toEqual([{ id: member, name: "Mom", phone: "1111111111", email: "mom@example.test" }]);
});

test("contact saves reject invalid input and require a session, then use the owner-scoped RPC", async () => {
  expect((await saveCrewMemberContact(member, { name: "", phone: "", email: "" })).ok).toBe(false);
  expect((await saveCrewMemberContact(member, { name: "Name", phone: "123", email: "" })).ok).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValueOnce({ data: { user: null } });
  expect((await saveCrewMemberContact(member, { name: "Mom", phone: "", email: "" })).ok).toBe(false);
  mocks.rpc.mockResolvedValue({ error: null });
  expect((await saveCrewMemberContact(member, { name: " Mom ", phone: "1111111111", email: "mom@example.test" })).ok).toBe(true);
  expect(mocks.rpc).toHaveBeenCalledWith("save_crew_member_contact", { p_member_id: member, p_contact: { name: "Mom", phone: "1111111111", email: "mom@example.test" } });
});
