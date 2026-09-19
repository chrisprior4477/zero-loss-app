"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type CrewActionResult = { ok: boolean; message: string };
export type CrewSearchPerson = { memberId: string; name: string; avatarUrl: string | null };
type CrewSearchResult = CrewActionResult & { people: CrewSearchPerson[] };

async function signedInClient() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  return error || !user ? null : { db, user };
}

function refreshCrew() {
  revalidatePath("/account/crew");
  revalidatePath("/account/notifications");
}

export async function inviteToCrew(email: string): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to invite someone to your Crew." };
  const cleanEmail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
    return { ok: false, message: "Enter a valid email address." };
  }
  const { error } = await session.db.rpc("request_crew_invitation", { p_email: cleanEmail });
  if (error) return { ok: false, message: error.code === "P0001" ? "You’ve reached today’s Crew invitation limit." : "We couldn’t send that request. Please try again." };
  refreshCrew();
  return { ok: true, message: "Request saved. If this person has a confirmed Zero Loss account, they’ll see it in Notifications and can approve it." };
}

export async function inviteToCrewByPhone(phone: string): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to invite someone to your Crew." };
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return { ok: false, message: "Enter a phone number with its country code." };
  const { error } = await session.db.rpc("request_crew_invitation_by_phone", { p_phone: phone });
  if (error) return { ok: false, message: error.code === "P0001" ? "You’ve reached today’s Crew invitation limit." : "We couldn’t send that request. Please try again." };
  refreshCrew();
  return { ok: true, message: "Request saved. If this is a verified phone on a Zero Loss account, that person can approve it in Notifications." };
}

export async function searchCrewByName(name: string): Promise<CrewSearchResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to search for Crew members.", people: [] };
  const query = name.trim();
  if (query.length < 3 || query.length > 60) return { ok: false, message: "Enter at least 3 characters of a name.", people: [] };
  const { data, error } = await session.db.rpc("search_crew_people", { p_name: query });
  if (error) return { ok: false, message: error.code === "P0001" ? "You’ve reached the Crew search limit. Try again later." : "Search is unavailable right now.", people: [] };
  const people = (data ?? []).map((person: { member_id: string; name: string; avatar_reference: string | null }) => ({
    memberId: person.member_id,
    name: person.name,
    avatarUrl: person.avatar_reference ? session.db.storage.from("profile-photos").getPublicUrl(person.avatar_reference).data.publicUrl : null,
  }));
  return { ok: true, message: people.length ? "Choose someone to send a Crew request." : "No discoverable members match that name. You can invite someone by email or verified phone.", people };
}

export async function inviteToCrewById(memberId: string): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to invite someone to your Crew." };
  if (!/^[0-9a-f-]{36}$/i.test(memberId)) return { ok: false, message: "That Crew member is invalid." };
  const { error } = await session.db.rpc("request_crew_invitation_by_id", { p_member_id: memberId });
  if (error) return { ok: false, message: error.code === "P0001" ? "You’ve reached today’s Crew invitation limit." : "We couldn’t send that request. Please try again." };
  refreshCrew();
  return { ok: true, message: "Crew request sent. They can approve it in Notifications; no picks are shared yet." };
}

export async function setCrewDiscoverable(enabled: boolean): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to change your Crew settings." };
  const { error } = await session.db.rpc("set_crew_discoverable", { p_enabled: enabled });
  if (error) return { ok: false, message: "We couldn’t update your discoverability. Please try again." };
  refreshCrew();
  return { ok: true, message: enabled ? "People can now find your display name in Crew search. Your picks remain private unless shared." : "You no longer appear in name search. Existing Crew connections are unchanged." };
}

export async function respondToCrewRequest(id: string, accept: boolean): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to respond to this request." };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "That request is invalid." };
  const { error } = await session.db.rpc("respond_crew_invitation", { p_invitation_id: id, p_accept: accept });
  if (error) return { ok: false, message: "This Crew request is no longer available. Refresh and try again." };
  refreshCrew();
  return { ok: true, message: accept ? "You’re connected. Only picks each of you chooses to share are visible." : "Request declined." };
}

export async function removeCrewConnection(id: string): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to manage your Crew." };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: "That connection is invalid." };
  const { error } = await session.db.rpc("remove_crew_connection", { p_invitation_id: id });
  if (error) return { ok: false, message: "We couldn’t remove this connection. Please try again." };
  refreshCrew();
  return { ok: true, message: "Connection removed. You can no longer see each other’s shared picks." };
}

export async function setEntryCrewSharing(entryId: string, share: boolean): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to change sharing." };
  if (!/^[0-9a-f-]{36}$/i.test(entryId)) return { ok: false, message: "That entry is invalid." };
  const { error } = share
    ? await session.db.from("crew_entry_shares").insert({ entry_id: entryId, owner_id: session.user.id })
    : await session.db.from("crew_entry_shares").delete().eq("entry_id", entryId).eq("owner_id", session.user.id);
  if (error) return { ok: false, message: "We couldn’t change this pick’s visibility. Please try again." };
  refreshCrew();
  return { ok: true, message: share ? "This pick is visible to your approved Crew." : "This pick is private now." };
}
