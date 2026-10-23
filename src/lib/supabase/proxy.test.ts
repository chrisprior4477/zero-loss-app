// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import type { SetAllCookies } from "@supabase/ssr";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  setAll: undefined as SetAllCookies | undefined,
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: SetAllCookies } }) => {
    mocks.setAll = options.cookies.setAll;
    return { auth: { getUser: mocks.getUser } };
  },
}));
import { updateSession } from "./proxy";

beforeEach(() => vi.resetAllMocks());

test("refresh forwards new cookies to server rendering and browser with no-cache headers", async () => {
  mocks.getUser.mockImplementation(async () => {
    await mocks.setAll?.([
      { name: "sb-session.0", value: "refreshed", options: { path: "/", httpOnly: true, secure: true, sameSite: "lax" } },
      { name: "sb-session.1", value: "", options: { path: "/", maxAge: 0 } },
    ], { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Expires: "0", Pragma: "no-cache" });
    return { data: { user: { id: "verified-user" } }, error: null };
  });
  const request = new NextRequest("https://example.test/account/entries", { headers: { cookie: "sb-session.0=expired; sb-session.1=old-chunk" } });
  const response = await updateSession(request);
  expect(mocks.getUser).toHaveBeenCalledOnce();
  expect(request.cookies.get("sb-session.0")?.value).toBe("refreshed");
  expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-session.0=refreshed");
  expect(response.cookies.get("sb-session.0")).toMatchObject({ value: "refreshed", httpOnly: true, secure: true, sameSite: "lax" });
  expect(response.cookies.get("sb-session.1")?.maxAge).toBe(0);
  expect(response.headers.get("cache-control")).toContain("private");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("expires")).toBe("0");
  expect(response.headers.get("pragma")).toBe("no-cache");
});

test("signed-out visitors reach public pages and the page-level authorization checks", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await updateSession(new NextRequest("https://example.test/login"));
  expect(response.headers.get("x-middleware-next")).toBe("1");
  expect(response.cookies.getAll()).toEqual([]);
});
