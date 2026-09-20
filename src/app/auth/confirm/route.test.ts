import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const authMocks = vi.hoisted(() => ({
  exchange: vi.fn(),
  verify: vi.fn(),
  signOut: vi.fn(),
  setAll: null as null | ((cookies: Array<{ name: string; value: string; options: { path: string } }>) => void),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: typeof authMocks.setAll } }) => {
    authMocks.setAll = options.cookies.setAll;
    return { auth: { exchangeCodeForSession: authMocks.exchange, verifyOtp: authMocks.verify, signOut: authMocks.signOut } };
  },
}));

import { GET } from "./route";

afterEach(() => vi.clearAllMocks());

test("recovery code keeps its session and opens the new-password form", async () => {
  authMocks.exchange.mockImplementation(async () => {
    authMocks.setAll?.([{ name: "sb-session", value: "recovery", options: { path: "/" } }]);
    return { data: { redirectType: "recovery" }, error: null };
  });
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?code=valid"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  expect(response.cookies.get("sb-session")?.value).toBe("recovery");
  expect(authMocks.signOut).not.toHaveBeenCalled();
});

test("token-hash recovery also opens the new-password form", async () => {
  authMocks.verify.mockResolvedValue({ error: null });
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?token_hash=valid&type=recovery"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  expect(authMocks.verify).toHaveBeenCalledWith({ type: "recovery", token_hash: "valid" });
  expect(authMocks.signOut).not.toHaveBeenCalled();
});

test("signup confirmation still signs out before sending the person to login", async () => {
  authMocks.exchange.mockResolvedValue({ data: { redirectType: null }, error: null });
  authMocks.signOut.mockResolvedValue({ error: null });
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?code=valid"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/login?verified=1");
  expect(authMocks.signOut).toHaveBeenCalledOnce();
});

test("an expired recovery code leads back to a fresh reset request", async () => {
  authMocks.exchange.mockResolvedValue({ data: null, error: new Error("expired") });
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?flow=recovery&code=expired"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?error=expired");
  expect(authMocks.signOut).not.toHaveBeenCalled();
});
