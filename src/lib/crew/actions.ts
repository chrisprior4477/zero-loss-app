"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { crewUuid, isCrewVisibilityGroup, isCrewVisibilityRule, type CrewVisibilityGroup, type CrewVisibilityRule } from "./visibility";

type CrewActionResult = { ok: boolean; message: string };
export type CrewSearchPerson = { memberId: string; name: string; avatarUrl: string | null };
type CrewSearchResult = CrewActionResult & { people: CrewSearchPerson[] };
export type CrewSharedPick = { title: string; retailer: string; image: string; offeringSlug: string; sharedAt: string };

export async function sharePrizeWithCrew(offeringSlug: string, recipientIds: string[]): Promise<CrewActionResult & { queued?: number; alreadyShared?: number }> {
  if (!/^[a-z0-9-]{2,100}$/.test(offeringSlug) || !Array.isArray(recipientIds) || recipientIds.length < 1 || recipientIds.length > 20
    || new Set(recipientIds).size !== recipientIds.length || !recipientIds.every(id => crewUuid.test(id))) {
    return { ok: false, message: "Choose approved Crew members before sharing this prize." };
  }
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in before sharing this prize with your Crew." };
  const { data, error } = await session.db.rpc("share_prize_with_crew", {
    p_offering_slug: offeringSlug, p_recipient_ids: recipientIds,
  });
  if (error || !data || typeof data.queued !== "number" || typeof data.alreadyShared !== "number") {
    return { ok: false, message: "We couldn’t save this Crew share. Check that everyone is still approved, then try again." };
  }
  return { ok: true, queued: data.queued, alreadyShared: data.alreadyShared,
    message: data.queued ? `Saved for email delivery to ${data.queued} approved Crew ${data.queued === 1 ? "member" : "members"}.` : "This prize was already shared with the selected Crew members." };
}

async function signedInClient() {
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  return error || !user ? null : { db, user };
}

function refreshCrew() {
  revalidatePath("/account/crew");
  revalidatePath("/account/crew/display");
  revalidatePath("/account/notifications");
}

export async function saveCrewDisplaySettings(input: {
  discoverable: boolean;
  defaultRule: CrewVisibilityRule;
  groups: CrewVisibilityGroup[];
  entryRules: Record<string, CrewVisibilityRule>;
}): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to save your Crew sharing settings." };
  if (!input || typeof input.discoverable !== "boolean" || !isCrewVisibilityRule(input.defaultRule)
    || !Array.isArray(input.groups) || input.groups.length > 500 || !input.groups.every(isCrewVisibilityGroup)
    || !input.entryRules || typeof input.entryRules !== "object" || Array.isArray(input.entryRules)
    || Object.keys(input.entryRules).length > 500
    || !Object.entries(input.entryRules).every(([id, rule]) => crewUuid.test(id) && isCrewVisibilityRule(rule))) {
    return { ok: false, message: "Review the audience and group details before saving." };
  }
  const names = input.groups.map((group) => group.name.trim().toLocaleLowerCase());
  if (new Set(names).size !== names.length || new Set(input.groups.map((group) => group.id)).size !== input.groups.length) {
    return { ok: false, message: "Give every group a different name." };
  }
  const { error } = await session.db.rpc("save_crew_visibility_settings", {
    p_default_rule: { audience: input.defaultRule.audience, memberIds: input.defaultRule.memberIds, groupIds: input.defaultRule.groupIds },
    p_groups: input.groups.map((group) => ({ id: group.id, name: group.name.trim(), memberIds: group.memberIds })),
    p_entry_rules: Object.fromEntries(Object.entries(input.entryRules).map(([id, rule]) => [id, { audience: rule.audience, memberIds: rule.memberIds, groupIds: rule.groupIds }])),
    p_discoverable: input.discoverable,
  });
  if (error) return { ok: false, message: "We couldn’t save those settings. Check that each person is still in your approved Crew, then try again." };
  refreshCrew();
  return { ok: true, message: "Saved to your profile. Your search visibility and pick audiences are updated." };
}

/** Save just one group, leaving other visibility edits for the main Save to profile action. */
export async function saveCrewGroup(input: { group: CrewVisibilityGroup; remove: boolean }): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to save your Crew group." };
  if (!input || !isCrewVisibilityGroup(input.group) || typeof input.remove !== "boolean") {
    return { ok: false, message: "Review the group name and people before saving." };
  }
  const group = { ...input.group, name: input.group.name.trim() };
  const { error } = await session.db.rpc("save_crew_visibility_group", { p_group: group, p_remove: input.remove });
  if (error) return { ok: false, message: "We couldn’t save that group. Check that everyone is still in your approved Crew, then try again." };
  refreshCrew();
  return { ok: true, message: input.remove ? "Group removed from your profile." : `${group.name} saved to your profile.` };
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

export async function getCrewSharedPicks(memberId: string): Promise<{ ok: boolean; picks: CrewSharedPick[] }> {
  const session = await signedInClient();
  if (!session || !/^[0-9a-f-]{36}$/i.test(memberId)) return { ok: false, picks: [] };
  // The database function checks that this member has approved the connection
  // and returns only entries they explicitly chose to share.
  const { data, error } = await session.db.rpc("get_crew_shared_picks", { p_member_id: memberId });
  if (error) return { ok: false, picks: [] };
  return { ok: true, picks: (data ?? []) as CrewSharedPick[] };
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

export async function requestCrewInvitationFromLink(token: string): Promise<CrewActionResult> {
  const session = await signedInClient();
  if (!session) return { ok: false, message: "Sign in to request a Crew connection." };
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(token)) return { ok: false, message: "This Crew invite link is invalid." };
  const { data, error } = await session.db.rpc("request_crew_invitation_from_link", { p_token: token });
  if (error) return { ok: false, message: error.code === "P0001" ? "You’ve reached today’s Crew invitation limit." : "We couldn’t send the Crew request. Please try again." };
  if (data === "invalid") return { ok: false, message: "This Crew invite link is no longer available." };
  if (data === "self") return { ok: false, message: "This is your own Crew invite link." };
  if (data === "unavailable") return { ok: false, message: "Your account isn’t ready to send Crew requests yet." };
  if (data === "already_requested") return { ok: true, message: "You’re already connected or a request is waiting for approval." };
  if (data !== "request_sent") return { ok: false, message: "We couldn’t verify this Crew request." };
  refreshCrew();
  return { ok: true, message: "Crew request sent. The link owner can approve it in Notifications; no picks are shared yet." };
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
