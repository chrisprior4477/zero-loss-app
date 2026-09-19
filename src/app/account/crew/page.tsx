import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CrewHub } from "@/components/account/CrewHub";
import { getAccountContext } from "@/lib/account/context";
import { createClient } from "@/lib/supabase/server";

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
export type SharedCrewPick = { title: string; retailer: string; image: string; offeringSlug: string; sharedAt: string };
export type CrewMember = { memberId: string; name: string; avatarUrl: string | null };

export default async function CrewPage({ searchParams }: { searchParams: Promise<{ member?: string; tab?: string }> }) {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  const db = await createClient();
  const params = await searchParams;
  const [invitationsResult, entriesResult, sharesResult, membersResult, profileResult] = await Promise.all([
    db.from("crew_invitations").select("id,requester_id,recipient_id,requester_name,recipient_name,status,created_at")
      .or(`requester_id.eq.${account.userId},recipient_id.eq.${account.userId}`).order("created_at", { ascending: false }),
    db.from("customer_entries").select("id,offering_slug,created_at").eq("customer_id", account.userId).order("created_at", { ascending: false }).limit(40),
    db.from("crew_entry_shares").select("entry_id").eq("owner_id", account.userId),
    db.rpc("get_crew_member_profiles"),
    db.from("customer_profiles").select("crew_discoverable").eq("customer_id", account.userId).maybeSingle(),
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

  return <CrewHub
    key={params.tab ?? "crew"}
    currentUserId={account.userId}
    invitations={invitations}
    members={(membersResult.data ?? []).map((member: { member_id: string; name: string; avatar_reference: string | null }): CrewMember => ({
      memberId: member.member_id,
      name: member.name,
      avatarUrl: member.avatar_reference ? db.storage.from("profile-photos").getPublicUrl(member.avatar_reference).data.publicUrl : null,
    }))}
    discoverable={Boolean(profileResult.data?.crew_discoverable)}
    entries={entries}
    selectedMemberId={selectedMemberId}
    selectedPicks={(picksResult?.data ?? []) as SharedCrewPick[]}
    available={available && !picksResult?.error}
    initialTab={params.tab === "requests" ? "requests" : params.tab === "picks" ? "picks" : "crew"}
  />;
}
