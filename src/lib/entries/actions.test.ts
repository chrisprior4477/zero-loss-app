import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), revalidate: vi.fn(), provision: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("@/lib/preview/provisioning", () => ({ ensurePreviewCustomer: mocks.provision }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { acknowledgeExtraEntryExplainer, createPreviewEntry } from "./actions";

function entryForm(quantity = "3") {
  const value = new FormData();
  value.set("offeringSlug", "samsung-m70h-tv");
  value.set("idempotencyKey", "entry_quantity_request_001");
  value.set("quantity", quantity);
  return value;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_DATA_ENVIRONMENT", "development-test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://ocgdfnvvjvutevgqzzgj.supabase.co");
  vi.stubEnv("VERCEL_ENV", "preview");
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-user", email_confirmed_at: "2026-09-18" } } });
  mocks.provision.mockResolvedValue({ required: true, succeeded: true, walletAccountId: "99999999-9999-4999-8999-999999999999" });
  mocks.rpc.mockResolvedValue({ data: { status: "active", quantity: 3 } });
});
afterEach(() => vi.unstubAllEnvs());

test("sends the selected quantity to the atomic database batch function", async () => {
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toEqual({
    status: "succeeded",
    message: "3 entries confirmed. They are now in My Activity.",
    href: "/account/entries?item=samsung-m70h-tv",
    outcome: "active",
  });
  expect(mocks.rpc).toHaveBeenCalledWith("create_preview_entries_with_sharing", {
    p_offering_slug: "samsung-m70h-tv",
    p_quantity: 3,
    p_idempotency_key: "entry_quantity_request_001",
    p_share_with_crew: false,
  });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});

test.each(["0", "11", "2.5", "NaN", "Infinity"])('rejects unsafe quantity %s before database access', async quantity => {
  expect((await createPreviewEntry({ status: "idle" }, entryForm(quantity))).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("stores the extra-entry explainer acknowledgment on the authenticated profile", async () => {
  mocks.rpc.mockResolvedValue({ data: "2026-09-18T15:00:00Z" });
  expect(await acknowledgeExtraEntryExplainer()).toEqual({ status: "succeeded" });
  expect(mocks.rpc).toHaveBeenCalledWith("acknowledge_extra_entry_explainer");
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
});

test("explicit Crew sharing uses the atomic entry-and-share function", async () => {
  const form = entryForm("1");
  form.set("shareWithCrew", "yes");
  await createPreviewEntry({ status: "idle" }, form);
  expect(mocks.rpc).toHaveBeenCalledWith("create_preview_entries_with_sharing", {
    p_offering_slug: "samsung-m70h-tv",
    p_quantity: 1,
    p_idempotency_key: "entry_quantity_request_001",
    p_share_with_crew: true,
  });
});

test("insufficient balance has an explicit UI code and never reports success", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001", message: "Add demo funds before entering this quantity." } });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toEqual({ status: "error", code: "insufficient_balance", message: "Add funds to cover these entries, then return to this prize." });
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

test("a sold-out quantity error is not misidentified as a funding error", async () => {
  mocks.rpc.mockResolvedValue({ error: { code: "P0001", message: "There are not enough entries remaining for that quantity." } });
  expect(await createPreviewEntry({ status: "idle" }, entryForm())).toEqual({ status: "error", message: "There are not enough entries remaining for that quantity." });
});
