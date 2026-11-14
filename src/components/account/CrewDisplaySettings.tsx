"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveCrewDisplaySettings, saveCrewGroup } from "@/lib/crew/actions";
import { notifyAccountChanged } from "@/lib/account/account-state-events";
import { changedCrewEntryRules, isCrewVisibilityGroup, sameCrewVisibilityRule, type CrewAudience, type CrewDisplaySnapshot, type CrewVisibilityGroup, type CrewVisibilityRule } from "@/lib/crew/visibility";
import styles from "./crew-display-settings.module.css";
import { CrewGroupContacts } from "./CrewGroupContacts";
import { CrewGroupRemovalCountdown } from "./CrewGroupRemovalCountdown";

type Member = { id: string; name: string };
type Pick = { id: string; title: string; retailer: string; image: string | null };
type Props = {
  ownerId?: string;
  embedded?: boolean;
  withinAccountSettings?: boolean;
  section?: "all" | "groups" | "privacy";
  available: boolean;
  initialDiscoverable: boolean;
  initialDiscovery?: { real: boolean; email: boolean; phone: boolean };
  initialDefaultRule: CrewVisibilityRule;
  initialGroups: CrewVisibilityGroup[];
  initialEntryRules: Record<string, CrewVisibilityRule>;
  members: Member[];
  sharedPicks: Pick[];
};

const audienceLabels: Record<CrewAudience, string> = {
  everyone: "Everyone in my Crew",
  people: "Only selected people",
  groups: "Only selected groups",
};

function withAudience(rule: CrewVisibilityRule, audience: CrewAudience): CrewVisibilityRule {
  return { ...rule, audience };
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

function sameValue<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameGroup(left: CrewVisibilityGroup | undefined, right: CrewVisibilityGroup | undefined): boolean {
  if (!left || !right) return left === right;
  return left.name === right.name && sameValue(left.memberIds, right.memberIds)
    && sameValue(
      (left.contacts ?? []).map(({ id, name, phone, email }) => [id, name, phone, email]),
      (right.contacts ?? []).map(({ id, name, phone, email }) => [id, name, phone, email]),
    );
}

function reconcileDraft<T>(draft: T, expected: T, latest: T, equal: (left: T, right: T) => boolean = sameValue): [T, T] {
  return equal(draft, expected) || equal(draft, latest) ? [latest, latest] : [draft, expected];
}

function reconcileGroups(draft: CrewVisibilityGroup[], expected: CrewVisibilityGroup[], latest: CrewVisibilityGroup[]) {
  const draftById = new Map(draft.map(group => [group.id, group]));
  const expectedById = new Map(expected.map(group => [group.id, group]));
  const latestById = new Map(latest.map(group => [group.id, group]));
  const groups: CrewVisibilityGroup[] = [];
  const expectedGroups: CrewVisibilityGroup[] = [];
  for (const id of new Set([...latestById.keys(), ...draftById.keys()])) {
    const [next, before] = reconcileDraft(draftById.get(id), expectedById.get(id), latestById.get(id), sameGroup);
    if (next) groups.push(next);
    if (before) expectedGroups.push(before);
  }
  return { groups, expectedGroups };
}

function AudienceTargets({ rule, onChange, members, groups, prefix, disabled }: {
  rule: CrewVisibilityRule;
  onChange: (rule: CrewVisibilityRule) => void;
  members: Member[];
  groups: CrewVisibilityGroup[];
  prefix: string;
  disabled: boolean;
}) {
  if (rule.audience === "everyone") return null;
  const targets = rule.audience === "people" ? members.map((member) => ({ id: member.id, name: member.name })) : groups;
  const selected = rule.audience === "people" ? rule.memberIds : rule.groupIds;
  return <div className={styles.targets} aria-label={rule.audience === "people" ? "Choose Crew members" : "Choose groups"}>
    {targets.length ? targets.map((target) => <label key={target.id} className={styles.target}>
      <input type="checkbox" name={`${prefix}-${target.id}`} disabled={disabled} checked={selected.includes(target.id)} onChange={() => onChange(rule.audience === "people"
        ? { ...rule, memberIds: toggleId(rule.memberIds, target.id) }
        : { ...rule, groupIds: toggleId(rule.groupIds, target.id) })} />
      <span>{target.name}</span>
    </label>) : <p className={styles.emptyTargets}>{rule.audience === "people" ? "Connect with someone in Your Crew first." : "Create a group in Your Crew first."}</p>}
  </div>;
}

export function CrewDisplaySettings({ ownerId, available, initialDiscoverable, initialDiscovery, initialDefaultRule, initialGroups, initialEntryRules, members, sharedPicks, embedded = false, withinAccountSettings = false, section = "all" }: Props) {
  const router = useRouter();
  const [discoverable, setDiscoverable] = useState(initialDiscoverable);
  const [discovery, setDiscovery] = useState(initialDiscovery ?? { real: true, email: true, phone: true });
  const [defaultRule, setDefaultRule] = useState<CrewVisibilityRule>(initialDefaultRule);
  const [groups, setGroups] = useState<CrewVisibilityGroup[]>(initialGroups);
  const [entryRules, setEntryRules] = useState<Record<string, CrewVisibilityRule>>(initialEntryRules);
  const incoming: CrewDisplaySnapshot = { discoverable: initialDiscoverable, discovery: initialDiscovery ?? { real: true, email: true, phone: true }, defaultRule: initialDefaultRule, groups: initialGroups, entryRules: initialEntryRules };
  const [server, setServer] = useState(incoming);
  const [lastIncoming, setLastIncoming] = useState(incoming);
  const [baseline, setBaseline] = useState(incoming);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);
  const restoreRemovalFocus = useRef<string | null>(null);
  const [groupMessage, setGroupMessage] = useState("");
  const [groupMessageError, setGroupMessageError] = useState(false);
  const [editorMessage, setEditorMessage] = useState<{ id: string; text: string; error: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const privacyDisabled = !available || pending;
  const groupToReveal = useRef<string | null>(null);
  const groupDraftKey = available && ownerId && section !== "privacy" ? `zero-loss:crew-group-draft:${ownerId}:${embedded ? "crew" : "settings"}` : null;
  const [loadedDraftKey, setLoadedDraftKey] = useState<string | null>(null);
  const persistedGroupIds = new Set(baseline.groups.map(group => group.id));
  const latestGroups = new Map(server.groups.map(group => [group.id, group]));
  const baselineGroups = new Map(baseline.groups.map(group => [group.id, group]));
  const conflictingGroups = new Set(groups.filter(group => {
    const latest = latestGroups.get(group.id);
    return !sameGroup(group, latest) && !sameGroup(baselineGroups.get(group.id), latest);
  }).map(group => group.id));

  // Keep the editor and its input focus. Only untouched values follow the
  // incoming snapshot, while edited values retain the baseline used at save.
  if (available && !pending && !sameValue(incoming, lastIncoming)) {
    const { groups: mergedGroups, expectedGroups } = reconcileGroups(groups, baseline.groups, incoming.groups);
    const [nextDiscoverable, expectedDiscoverable] = reconcileDraft(discoverable, baseline.discoverable, incoming.discoverable);
    const [real, expectedReal] = reconcileDraft(discovery.real, baseline.discovery.real, incoming.discovery.real);
    const [email, expectedEmail] = reconcileDraft(discovery.email, baseline.discovery.email, incoming.discovery.email);
    const [phone, expectedPhone] = reconcileDraft(discovery.phone, baseline.discovery.phone, incoming.discovery.phone);
    const [nextDefault, expectedDefault] = reconcileDraft(defaultRule, baseline.defaultRule, incoming.defaultRule);
    const nextRules: typeof entryRules = {};
    const expectedRules: typeof entryRules = {};
    for (const id of new Set([...Object.keys(incoming.entryRules), ...Object.keys(entryRules), ...Object.keys(baseline.entryRules)])) {
      const [next, before] = reconcileDraft<CrewVisibilityRule | undefined>(entryRules[id], baseline.entryRules[id], incoming.entryRules[id]);
      if (next) nextRules[id] = next;
      if (before) expectedRules[id] = before;
    }
    setLastIncoming(incoming);
    setServer(incoming);
    setBaseline({ discoverable: expectedDiscoverable, discovery: { real: expectedReal, email: expectedEmail, phone: expectedPhone }, groups: expectedGroups, defaultRule: expectedDefault, entryRules: expectedRules });
    setDiscoverable(nextDiscoverable);
    setDiscovery({ real, email, phone });
    setDefaultRule(nextDefault);
    setGroups(mergedGroups);
    setEntryRules(nextRules);
    if (removingGroupId && !sameGroup(baselineGroups.get(removingGroupId), incoming.groups.find(group => group.id === removingGroupId))) setRemovingGroupId(null);
  }

  useEffect(() => {
    if (!groupDraftKey || loadedDraftKey === groupDraftKey) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem(groupDraftKey) ?? "null");
      const editor = initialGroups.find(group => group.id === draft?.expanded);
      const entries: unknown[] = Array.isArray(draft?.changes) ? draft.changes : [];
      const changes = entries.filter((change): change is { before: CrewVisibilityGroup; after: CrewVisibilityGroup } => {
        if (!change || typeof change !== "object" || !("before" in change) || !("after" in change) || !isCrewVisibilityGroup(change.before)) return false;
        const after = change.after as CrewVisibilityGroup | null;
        return Boolean(after && typeof after.name === "string" && after.name.length <= 50 && after.id === change.before.id
          && isCrewVisibilityGroup({ ...after, name: change.before.name }) && initialGroups.some(group => group.id === after.id));
      });
      if (changes.length) {
        const { groups: restored, expectedGroups } = reconcileGroups(changes.map(change => change.after), changes.map(change => change.before), initialGroups);
        // Hydrate this tab's draft and retain its saved baseline for conflict checks.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGroups(restored);
        setBaseline(current => ({ ...current, groups: expectedGroups }));
      }
      if (editor) {
        groupToReveal.current = editor.id;
        setExpandedGroupId(editor.id);
      }
    } catch { /* The saved groups can still be edited. */ }
    setLoadedDraftKey(groupDraftKey);
  }, [groupDraftKey, initialGroups, loadedDraftKey]);

  useEffect(() => {
    if (!groupDraftKey || loadedDraftKey !== groupDraftKey) return;
    const changes = baseline.groups.flatMap(before => {
      const after = groups.find(group => group.id === before.id);
      return after && !sameGroup(before, after) ? [{ before, after }] : [];
    });
    try {
      if (expandedGroupId || changes.length) sessionStorage.setItem(groupDraftKey, JSON.stringify({ expanded: expandedGroupId, changes }));
      else sessionStorage.removeItem(groupDraftKey);
    } catch { /* Editing remains available without tab storage. */ }
  }, [baseline.groups, expandedGroupId, groupDraftKey, groups, loadedDraftKey]);

  useEffect(() => {
    if (removingGroupId || !restoreRemovalFocus.current) return;
    document.getElementById(`remove-crew-group-${restoreRemovalFocus.current}`)?.focus({ preventScroll: true });
    restoreRemovalFocus.current = null;
  }, [removingGroupId]);

  function undoGroupRemoval() {
    restoreRemovalFocus.current = removingGroupId;
    setRemovingGroupId(null);
  }

  useEffect(() => {
    if (!groupToReveal.current) return;
    document.getElementById(`crew-group-${groupToReveal.current}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    groupToReveal.current = null;
  }, [groups, expandedGroupId]);

  function clearSaveFeedback() {
    setSaved(false);
    setMessage("");
  }

  const discoveryFields = <div>{(["display", "real", "email", "phone"] as const).map(key => <label className={styles.discoveryToggle} key={key}><input type="checkbox" disabled={privacyDisabled} checked={key === "display" ? discoverable : discovery[key]} onChange={e => { if (key === "display") setDiscoverable(e.target.checked); else setDiscovery(current => ({ ...current, [key]: e.target.checked })); clearSaveFeedback(); }} /><span><strong>Find me by {({ display: "display name", real: "real name", email: "email address", phone: "phone number" })[key]}</strong><small>{key === "email" || key === "phone" ? "They must enter the full address or number. It is never shown in results." : "Allow matching names in Crew search."}</small></span></label>)}</div>;
  function updateEntryRule(id: string, rule: CrewVisibilityRule | null) {
    clearSaveFeedback();
    setEntryRules((current) => {
      const next = { ...current };
      if (rule) next[id] = rule;
      else delete next[id];
      return next;
    });
  }

  function addGroup() {
    const name = newGroupName.trim();
    if (!name) { setGroupMessage("Give your group a name first."); setGroupMessageError(true); return; }
    if (name.length > 50) { setGroupMessage("Group names can be up to 50 characters."); setGroupMessageError(true); return; }
    if (groups.some((group) => group.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setGroupMessage("You already have a group with that name."); setGroupMessageError(true); return;
    }
    const id = crypto.randomUUID();
    groupToReveal.current = id;
    setGroups((current) => [...current, { id, name, memberIds: [] }]);
    setExpandedGroupId(id);
    setEditorMessage(null);
    setNewGroupName("");
    setMessage("");
    setGroupMessage(`${name} is ready. Add people below, then choose Save group.`);
    setGroupMessageError(false);
    setSaved(false);
  }

  function discardGroup(id: string) {
    setGroups((current) => current.filter((group) => group.id !== id));
    setExpandedGroupId((current) => current === id ? null : current);
    setEditorMessage((current) => current?.id === id ? null : current);
    setDefaultRule((current) => ({ ...current, groupIds: current.groupIds.filter((value) => value !== id) }));
    setEntryRules((current) => Object.fromEntries(Object.entries(current).map(([entryId, rule]) => [entryId, { ...rule, groupIds: rule.groupIds.filter((value) => value !== id) }])));
    setSaved(false);
  }

  function saveGroup(group: CrewVisibilityGroup) {
    if (conflictingGroups.has(group.id)) return;
    const name = group.name.trim();
    if (!name || name.length > 50 || groups.some((item) => item.id !== group.id && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setEditorMessage({ id: group.id, text: "Give this group a unique name of 1–50 characters.", error: true });
      return;
    }
    startTransition(async () => {
      const next = { ...group, name };
      const result = await saveCrewGroup({ group: next, remove: false, expected: baselineGroups.get(group.id) ?? null }).catch(() => ({ ok: false, message: "Couldn’t confirm the save. Your edits are still here; please try again.", conflict: false }));
      setEditorMessage({ id: group.id, text: result.ok ? `${name} saved. You can keep editing it or create another group.` : result.message, error: !result.ok });
      if (result.ok) {
        setBaseline(current => ({ ...current, groups: [...current.groups.filter(item => item.id !== group.id), next] }));
        setServer(current => ({ ...current, groups: [...current.groups.filter(item => item.id !== group.id), next] }));
        setGroups(current => current.map(item => item.id === group.id ? next : item));
        setGroupMessage("");
        setExpandedGroupId(null);
        setGroupMessage(`${name} saved to your profile · ${group.memberIds.length} connected members · ${group.contacts?.length ?? 0} saved contacts.`);
        setGroupMessageError(false);
        notifyAccountChanged();
        router.refresh();
      } else if (result.conflict) router.refresh();
    });
  }

  function loadSavedGroup(id: string) {
    const latest = latestGroups.get(id);
    setBaseline(current => ({ ...current, groups: [...current.groups.filter(group => group.id !== id), ...(latest ? [latest] : [])] }));
    setEditorMessage(null);
    if (latest) setGroups(current => current.map(group => group.id === id ? latest : group));
    else discardGroup(id);
  }

  function requestGroupRemoval(group: CrewVisibilityGroup) {
    if (!persistedGroupIds.has(group.id)) {
      discardGroup(group.id);
      setGroupMessage(`${group.name} removed.`);
      setGroupMessageError(false);
      return;
    }
    setEditorMessage(null);
    setRemovingGroupId(group.id);
  }

  function removeGroup(group: CrewVisibilityGroup) {
    if (removingGroupId !== group.id || pending || !available || conflictingGroups.has(group.id)) return;
    const expected = baselineGroups.get(group.id);
    if (!expected) return;
    startTransition(async () => {
      const result = await saveCrewGroup({ group: expected, remove: true, expected }).catch(() => ({ ok: false, message: "Couldn’t confirm removal. Please try again.", conflict: false }));
      if (result.ok) {
        const withoutGroup = (rule: CrewVisibilityRule) => ({ ...rule, groupIds: rule.groupIds.filter(id => id !== group.id) });
        const removeFromSnapshot = (snapshot: CrewDisplaySnapshot) => ({ ...snapshot,
          groups: snapshot.groups.filter(item => item.id !== group.id),
          defaultRule: withoutGroup(snapshot.defaultRule),
          entryRules: Object.fromEntries(Object.entries(snapshot.entryRules).map(([id, rule]) => [id, withoutGroup(rule)])),
        });
        setBaseline(removeFromSnapshot);
        setServer(removeFromSnapshot);
        setRemovingGroupId(null);
        discardGroup(group.id);
        setGroupMessage(`${group.name} removed from your profile.`);
        setGroupMessageError(false);
        notifyAccountChanged();
        router.refresh();
      } else {
        setEditorMessage({ id: group.id, text: result.message, error: true });
        if (result.conflict) { setRemovingGroupId(null); router.refresh(); }
      }
    });
  }

  function validate(changedRules: Record<string, CrewVisibilityRule>): string | null {
    const validGroupIds = new Set(server.groups.map((group) => group.id));
    const validMemberIds = new Set(members.map((member) => member.id));
    // Cleanup intentionally leaves empty audiences on historical/private picks.
    // Validate new audience choices without blocking unrelated privacy edits.
    const rules = [...(sameCrewVisibilityRule(defaultRule, baseline.defaultRule) ? [] : [defaultRule]), ...Object.values(changedRules)];
    if (rules.some((rule) => rule.memberIds.some((id) => !validMemberIds.has(id)) || rule.groupIds.some((id) => !validGroupIds.has(id)))) return "A selected person or group is no longer available. Review your choices.";
    if (rules.some((rule) => rule.audience === "people" && rule.memberIds.length === 0)) return "Choose at least one person for each selected-people audience.";
    if (rules.some((rule) => rule.audience === "groups" && rule.groupIds.length === 0)) return "Choose at least one group for each selected-groups audience.";
    return null;
  }

  function save() {
    if (privacyDisabled) return;
    const { before, after } = changedCrewEntryRules(baseline.entryRules, entryRules);
    const problem = validate(after);
    if (problem) { setMessage(problem); setSaved(false); return; }
    clearSaveFeedback();
    startTransition(async () => {
      const result = await saveCrewDisplaySettings({
        discoverable, discovery, defaultRule, entryRules: after,
        expected: { discoverable: baseline.discoverable, discovery: baseline.discovery, defaultRule: baseline.defaultRule, entryRules: before },
      }).catch(() => ({ ok: false, message: "Couldn’t confirm the save. Your edits are still here; please try again.", settings: undefined, conflict: false }));
      setMessage(result.message);
      setSaved(result.ok);
      if (result.ok) {
        const latest = result.settings ?? { discoverable, discovery, defaultRule, groups: server.groups, entryRules };
        const reconciled = reconcileGroups(groups, baseline.groups, latest.groups);
        setBaseline({ ...latest, groups: reconciled.expectedGroups });
        setServer(latest);
        setDiscoverable(latest.discoverable); setDiscovery(latest.discovery);
        setDefaultRule(latest.defaultRule); setGroups(reconciled.groups); setEntryRules(latest.entryRules);
        notifyAccountChanged();
        router.refresh();
      } else if (result.conflict) router.refresh();
    });
  }

  return <div className={`${styles.page} ${embedded ? styles.embedded : withinAccountSettings ? styles.withinSettings : ""}`}>
    <div className={styles.shell}>
      {!embedded ? <>
      {!withinAccountSettings ? <nav className={styles.crumbs} aria-label="Breadcrumb"><Link href="/account/crew">Your Crew</Link><span aria-hidden="true">›</span><span>How to display my picks</span></nav> : null}
      <header className={styles.heading}><span>YOUR CREW · SHARING CONTROLS</span>{withinAccountSettings ? <h2>How to display my picks</h2> : <h1>How to display my picks</h1>}<p>Decide who can find you, then choose which connected Crew members see each pick.</p></header>
      </> : null}
      {!available ? <p role="alert" className={styles.unavailable}>Sharing settings are temporarily unavailable. Nothing has been changed.</p> : null}

      {(!embedded || section === "privacy") && section !== "groups" ? <section id="crew-privacy" className={styles.ticket} aria-labelledby="discover-title">
        <div className={styles.sectionHead}><span className={styles.step}>01</span><div><h2 id="discover-title">Can people find me?</h2><p>Choose how other members can find you. These are on by default. Search never displays your email or phone number, or shares your picks or wallet.</p></div></div>
        {discoveryFields}
      </section> : null}

      {section !== "groups" ? <section className={styles.ticket} aria-labelledby="default-title">
        <div className={styles.sectionHead}><span className={styles.step}>02</span><div><h2 id="default-title">Who sees my shared picks by default?</h2><p>This applies to picks you share unless you make a different choice for an individual pick below. Nobody outside your connected Crew can see them.</p></div></div>
        <div className={styles.audienceGrid} role="radiogroup" aria-label="Default pick audience">
          {(["everyone", "people", "groups"] as const).map((audience) => <label key={audience} className={styles.audienceOption} data-selected={defaultRule.audience === audience}>
            <input type="radio" name="default-audience" disabled={privacyDisabled} checked={defaultRule.audience === audience} onChange={() => { setDefaultRule(withAudience(defaultRule, audience)); clearSaveFeedback(); }} />
            <strong>{audienceLabels[audience]}</strong>
            <small>{audience === "everyone" ? "Every connected Crew connection" : audience === "people" ? "Choose individual connections" : "Use your custom groups"}</small>
          </label>)}
        </div>
        <AudienceTargets rule={defaultRule} onChange={(rule) => { setDefaultRule(rule); clearSaveFeedback(); }} members={members} groups={server.groups} prefix="default" disabled={privacyDisabled} />
      </section> : null}

      {section !== "privacy" ? <section id="crew-groups" className={styles.ticket} aria-labelledby="groups-title">
        <div className={styles.sectionHead}><span className={styles.step}>03</span><div><h2 id="groups-title">Make your own groups</h2><p>Create several groups—Family, Friends, or any name you choose—and decide which connected Crew members belong in each.</p></div></div>
        <div className={styles.groupArea}>
          <div className={styles.groupListHeading}><strong>Your groups</strong><span>{groups.length} {groups.length === 1 ? "group" : "groups"}</span></div>
          {groups.length ? <div className={styles.groupList}>{groups.map((group) => {
            const expanded = expandedGroupId === group.id;
            return <div id={`crew-group-${group.id}`} key={group.id} className={styles.groupRow}>
              <div className={styles.groupSummary}><div><strong>{group.name}</strong><small>{group.memberIds.length} connected members · {group.contacts?.length ?? 0} saved contacts{persistedGroupIds.has(group.id) ? "" : " · Not saved yet"}</small></div><button type="button" disabled={pending} aria-expanded={expanded} aria-controls={`crew-group-editor-${group.id}`} onClick={() => { setRemovingGroupId(null); setExpandedGroupId(expanded ? null : group.id); }}>Add people to group <span aria-hidden="true">{expanded ? "⌃" : "⌄"}</span></button></div>
              {expanded ? <div id={`crew-group-editor-${group.id}`} className={styles.groupEditor}>
                {removingGroupId === group.id ? <CrewGroupRemovalCountdown key={group.id} name={group.name} busy={pending} onUndo={undoGroupRemoval} onConfirm={() => removeGroup(group)} /> : <>
                <label className={styles.groupName}>Group name<input value={group.name} maxLength={50} disabled={!available || pending} onChange={(event) => { setGroups((current) => current.map((item) => item.id === group.id ? { ...item, name: event.target.value } : item)); setSaved(false); }} /></label>
                <div className={styles.memberEditor}>
                  <div className={styles.memberPickerHeading}><strong>People in this group</strong><span>{group.memberIds.length ? "Use Remove to take someone out of this group." : "No one added yet."}</span></div>
                  {group.memberIds.length ? <div className={styles.memberChips}>{group.memberIds.map((id) => {
                    const member = members.find((item) => item.id === id);
                    return <span className={styles.memberChip} key={id}>{member?.name ?? "Former member"}<button type="button" disabled={!available || pending} onClick={() => { setGroups((current) => current.map((item) => item.id === group.id ? { ...item, memberIds: item.memberIds.filter((value) => value !== id) } : item)); setSaved(false); }} aria-label={`Remove ${member?.name ?? "former member"} from ${group.name}`}>Remove</button></span>;
                  })}</div> : null}
                  <div className={styles.memberPickerHeading}><strong>Add people</strong><span>Choose connected Crew members.</span></div>
                  <div className={styles.targets}>{members.length ? members.filter((member) => !group.memberIds.includes(member.id)).map((member) => <button type="button" key={member.id} className={styles.addMember} disabled={!available || pending} onClick={() => { setGroups((current) => current.map((item) => item.id === group.id ? { ...item, memberIds: [...item.memberIds, member.id] } : item)); setSaved(false); }}>+ Add {member.name}</button>) : <span className={styles.emptyTargets}>No connected Crew members yet. Add a contact below to get started.</span>}</div>
                </div>
                <CrewGroupContacts contacts={group.contacts ?? []} disabled={!available || pending} onChange={contacts => { setGroups(current => current.map(item => item.id === group.id ? { ...item, contacts } : item)); setSaved(false); setEditorMessage(null); }} />
                {conflictingGroups.has(group.id) ? <div><p role="alert" className={styles.groupError}>This group changed in another tab. Your draft is still here. Load the saved version before editing it again.</p><button type="button" className={styles.addMember} disabled={!available || pending} onClick={() => loadSavedGroup(group.id)}>Load saved group</button></div> : null}
                <div className={styles.groupActions}><button id={`remove-crew-group-${group.id}`} type="button" className={styles.removeGroup} onClick={() => requestGroupRemoval(group)} disabled={!available || pending || conflictingGroups.has(group.id)}>Remove group</button><button type="button" className={styles.saveGroup} onClick={() => saveGroup(group)} disabled={!available || pending || conflictingGroups.has(group.id)}>{pending ? "Saving…" : "Save group"}</button></div>
                </>}
                {editorMessage?.id === group.id ? <p role={editorMessage.error ? "alert" : "status"} className={editorMessage.error ? styles.groupError : styles.groupSaved}>{editorMessage.text}</p> : <p className={styles.groupHint}>Add or remove people, then choose Save group to apply this group’s changes.</p>}
              </div> : null}
            </div>;
          })}</div> : <p className={styles.emptyGroup}>No groups yet. Create a name below; it will open here so you can add people.</p>}
          {groupMessage ? <p role={groupMessageError ? "alert" : "status"} className={styles.groupNotice} data-error={groupMessageError}>{groupMessage}</p> : null}
          <div className={styles.addGroup}><label htmlFor="new-crew-group">New group name</label><div><input id="new-crew-group" value={newGroupName} maxLength={50} disabled={!available || pending} placeholder="Family, Friends, or your own name" onChange={(event) => setNewGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addGroup(); } }} /><button type="button" onClick={addGroup} disabled={!available || pending}>+ Create group</button></div></div>
        </div>
      </section> : null}

      {(!embedded || section === "privacy") && section !== "groups" ? <section className={styles.ticket} aria-labelledby="picks-title">
        <div className={styles.sectionHead}><span className={styles.step}>04</span><div><h2 id="picks-title">Choose who sees what</h2><p>Each pick can use your default, selected people, or one or more of your groups. Only picks you explicitly share appear here.</p></div></div>
        {sharedPicks.length ? <div className={styles.pickGrid}>{sharedPicks.map((pick) => {
          const rule = entryRules[pick.id];
          return <div className={styles.pickCard} key={pick.id}>
            <div className={styles.pickTitle}>{pick.image ? <div className={styles.pickImage}><Image src={pick.image} alt="" fill sizes="64px" className="object-contain" /></div> : null}<div><strong>{pick.title}</strong><small>{pick.retailer}</small></div></div>
            <label className={styles.pickAudience}>Who can see this pick?
              <select value={rule?.audience ?? "default"} disabled={privacyDisabled} onChange={(event) => { const audience = event.target.value as CrewAudience | "default"; updateEntryRule(pick.id, audience === "default" ? null : { audience, memberIds: rule?.memberIds ?? [], groupIds: rule?.groupIds ?? [] }); }}>
                <option value="default">Use my default</option><option value="everyone">Everyone in my Crew</option><option value="people">Only selected people</option><option value="groups">Only selected groups</option>
              </select>
            </label>
            {rule ? <AudienceTargets rule={rule} onChange={(next) => updateEntryRule(pick.id, next)} members={members} groups={server.groups} prefix={`pick-${pick.id}`} disabled={privacyDisabled} /> : null}
          </div>;
        })}</div> : <p className={styles.emptyTargets}>You have no shared picks yet. <Link href="/account/crew?tab=picks#sharing">Choose picks to share</Link> first; they will use the default audience above.</p>}
      </section> : null}

      {section !== "groups" ? <section className={styles.ticket} aria-label="Save Crew settings">
        {embedded && section === "all" ? discoveryFields : null}
        <div className={styles.saveRow}><div><h2>Ready to save?</h2><p>Changes take effect when you save to your profile. Removing someone from your Crew ends their access immediately.</p></div><div className={styles.saveActions}>{!embedded ? <Link href="/account/crew#crew-intro">Back to Your Crew</Link> : null}<button type="button" disabled={privacyDisabled} onClick={save}>{pending ? "Saving…" : "OK · Save to my profile"}</button></div></div>
        <p role="status" className={pending ? styles.saving : saved && message ? styles.success : undefined}>{pending ? "Privacy settings are temporarily locked while this save finishes." : saved ? message : null}</p>
        {!pending && !saved && message ? <p role="alert" className={styles.error}>{message}</p> : null}
      </section> : null}
    </div>
  </div>;
}
