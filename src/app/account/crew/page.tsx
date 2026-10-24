import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CrewHub } from "@/components/account/CrewHub";
import { CrewInvitationPrompt } from "@/components/account/CrewInvitationPrompt";
import { getAccountContext } from "@/lib/account/context";
import { createClient } from "@/lib/supabase/server";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { accountPageReturnPath } from "@/lib/auth/account-return";
import { crewVisibilitySnapshot } from "@/lib/crew/visibility";

export const metadata: Metadata = { title: "Your Crew" };

export type CrewInvitation = {
  id: string;
  requester_id: string;
  recipient_id: string;
  requester_name: string;
  recipient_name: string;
  status: "pending" | "accepted" | "declined" | "removed";
  created_at: string;
};
export type OwnCrewEntry = { id: string; title: string; retailer: string; image: string | null; createdAt: string; shared: boolean };
export type SharedCrewPick = { title: string; retailer: string; image: string; offeringSlug: string; sharedAt: string; shareKind?: "pick" | "win" };
export type CrewMember = { memberId: string; name: string; avatarUrl: string | null };

export default async function CrewPage({ searchParams }: { searchParams: Promise<{ member?: string; tab?: string; request?: string; invite?: string }> }) {
  const account = await getAccountContext();
  const params = await searchParams;
  if (!account) redirect(authNavigationHref("/login", accountPageReturnPath("/account/crew", params, params.tab === "picks" ? "#sharing" : params.tab === "requests" && params.request ? `#crew-request-${params.request}` : "")));
  const db = await createClient();
  const [invitationsResult, entriesResult, sharesResult, membersResult, profileResult, inviteLinkResult, settingsResult] = await Promise.all([
    db.from("crew_invitations").select("id,requester_id,recipient_id,requester_name,recipient_name,status,created_at")
      .or(`requester_id.eq.${account.userId},recipient_id.eq.${account.userId}`).order("created_at", { ascending: false }),
    db.from("customer_entries").select("id,offering_slug,created_at").eq("customer_id", account.userId).order("created_at", { ascending: false }).limit(40),
    db.from("crew_entry_shares").select("entry_id").eq("owner_id", account.userId),
    db.rpc("get_crew_member_profiles"),
    db.from("customer_profiles").select("crew_discoverable,crew_find_real_name,crew_find_email,crew_find_phone").eq("customer_id", account.userId).maybeSingle(),
    db.rpc("get_or_create_crew_invite_link"),
    db.from("crew_visibility_settings").select("default_rule,groups,entry_rules").eq("owner_id", account.userId).maybeSingle(),
  ]);
  const available = !invitationsResult.error && !sharesResult.error && !membersResult.error && !profileResult.error;
  const invitations = (invitationsResult.data ?? []) as CrewInvitation[];
  const connected = invitations.filter((invitation) => invitation.status === "accepted");
  const selected = connected.find((invitation) => {
    const otherId = invitation.requester_id === account.userId ? invitation.recipient_id : invitation.requester_id;
    return otherId === params.member;
  });
  const selectedMemberId = selected
    ? selected.requester_id === account.userId ? selected.recipient_id : selected.requester_id
    : null;
  const picksResult = selectedMemberId
    ? await db.rpc("get_crew_shared_picks", { p_member_id: selectedMemberId })
    : null;
  const titles = new Map(account.activity.activity.map((item) => [item.slug, item]));
  const sharedIds = new Set((sharesResult.data ?? []).map((row) => row.entry_id));
  const entries: OwnCrewEntry[] = (entriesResult.data ?? []).map((entry) => {
    const item = titles.get(entry.offering_slug);
    return {
      id: entry.id,
      title: item?.title ?? entry.offering_slug.replaceAll("-", " "),
      retailer: item?.retailer ?? "Zero Loss",
      image: item?.image ?? null,
      createdAt: entry.created_at,
      shared: sharedIds.has(entry.id),
    };
  });

  // Older invitation emails linked to the general Crew page. Surface received
  // requests there too, while an exact request link must never reveal another's.
  const incoming = invitations.find(invitation => invitation.recipient_id === account.userId
    && (params.request ? invitation.id === params.request : invitation.status === "pending"));
  return <><CrewInvitationPrompt key={`${account.userId}:${params.request ?? "incoming"}`}
    invitation={incoming ? { id: incoming.id, name: incoming.requester_name, status: incoming.status } : null}
    unavailable={Boolean(params.request) && (!incoming || Boolean(invitationsResult.error))} />
  <CrewHub
    visibility={crewVisibilitySnapshot(settingsResult.data, new Set((membersResult.data ?? []).map((member: { member_id: string }) => member.member_id)))}
    visibilityAvailable={!settingsResult.error}
    key={`${params.tab ?? "crew"}-${params.request ?? ""}`}
    currentUserId={account.userId}
    invitations={invitations}
    members={(membersResult.data ?? []).map((member: { member_id: string; name: string; avatar_reference: string | null }): CrewMember => ({
      memberId: member.member_id,
      name: member.name,
      avatarUrl: member.avatar_reference ? db.storage.from("profile-photos").getPublicUrl(member.avatar_reference).data.publicUrl : null,
    }))}
    discoverable={profileResult.data?.crew_discoverable ?? true}
    discovery={{ real: profileResult.data?.crew_find_real_name ?? true, email: profileResult.data?.crew_find_email ?? true, phone: profileResult.data?.crew_find_phone ?? true }}
    entries={entries}
    selectedMemberId={selectedMemberId}
    selectedPicks={(picksResult?.data ?? []) as SharedCrewPick[]}
    available={available && !picksResult?.error}
    initialTab={params.tab === "requests" || params.tab === "picks" || params.tab === "groups" || params.tab === "privacy" || params.tab === "add" ? params.tab : "crew"}
    overview={{ balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity }}
    ownInviteToken={inviteLinkResult.error ? null : typeof inviteLinkResult.data === "string" ? inviteLinkResult.data : null}
    incomingInviteToken={typeof params.invite === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(params.invite) ? params.invite : null}
  /></>;
}
