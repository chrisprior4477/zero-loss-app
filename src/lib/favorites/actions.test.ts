import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), snapshot: vi.fn(), from: vi.fn(), insert: vi.fn(), delete: vi.fn(), customerEq: vi.fn(), slugEq: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
vi.mock("@/lib/preview/environment", () => ({ isPreviewDataEnvironment: () => false }));
vi.mock("@/lib/preview/provisioning", () => ({ ensurePreviewCustomer: vi.fn() }));

vi.mock("./reader", () => ({ getFavoriteSnapshot: mocks.snapshot }));
import { getCurrentFavorites, setFavorite } from "./actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "signed-in-customer" } }, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.slugEq.mockResolvedValue({ error: null });
  mocks.customerEq.mockReturnValue({ eq: mocks.slugEq });
  mocks.delete.mockReturnValue({ eq: mocks.customerEq });
  mocks.from.mockReturnValue({ insert: mocks.insert, delete: mocks.delete });
});

test("saves a catalog item for the authenticated customer", async () => {
  expect(await setFavorite("dyson-v8-cordless-vacuum", true)).toEqual({ status: "saved" });
  expect(mocks.from).toHaveBeenCalledWith("customer_favorites");
  expect(mocks.insert).toHaveBeenCalledWith({ customer_id: "signed-in-customer", product_slug: "dyson-v8-cordless-vacuum" });
});

test("removes only the authenticated customer's matching favorite", async () => {
  expect(await setFavorite("dyson-v8-cordless-vacuum", false)).toEqual({ status: "removed" });
  expect(mocks.customerEq).toHaveBeenCalledWith("customer_id", "signed-in-customer");
  expect(mocks.slugEq).toHaveBeenCalledWith("product_slug", "dyson-v8-cordless-vacuum");
});

test("requires a current account and rejects unknown products before writing", async () => {
  expect((await setFavorite("not-in-the-catalog", true)).status).toBe("error");
  expect(mocks.from).not.toHaveBeenCalled();
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await setFavorite("dyson-v8-cordless-vacuum", true)).status).toBe("sign-in");
  expect(mocks.from).not.toHaveBeenCalled();
});

test("duplicate saves are safe but other database errors are reported", async () => {
  mocks.insert.mockResolvedValueOnce({ error: { code: "23505" } }).mockResolvedValueOnce({ error: { code: "42501" } });
  expect((await setFavorite("dyson-v8-cordless-vacuum", true)).status).toBe("saved");
  expect((await setFavorite("dyson-v8-cordless-vacuum", true)).status).toBe("error");
});

test("a favorites recheck only reads the verified account and reports failed reads", async () => {
  mocks.snapshot.mockResolvedValue({ slugs: ["dyson-v8-cordless-vacuum"], available: true });
  expect(await getCurrentFavorites()).toEqual({ slugs: ["dyson-v8-cordless-vacuum"], available: true, accountId: "signed-in-customer" });
  expect(mocks.snapshot).toHaveBeenCalledExactlyOnceWith("signed-in-customer");
  mocks.snapshot.mockRejectedValueOnce(new Error("offline"));
  expect((await getCurrentFavorites()).available).toBe(false);
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect(await getCurrentFavorites()).toEqual({ slugs: [], available: false, accountId: null });
  expect(mocks.snapshot).toHaveBeenCalledTimes(2);
});
