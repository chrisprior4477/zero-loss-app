import "server-only";
import { createClient as createIsolatedClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FundingFailure } from "./demo-provider";

export const FUNDING_POLICY_VERSION = "funding-confirmation-v1";

/** Auth owns credentials; the database stores only transaction-bound evidence.
 * The temporary password session never replaces the customer's browser session.
 */
export async function authorizeFunding(db: SupabaseClient, form: FormData, amount: number, key: string) {
  const password = form.get("password");
  if (typeof password !== "string" || !password || password.length > 1024
    || form.get("fundingPolicy") !== FUNDING_POLICY_VERSION) {
    throw new FundingFailure("P0001", "Confirm the deposit amount and enter your account password.");
  }
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user?.email || !user.email_confirmed_at) throw new FundingFailure("42501", "Sign in again to confirm this deposit.");
  const { error: attemptError } = await db.rpc("begin_demo_funding_authentication", { p_amount: amount, p_request_key: key });
  if (attemptError) throw new FundingFailure("P0001", attemptError.code === "P0001"
    ? "Too many deposit confirmation attempts. Wait 15 minutes before trying again."
    : "We couldn’t start the deposit confirmation. Please try again shortly.");
  const verifier = createIsolatedClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data, error: authError } = await verifier.auth.signInWithPassword({ email: user.email, password });
    if (authError || data.user?.id !== user.id) {
      throw new FundingFailure("P0001", "We couldn’t verify your password. Try again, or reset it before adding funds.");
    }
    const { error: confirmationError } = await verifier.rpc("authorize_demo_funding", {
      p_amount: amount, p_request_key: key, p_make_default: form.get("makeDefault") === "true", p_policy_version: FUNDING_POLICY_VERSION,
    });
    if (confirmationError) throw new FundingFailure("P0001", "We couldn’t authorize this deposit. Check your password and try again shortly.");
  } finally {
    // Revoke only this isolated session. Never log tokens or password input.
    await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}
