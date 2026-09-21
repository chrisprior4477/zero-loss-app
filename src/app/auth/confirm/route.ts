import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { signInReturnPath } from "@/lib/auth/entry-return";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const recoveryAttempt = searchParams.get("flow") === "recovery" || type === "recovery";

  // Email providers may prefetch links. A GET must never consume a one-time
  // recovery token; the visitor explicitly continues from this landing page.
  if (recoveryAttempt && (tokenHash || code)) {
    const landingUrl = new URL("/auth/recovery", origin);
    if (tokenHash) landingUrl.searchParams.set("token_hash", tokenHash);
    else if (code) landingUrl.searchParams.set("code", code);
    const landingResponse = NextResponse.redirect(landingUrl);
    landingResponse.headers.set("Cache-Control", "no-store");
    landingResponse.headers.set("Referrer-Policy", "no-referrer");
    return landingResponse;
  }

  const returnTo = signInReturnPath(searchParams.get("next"));
  const returnQuery = returnTo ? `&next=${encodeURIComponent(returnTo)}` : "";
  const successUrl = `${origin}/login?verified=1${returnQuery}`;
  const failureUrl = recoveryAttempt
    ? `${origin}/forgot-password?error=expired`
    : `${origin}/login?error=verification_failed${returnQuery}`;
  const response = NextResponse.redirect(failureUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let verified = false;
  let isRecovery = false;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
    // Supabase includes redirectType at runtime for PKCE recovery, although
    // AuthTokenResponse's public type does not currently declare it.
    isRecovery = (data as (typeof data & { redirectType?: string | null }) | null)?.redirectType === "recovery";
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    verified = !error;
    isRecovery = type === "recovery";
  }

  if (!verified) {
    return response;
  }

  if (isRecovery) {
    // Preserve the recovery session cookies set during verification so the
    // password form can securely update this account's password.
    response.headers.set("Location", `${origin}/reset-password`);
    return response;
  }

  // Confirming the address must not leave a session. Require a fresh login.
  await supabase.auth.signOut();
  response.headers.set("Location", successUrl);
  return response;
}

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const failureUrl = `${origin}/forgot-password?error=expired`;
  const response = NextResponse.redirect(failureUrl, { status: 303 });
  response.headers.set("Cache-Control", "no-store");

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) return response;

  const formData = await request.formData();
  const tokenHash = formData.get("token_hash");
  const code = formData.get("code");
  if (formData.get("flow") !== "recovery" ||
    (typeof tokenHash !== "string" || !tokenHash) && (typeof code !== "string" || !code)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  if (typeof tokenHash === "string" && tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (error || !data.session?.access_token) return response;
  } else if (typeof code === "string" && code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const redirectType = (data as (typeof data & { redirectType?: string | null }) | null)?.redirectType;
    if (error || redirectType !== "recovery" || !data.session?.access_token) return response;
  }

  response.headers.set("Location", `${origin}/reset-password`);
  return response;
}
