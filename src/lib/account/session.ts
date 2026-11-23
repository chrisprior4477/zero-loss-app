import "server-only";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const accountSession = cache(async () => {
  try {
    const db = await createClient();
    const { data, error } = await db.auth.getUser();
    if (isAuthRetryableFetchError(error) || (error?.status ?? 0) === 429 || (error?.status ?? 0) >= 500) {
      return { status: "unavailable" } as const;
    }
    return data.user && !error ? { status: "signed_in", db, user: data.user } as const : { status: "signed_out" } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
});
