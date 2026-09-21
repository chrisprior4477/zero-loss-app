import { beforeEach, expect, test, vi } from "vitest";
const mocks = vi.hoisted(() => ({ account: vi.fn(), redirect: vi.fn(), db: vi.fn() }));
vi.mock("@/lib/account/context", () => ({ getAccountContext: mocks.account }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.db }));
import CrewPage from "./crew/page";
import ProfilePage from "./profile/page";
import SectionPage from "./[section]/page";
beforeEach(() => { vi.resetAllMocks(); mocks.account.mockResolvedValue(null); mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); }); });
test.each(["orders", "security", "results"])("%s returns to itself after authentication", async section => {
  await expect(SectionPage({ params: Promise.resolve({ section }) })).rejects.toThrow("NEXT_REDIRECT");
  expect(new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")).toBe(`/account/${section}`);
});
test("profile returns to its editor", async () => {
  await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/login?next=%2Faccount%2Fprofile");
});
test("the exact Crew request is preserved without reading private data before login", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  await expect(CrewPage({ searchParams: Promise.resolve({ tab: "requests", request: id }) })).rejects.toThrow("NEXT_REDIRECT");
  expect(new URL(mocks.redirect.mock.calls[0][0], "https://example.test").searchParams.get("next")).toBe(`/account/crew?tab=requests&request=${id}#crew-request-${id}`);
  expect(mocks.db).not.toHaveBeenCalled();
});
