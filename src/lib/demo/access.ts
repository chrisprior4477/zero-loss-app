import "server-only";

import { createClient } from "@/lib/supabase/server";

function investorPreviewAllowlist(): Set<string> {
  return new Set(
    (process.env.INVESTOR_PREVIEW_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * All environments, including localhost, require a verified session and a
 * confirmed email in the server-only allowlist. This grants visual previews,
 * never enrollment in demo funding or access to another customer's records.
 */
export async function canAccessInvestorPreview(): Promise<boolean> {
  // Fail closed outside the operator-confirmed test project. This permission
  // only selects visual examples; it never calls a wallet enrollment function.
  if (process.env.INVESTOR_PREVIEW_ENABLED !== "true" ||
      process.env.APP_DATA_ENVIRONMENT !== "development-test" ||
      process.env.VERCEL_ENV === "production") return false;
  const projectRef = process.env.INVESTOR_PREVIEW_PROJECT_REF;
  if (!projectRef || process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${projectRef}.supabase.co`) return false;
  const allowlist = investorPreviewAllowlist();
  if (allowlist.size === 0) return false;

  const supabase = await createClient();
  const {
    data: { user }, error,
  } = await supabase.auth.getUser();

  const email = user?.email?.trim().toLowerCase();
  return Boolean(!error && user?.email_confirmed_at && email && allowlist.has(email));
}
