import { beforeEach, expect, test, vi } from "vitest";
const m = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), publicUrl: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: m.getUser }, rpc: m.rpc, storage: { from: () => ({ upload: m.upload, remove: m.remove, getPublicUrl: m.publicUrl }) } }) }));
import { saveProfilePhoto } from "./actions";
function photo() { const data = new FormData(); data.set("photo", new File(["mock photo"], "avatar.webp", { type: "image/webp" })); return data; }
beforeEach(() => {
  vi.resetAllMocks();
  m.getUser.mockResolvedValue({ data: { user: { id: "photo-owner" } } });
  m.upload.mockResolvedValue({ error: null }); m.remove.mockResolvedValue({ error: null });
  m.publicUrl.mockImplementation(path => ({ data: { publicUrl: `https://photos.example/${path}` } }));
});
test("a rejected update removes only its unique upload and never the current avatar", async () => {
  m.rpc.mockResolvedValue({ error: { code: "42501", message: "Rejected" } });
  expect((await saveProfilePhoto(photo())).ok).toBe(false);
  const reference = m.upload.mock.calls[0][0];
  expect(reference).toMatch(/^photo-owner\/avatar-[0-9a-f-]+\.webp$/);
  expect(m.upload.mock.calls[0][2].upsert).toBe(false);
  expect(m.remove).toHaveBeenCalledWith([reference]);
  expect(m.remove).not.toHaveBeenCalledWith(["photo-owner/avatar.webp"]);
});
test.each(["throw", "response"])("an uncertain %s leaves the upload intact in case its profile update committed", async kind => {
  if (kind === "throw") m.rpc.mockRejectedValue(new Error("connection lost"));
  else m.rpc.mockResolvedValue({ error: { code: "", message: "Failed to fetch" } });
  expect((await saveProfilePhoto(photo())).ok).toBe(false);
  expect(m.remove).not.toHaveBeenCalled();
});
test("successful uploads get distinct references and switch the profile only after upload", async () => {
  m.rpc.mockResolvedValue({ error: null });
  expect((await saveProfilePhoto(photo())).ok).toBe(true);
  expect((await saveProfilePhoto(photo())).ok).toBe(true);
  const references = m.upload.mock.calls.map(call => call[0]);
  expect(new Set(references).size).toBe(2);
  expect(m.rpc).toHaveBeenCalledWith("update_customer_profile_preferences", { p_updates: { avatar_reference: references[0] } });
  expect(m.remove).not.toHaveBeenCalled();
});
test("upload failure does not change the profile", async () => {
  m.upload.mockResolvedValue({ error: { message: "Storage unavailable" } });
  expect((await saveProfilePhoto(photo())).ok).toBe(false);
  expect(m.rpc).not.toHaveBeenCalled();
});
