import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const recoveryAttempt = searchParams.get("flow") === "recovery" || type === "recovery";

  const successUrl = `${origin}/login?verified=1`;
  const failureUrl = recoveryAttempt
    ? `${origin}/forgot-password?error=expired`
    : `${origin}/login?error=verification_failed`;
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
