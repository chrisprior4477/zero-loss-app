import "server-only";

export const PREVIEW_SUPABASE_PROJECT_REF = "ocgdfnvvjvutevgqzzgj";
export const PREVIEW_SUPABASE_URL = `https://${PREVIEW_SUPABASE_PROJECT_REF}.supabase.co`;

/**
 * This is a server-side deployment boundary, not customer authorization.
 * Ordinary confirmed customers share the same preview behavior; production
 * and any other Supabase project fail closed before a preview RPC is called.
 */
export function isPreviewDataEnvironment(): boolean {
  return process.env.APP_DATA_ENVIRONMENT === "development-test"
    && process.env.NEXT_PUBLIC_SUPABASE_URL === PREVIEW_SUPABASE_URL
    && process.env.VERCEL_ENV !== "production";
}
