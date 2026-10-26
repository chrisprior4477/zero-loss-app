import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), redirect: vi.fn(), preview: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: mocks.preview }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, RedirectType: { replace: "replace" } }));
import { revivePurchaseOption } from "./lifecycle-actions";

const optionId = "11111111-1111-4111-8111-111111111111";
const entryId = `ent_${"2".repeat(32)}`;
const slug = "directory-build-a-bear-workshop-100-gift-card";
const saved = { completion_option_id: optionId, entry_id: entryId, slug };
function form() { const data = new FormData(); data.set("completionOptionId", optionId); return data; }

beforeEach(() => {
  vi.resetAllMocks();
  mocks.preview.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
  mocks.redirect.mockImplementation((href: string) => { throw new Error(`redirect:${href}`); });
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "get_account_activity" ? [
    { ...saved, completion_option_id: "other", entry_id: `ent_${"1".repeat(32)}` }, saved,
  ] : { status: "available" }, error: null }));
});

test("revival redirects from the server to the exact owned option after revalidation", async () => {
  const data = form(); data.set("slug", "unrelated"); data.set("entryId", "unrelated"); data.set("href", "https://example.test");
  await expect(revivePurchaseOption({ status: "idle" }, data)).rejects.toThrow(`redirect:/account/purchase-options/${slug}?option=${entryId}`);
  expect(mocks.redirect).toHaveBeenCalledWith(`/account/purchase-options/${slug}?option=${entryId}`, "replace");
  expect(mocks.rpc).toHaveBeenCalledWith("revive_preview_purchase_option", { p_completion_option_id: optionId, p_idempotency_key: `revive_${optionId.replaceAll("-", "")}` });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/declined-offers");
  expect(mocks.revalidate).toHaveBeenCalledWith(`/account/purchase-options/${slug}`);
  expect(mocks.redirect.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.revalidate.mock.invocationCallOrder.at(-1)!);
});

test.each([
  { data: [] }, { error: { code: "504" } },
  { data: [{ ...saved, slug: "https://example.test" }] },
  { data: [{ ...saved, entry_id: null }] },
])("an unavailable or invalid owned destination does not revive or redirect: %j", async result => {
  mocks.rpc.mockResolvedValueOnce(result);
  expect((await revivePurchaseOption({ status: "idle" }, form())).status).toBe("error");
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_account_activity");
  expect(mocks.redirect).not.toHaveBeenCalled();
});

test("expired or failed revival stays on the page with an error", async () => {
  mocks.rpc.mockImplementation(async (name: string) => name === "get_account_activity"
    ? { data: [saved] } : { error: { code: "P0001", message: "The original 30-day option has expired" } });
  expect(await revivePurchaseOption({ status: "idle" }, form())).toMatchObject({ status: "error", message: expect.stringContaining("expired") });
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

test("signed-out, invalid and non-preview requests do not read or change options", async () => {
  mocks.preview.mockReturnValue(false);
  expect((await revivePurchaseOption({ status: "idle" }, form())).status).toBe("error");
  mocks.preview.mockReturnValue(true);
  const invalid = form(); invalid.set("completionOptionId", "invalid");
  expect((await revivePurchaseOption({ status: "idle" }, invalid)).status).toBe("error");
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await revivePurchaseOption({ status: "idle" }, form())).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
