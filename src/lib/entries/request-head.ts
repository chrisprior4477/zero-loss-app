import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type EntryRequestHead = { ready: true; requestId: string | null } | { ready: false; requestId: null };

const requestIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** Read only this authenticated customer's most recent request for the prize.
 * The owner-only entry_requests SELECT policy supplies the customer filter.
 * Its ID is the database's compare-and-submit token for an additional entry. */
export async function getEntryRequestHead(db: SupabaseClient, slug: string): Promise<EntryRequestHead> {
  try {
    const { data, error } = await db.from("entry_requests")
      .select("id")
      .eq("offering_slug", slug)
      .order("requested_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || (data && (typeof data.id !== "string" || !requestIdPattern.test(data.id)))) {
      return { ready: false, requestId: null };
    }
    return { ready: true, requestId: data?.id ?? null };
  } catch {
    return { ready: false, requestId: null };
  }
}
