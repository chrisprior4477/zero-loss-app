import "server-only";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/personal-demo/shopper";
import { DemoFailure } from "@/lib/personal-demo/server";

export const accountSession = cache(async () => {
  // Let Next.js handle request-bound cookies before catching authentication failures.
  const db = await createClient().catch(error => {
    if (error instanceof DemoFailure) return null;
    throw error;
  });
  if (!db) return { status: "unavailable" } as const;
  try {
    const { data, error } = await db.auth.getUser();
    if (isAuthRetryableFetchError(error) || (error?.status ?? 0) === 429 || (error?.status ?? 0) >= 500) {
      return { status: "unavailable" } as const;
    }
    return data.user && !error ? { status: "signed_in", db, user: data.user } as const : { status: "signed_out" } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
});
