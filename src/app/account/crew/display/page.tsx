import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CrewDisplaySettings } from "@/components/account/CrewDisplaySettings";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { createClient } from "@/lib/supabase/server";
import { defaultCrewVisibilityRule, isCrewVisibilityGroup, isCrewVisibilityRule, type CrewVisibilityRule } from "@/lib/crew/visibility";

export const metadata: Metadata = { title: "How to display my picks" };

export default async function CrewDisplayPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/crew/display"));
  const db = await createClient();
  const [profileResult, settingsResult, membersResult, sharesResult, entriesResult] = await Promise.all([
    db.from("customer_profiles").select("crew_discoverable").eq("customer_id", account.userId).maybeSingle(),
    db.from("crew_visibility_settings").select("default_rule,groups,entry_rules").eq("owner_id", account.userId).maybeSingle(),
    db.rpc("get_crew_member_profiles"),
    db.from("crew_entry_shares").select("entry_id").eq("owner_id", account.userId),
    db.from("customer_entries").select("id,offering_slug,created_at").eq("customer_id", account.userId).order("created_at", { ascending: false }).limit(500),
  ]);
  const available = !profileResult.error && !settingsResult.error && !membersResult.error && !sharesResult.error && !entriesResult.error;
  const settings = settingsResult.data;
  const members: { id: string; name: string }[] = (membersResult.data ?? []).map((member: { member_id: string; name: string }) => ({ id: member.member_id, name: member.name }));
  const memberIds = new Set(members.map((member) => member.id));
  const rawGroups: unknown[] = Array.isArray(settings?.groups) ? settings.groups : [];
  const groups = rawGroups.filter(isCrewVisibilityGroup)
    .map((group) => ({ ...group, memberIds: group.memberIds.filter((id) => memberIds.has(id)) }));
  const groupIds = new Set(groups.map((group) => group.id));
  const normalizeRule = (rule: CrewVisibilityRule): CrewVisibilityRule => ({
    ...rule,
    memberIds: rule.memberIds.filter((id) => memberIds.has(id)),
    groupIds: rule.groupIds.filter((id) => groupIds.has(id)),
  });
  const storedRules: Record<string, unknown> = settings?.entry_rules && typeof settings.entry_rules === "object" && !Array.isArray(settings.entry_rules)
    ? settings.entry_rules as Record<string, unknown> : {};
  const entryRules: Record<string, CrewVisibilityRule> = Object.fromEntries(Object.entries(storedRules).filter((entry): entry is [string, CrewVisibilityRule] => isCrewVisibilityRule(entry[1])).map(([id, rule]) => [id, normalizeRule(rule)]));
  const sharedIds = new Set((sharesResult.data ?? []).map((share) => share.entry_id));
  const activity = new Map(account.activity.activity.map((item) => [item.slug, item]));
  const sharedPicks = (entriesResult.data ?? []).filter((entry) => sharedIds.has(entry.id)).map((entry) => {
    const item = activity.get(entry.offering_slug);
    return { id: entry.id, title: item?.title ?? entry.offering_slug.replaceAll("-", " "), retailer: item?.retailer ?? "Zero Loss", image: item?.image ?? null };
  });

  return <CrewDisplaySettings
    available={available}
    initialDiscoverable={Boolean(profileResult.data?.crew_discoverable)}
    initialDefaultRule={normalizeRule(isCrewVisibilityRule(settings?.default_rule) ? settings.default_rule : defaultCrewVisibilityRule)}
    initialGroups={groups}
    initialEntryRules={entryRules}
    members={members}
    sharedPicks={sharedPicks}
  />;
}
