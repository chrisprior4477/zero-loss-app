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

import { GET, POST } from "./route";

afterEach(() => vi.clearAllMocks());

test("opening a recovery email does not consume its one-time code", async () => {
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?flow=recovery&code=valid"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/auth/recovery?code=valid");
  expect(authMocks.exchange).not.toHaveBeenCalled();
});

test("opening a token-hash recovery email does not verify it on GET", async () => {
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?token_hash=valid&type=recovery"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/auth/recovery?token_hash=valid");
  expect(authMocks.verify).not.toHaveBeenCalled();
});

test("explicit confirmation verifies the token and carries its session to the password form", async () => {
  authMocks.verify.mockImplementation(async () => {
    authMocks.setAll?.([{ name: "sb-session", value: "recovery", options: { path: "/" } }]);
    return { data: { session: { access_token: "verified" } }, error: null };
  });
  const response = await POST(new NextRequest("http://localhost:3000/auth/confirm", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost:3000" },
    body: new URLSearchParams({ flow: "recovery", token_hash: "valid" }),
  }));
  expect(authMocks.verify).toHaveBeenCalledWith({ type: "recovery", token_hash: "valid" });
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
  expect(response.cookies.get("sb-session")?.value).toBe("recovery");
  expect(authMocks.signOut).not.toHaveBeenCalled();
});

test("a failed recovery confirmation cannot open the password form", async () => {
  authMocks.verify.mockResolvedValue({ data: { session: null }, error: new Error("expired") });
  const response = await POST(new NextRequest("http://localhost:3000/auth/confirm", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost:3000" },
    body: new URLSearchParams({ flow: "recovery", token_hash: "expired" }),
  }));
  expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?error=expired");
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
  const response = await POST(new NextRequest("http://localhost:3000/auth/confirm", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin: "http://localhost:3000" },
    body: new URLSearchParams({ flow: "recovery", code: "expired" }),
  }));
  expect(response.headers.get("location")).toBe("http://localhost:3000/forgot-password?error=expired");
  expect(authMocks.signOut).not.toHaveBeenCalled();
});

test.each(["/items/playstation-5-slim#enter-entry", "/account/wallet?view=history&from=samsung-m70h-tv#add-funds"])("signup confirmation keeps the approved return destination %s", async destination => {
  authMocks.exchange.mockResolvedValue({ data: { redirectType: null }, error: null });
  const response = await GET(new NextRequest(`http://localhost:3000/auth/confirm?code=valid&next=${encodeURIComponent(destination)}`));
  const location = new URL(response.headers.get("location")!);
  expect(location.pathname).toBe("/login");
  expect(location.searchParams.get("verified")).toBe("1");
  expect(location.searchParams.get("next")).toBe(destination);
  expect(authMocks.signOut).toHaveBeenCalledOnce();
});

test("verification never carries an external return URL into login", async () => {
  authMocks.verify.mockResolvedValue({ error: null });
  const response = await GET(new NextRequest("http://localhost:3000/auth/confirm?token_hash=valid&type=signup&next=https%3A%2F%2Fevil.test"));
  expect(response.headers.get("location")).toBe("http://localhost:3000/login?verified=1");
});
