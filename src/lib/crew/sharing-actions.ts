"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crewUuid } from "./visibility";
import type { SharingSelection } from "./sharing-management";

export type SharingResult = { ok: boolean; message: string; count?: number; undoId?: string };
const validScope = (scope: unknown) => typeof scope === "string" && (scope === "crew" || crewUuid.test(scope));
function refreshSharing() { revalidatePath("/account/crew"); revalidatePath("/account/crew/display"); }

export async function cleanupCrewShares(operationId: string, selection: SharingSelection): Promise<SharingResult> {
  if (!crewUuid.test(operationId) || !selection || !validScope(selection.scope)
    || selection.entryId !== undefined && !crewUuid.test(selection.entryId)
    || selection.offeringSlug !== undefined && !/^[a-z0-9-]{2,100}$/.test(selection.offeringSlug)
    || selection.before !== undefined && (!Number.isFinite(Date.parse(selection.before)) || Date.parse(selection.before) > Date.now()))
    return { ok: false, message: "Choose the sharing you want to clean up." };
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in to change sharing." };
  const { data, error } = await db.rpc("cleanup_crew_shares", { p_operation_id: operationId, p_scope: selection.scope,
    p_offering_slug: selection.offeringSlug ?? null, p_entry_id: selection.entryId ?? null, p_before: selection.before ?? null });
  if (error || !data || typeof data.count !== "number") return { ok: false, message: "We couldn’t confirm cleanup. Retry to check the same request safely." };
  refreshSharing();
  return { ok: true, count: data.count, undoId: data.undone || !data.count ? undefined : data.id,
    message: data.undone ? "This cleanup was already undone." : data.count ? `Stopped sharing ${data.count} ${data.count === 1 ? "entry" : "entries"}.` : "No matching shares remain." };
}

export async function undoCrewShareCleanup(operationId: string): Promise<SharingResult> {
  if (!crewUuid.test(operationId)) return { ok: false, message: "Choose a recent cleanup to undo." };
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in to restore sharing." };
  const { data, error } = await db.rpc("undo_crew_share_cleanup", { p_operation_id: operationId });
  if (error) return { ok: false, message: "Sharing or group settings have changed, or Undo has expired. Review your current picks before sharing again." };
  refreshSharing();
  return { ok: true, count: data, message: "Cleanup undone. Your previous sharing choices are restored." };
}

export async function shareOwnedCrewEntry(entryId: string, scope: string): Promise<SharingResult> {
  if (!crewUuid.test(entryId) || !validScope(scope)) return { ok: false, message: "Choose an entry and its sharing audience." };
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in to share this pick." };
  const { error } = await db.rpc("share_owned_crew_entry", { p_entry_id: entryId, p_scope: scope });
  if (error) return { ok: false, message: "We couldn’t update sharing. Refresh and review this entry’s audience in Privacy Settings." };
  refreshSharing();
  return { ok: true, message: "Shared with your chosen audience." };
}
