import { afterEach, beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { saveProfileDetails } from "./actions";

function profileForm() {
  const value = new FormData();
  for (const [name, field] of Object.entries({
    display_name: "Chris Prior", legal_first_name: "Chris", legal_last_name: "Prior", date_of_birth: "1990-01-01",
    phone_number: "(910) 555-0147", address_line_1: "125 Market Street",
    address_line_2: "Unit 4", city: "Wilmington", region: "NC", postal_code: "28401", country: "United States",
    preferred_locale: "en-US", timezone: "America/New_York",
  })) value.set(name, field);
  return value;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "own-account" } } });
  mocks.rpc.mockResolvedValue({ data: [{ display_name: "Chris Prior" }] });
});
afterEach(() => vi.restoreAllMocks());

test("saves only validated owner-managed profile fields and refreshes account views", async () => {
  expect(await saveProfileDetails({ status: "idle" }, profileForm())).toEqual({ status: "succeeded", message: "Your profile information has been updated." });
  expect(mocks.rpc).toHaveBeenCalledWith("update_customer_profile_preferences", { p_updates: {
    display_name: "Chris Prior", legal_first_name: "Chris", legal_last_name: "Prior", date_of_birth: "1990-01-01",
    phone_number: "(910) 555-0147", address_line_1: "125 Market Street",
    address_line_2: "Unit 4", city: "Wilmington", region: "NC", postal_code: "28401", country: "United States",
    preferred_locale: "en-US", timezone: "America/New_York",
  } });
  expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  expect(mocks.revalidate).toHaveBeenCalledWith("/account/security");
});

test("partial mailing address is rejected before database access", async () => {
  const value = profileForm(); value.set("city", "");
  expect((await saveProfileDetails({ status: "idle" }, value)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test.each(["123", "call-me", "555-0123 ext secret"])("invalid phone %s is rejected before database access", async phone => {
  const value = profileForm(); value.set("phone_number", phone);
  expect((await saveProfileDetails({ status: "idle" }, value)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test.each(["", "not-a-date", "2020-02-30", "2020-01-01"])("invalid or underage birth date %s is rejected before database access", async dateOfBirth => {
  const value = profileForm(); value.set("date_of_birth", dateOfBirth);
  expect((await saveProfileDetails({ status: "idle" }, value)).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});

test("expired session cannot update a profile", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
  expect((await saveProfileDetails({ status: "idle" }, profileForm())).status).toBe("error");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
