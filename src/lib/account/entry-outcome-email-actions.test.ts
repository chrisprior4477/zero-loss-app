import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { saveEntryOutcomeEmailPreference } from "./entry-outcome-email-actions";
import { readSavedEmailPreference } from "./read-saved-email-preference";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "signed-in-owner" } }, error: null });
  mocks.rpc.mockResolvedValue({ error: null });
});

test.each([[true, "true"], [false, null]])("saves the account-wide email preference %s", async (enabled, value) => {
  const form = new FormData();
  if (value) form.set("enabled", value);
  const result = await saveEntryOutcomeEmailPreference({ status: "idle", message: "" }, form);
  expect(result.status).toBe("succeeded");
  expect(mocks.rpc).toHaveBeenCalledWith("set_entry_outcome_email_enabled", { p_enabled: enabled });
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/entries");
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/notifications");
});

test("does not write if the session expired", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const result = await saveEntryOutcomeEmailPreference({ status: "idle", message: "" }, new FormData());
  expect(result.status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("does not claim to save if storage fails", async () => {
  mocks.rpc.mockResolvedValue({ error: { message: "offline" } });
  const result = await saveEntryOutcomeEmailPreference({ status: "idle", message: "" }, new FormData());
  expect(result.status).toBe("error");
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

test.each([
  ["outcome", "get_entry_outcome_email_enabled", false],
  ["purchase", "get_purchase_option_email_enabled", true],
] as const)("verifies the current %s choice through its existing account reader", async (kind, getter, enabled) => {
  mocks.rpc.mockResolvedValueOnce({ data: enabled, error: null });
  expect(await readSavedEmailPreference(kind)).toBe(enabled);
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(getter);
  expect(mocks.revalidate).not.toHaveBeenCalled();
});

test("a failed preference read never supplies a guessed value", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "Authentication required" } });
  expect(await readSavedEmailPreference("outcome")).toBeNull();
});
