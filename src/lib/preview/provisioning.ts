import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isPreviewDataEnvironment } from "./environment";

export class PreviewProvisioningError extends Error {
  constructor(message: string, public readonly causeCode?: string) {
    super(message);
  }
}

export type PreviewProvisioningResult =
  | { required: false; succeeded: true }
  | { required: true; succeeded: true; walletAccountId: string };

/**
 * Authenticated first-session bootstrap. PostgreSQL derives the customer from
 * auth.uid(); this wrapper deliberately sends no user id, email, scope or
 * preview flag.
 */
export async function ensurePreviewCustomer(
  db: SupabaseClient,
  user: User,
): Promise<PreviewProvisioningResult> {
  if (!isPreviewDataEnvironment()) return { required: false, succeeded: true };
  if (!user.email_confirmed_at) {
    throw new PreviewProvisioningError("A confirmed account is required", "42501");
  }

  const { data, error } = await db.rpc("ensure_preview_customer");
  if (error) {
    throw new PreviewProvisioningError(
      "Customer wallet setup is temporarily unavailable",
      error.code,
    );
  }

  const walletAccountId = data?.walletAccountId;
  if (typeof walletAccountId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletAccountId)
    || data?.scope !== "demo") {
    throw new PreviewProvisioningError("Customer wallet setup returned an invalid response");
  }

  return { required: true, succeeded: true, walletAccountId };
}
