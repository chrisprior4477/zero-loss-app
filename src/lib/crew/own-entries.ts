import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;
type EntryRow = { id: string; offering_slug: string; created_at: string };
type ShareRow = { entry_id: string; created_at: string; audience_shared_at?: Record<string, string> };

/** Keyset batches avoid both the old 40-entry cut-off and the API row ceiling. */
export async function readOwnCrewEntries(db: Client, owner: string) {
  const rows: EntryRow[] = [];
  let after: string | null = null;
  for (;;) {
    let query = db.from("customer_entries").select("id,offering_slug,created_at").eq("customer_id", owner).order("id").limit(500);
    if (after) query = query.gt("id", after);
    const { data, error } = await query;
    if (error) return { data: [] as EntryRow[], error };
    const batch = (data ?? []) as EntryRow[];
    rows.push(...batch);
    if (batch.length < 500) break;
    after = batch.at(-1)!.id;
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return { data: rows, error: null };
}

export async function readOwnCrewShares(db: Client) {
  const rows: ShareRow[] = [];
  let after: string | null = null;
  for (;;) {
    // The RPC binds the owner to auth.uid(); private audience dates are not
    // readable through the table's accepted-Crew share-flag permissions.
    const { data, error } = await db.rpc("get_own_crew_shares", { p_after: after });
    if (error) return { data: [] as ShareRow[], error };
    const batch = (data ?? []) as ShareRow[];
    rows.push(...batch);
    if (batch.length < 500) break;
    after = batch.at(-1)!.entry_id;
  }
  return { data: rows, error: null };
}
