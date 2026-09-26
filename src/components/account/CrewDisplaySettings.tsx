"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveCrewDisplaySettings, saveCrewGroup } from "@/lib/crew/actions";
import { type CrewAudience, type CrewVisibilityGroup, type CrewVisibilityRule } from "@/lib/crew/visibility";
import styles from "./crew-display-settings.module.css";

type Member = { id: string; name: string };
type Pick = { id: string; title: string; retailer: string; image: string | null };
type Props = {
  available: boolean;
  initialDiscoverable: boolean;
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

function AudienceTargets({ rule, onChange, members, groups, prefix }: {
  rule: CrewVisibilityRule;
  onChange: (rule: CrewVisibilityRule) => void;
  members: Member[];
  groups: CrewVisibilityGroup[];
  prefix: string;
}) {
  if (rule.audience === "everyone") return null;
  const targets = rule.audience === "people" ? members.map((member) => ({ id: member.id, name: member.name })) : groups;
  const selected = rule.audience === "people" ? rule.memberIds : rule.groupIds;
  return <div className={styles.targets} aria-label={rule.audience === "people" ? "Choose Crew members" : "Choose groups"}>
    {targets.length ? targets.map((target) => <label key={target.id} className={styles.target}>
      <input type="checkbox" name={`${prefix}-${target.id}`} checked={selected.includes(target.id)} onChange={() => onChange(rule.audience === "people"
        ? { ...rule, memberIds: toggleId(rule.memberIds, target.id) }
        : { ...rule, groupIds: toggleId(rule.groupIds, target.id) })} />
      <span>{target.name}</span>
    </label>) : <p className={styles.emptyTargets}>{rule.audience === "people" ? "Connect with someone in Your Crew first." : "Create a group below first."}</p>}
  </div>;
}

export function CrewDisplaySettings({ available, initialDiscoverable, initialDefaultRule, initialGroups, initialEntryRules, members, sharedPicks }: Props) {
  const router = useRouter();
  const [discoverable, setDiscoverable] = useState(initialDiscoverable);
  const [defaultRule, setDefaultRule] = useState<CrewVisibilityRule>(initialDefaultRule);
  const [groups, setGroups] = useState<CrewVisibilityGroup[]>(initialGroups);
  const [entryRules, setEntryRules] = useState<Record<string, CrewVisibilityRule>>(initialEntryRules);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMessage, setGroupMessage] = useState("");
  const [groupMessageError, setGroupMessageError] = useState(false);
  const [editorMessage, setEditorMessage] = useState<{ id: string; text: string; error: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const groupToReveal = useRef<string | null>(null);
  const persistedGroupIds = useRef(new Set(initialGroups.map((group) => group.id)));

  useEffect(() => {
    if (!groupToReveal.current) return;
    document.getElementById(`crew-group-${groupToReveal.current}`)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    groupToReveal.current = null;
  }, [groups]);

  function updateEntryRule(id: string, rule: CrewVisibilityRule | null) {
    setSaved(false);
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
    const name = group.name.trim();
    if (!name || name.length > 50 || groups.some((item) => item.id !== group.id && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setEditorMessage({ id: group.id, text: "Give this group a unique name of 1–50 characters.", error: true });
      return;
    }
    startTransition(async () => {
      const result = await saveCrewGroup({ group: { ...group, name }, remove: false });
      setEditorMessage({ id: group.id, text: result.ok ? `${name} saved. You can keep editing it or create another group.` : result.message, error: !result.ok });
      if (result.ok) {
        setGroupMessage("");
        persistedGroupIds.current.add(group.id);
        router.refresh();
      }
    });
  }

  function removeGroup(group: CrewVisibilityGroup) {
    if (!persistedGroupIds.current.has(group.id)) {
      discardGroup(group.id);
      setGroupMessage(`${group.name} removed.`);
      setGroupMessageError(false);
      return;
    }
    startTransition(async () => {
      const result = await saveCrewGroup({ group, remove: true });
      if (result.ok) {
        persistedGroupIds.current.delete(group.id);
        discardGroup(group.id);
        setGroupMessage(`${group.name} removed from your profile.`);
        setGroupMessageError(false);
        router.refresh();
      } else setEditorMessage({ id: group.id, text: result.message, error: true });
    });
  }

  function validate(): string | null {
    const names = groups.map((group) => group.name.trim().toLocaleLowerCase());
    if (groups.some((group) => !group.name.trim() || group.name.trim().length > 50) || new Set(names).size !== names.length) return "Give every group a unique name of 1–50 characters.";
    const validGroupIds = new Set(groups.map((group) => group.id));
    const validMemberIds = new Set(members.map((member) => member.id));
    const rules = [defaultRule, ...Object.values(entryRules)];
    if (rules.some((rule) => rule.memberIds.some((id) => !validMemberIds.has(id)) || rule.groupIds.some((id) => !validGroupIds.has(id)))) return "A selected person or group is no longer available. Review your choices.";
    if (groups.some((group) => group.memberIds.some((id) => !validMemberIds.has(id)))) return "One of your groups includes someone who is no longer in your Crew.";
    if (rules.some((rule) => rule.audience === "people" && rule.memberIds.length === 0)) return "Choose at least one person for each selected-people audience.";
    if (rules.some((rule) => rule.audience === "groups" && rule.groupIds.length === 0)) return "Choose at least one group for each selected-groups audience.";
    return null;
  }

  function save() {
    const problem = validate();
    if (problem) { setMessage(problem); setSaved(false); return; }
    startTransition(async () => {
      const result = await saveCrewDisplaySettings({ discoverable, defaultRule, groups, entryRules });
      setMessage(result.message);
      setSaved(result.ok);
      if (result.ok) {
        persistedGroupIds.current = new Set(groups.map((group) => group.id));
        router.refresh();
      }
    });
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <nav className={styles.crumbs} aria-label="Breadcrumb"><Link href="/account/crew">Your Crew</Link><span aria-hidden="true">›</span><span>How to display my picks</span></nav>
      <header className={styles.heading}><span>YOUR CREW · SHARING CONTROLS</span><h1>How to display my picks</h1><p>Decide who can find you, then choose which approved Crew members see each pick.</p></header>
      {!available ? <p role="alert" className={styles.unavailable}>Sharing settings are temporarily unavailable. Nothing has been changed.</p> : null}

      <section className={styles.ticket} aria-labelledby="discover-title">
        <div className={styles.sectionHead}><span className={styles.step}>01</span><div><h2 id="discover-title">Can people find me?</h2><p>This only controls whether your display name appears in Crew search. It never shares your picks or wallet.</p></div></div>
        <label className={styles.discoveryToggle}><input type="checkbox" checked={discoverable} disabled={!available || pending} onChange={(event) => { setDiscoverable(event.target.checked); setSaved(false); }} /><span><strong>Let other members find my display name in Crew search.</strong><small>Off by default. They still need your approval to join your Crew.</small></span></label>
      </section>

      <section className={styles.ticket} aria-labelledby="default-title">
        <div className={styles.sectionHead}><span className={styles.step}>02</span><div><h2 id="default-title">Who sees my shared picks by default?</h2><p>This applies to picks you share unless you make a different choice for an individual pick below. Nobody outside your approved Crew can see them.</p></div></div>
        <div className={styles.audienceGrid} role="radiogroup" aria-label="Default pick audience">
          {(["everyone", "people", "groups"] as const).map((audience) => <label key={audience} className={styles.audienceOption} data-selected={defaultRule.audience === audience}>
            <input type="radio" name="default-audience" checked={defaultRule.audience === audience} onChange={() => { setDefaultRule(withAudience(defaultRule, audience)); setSaved(false); }} />
            <strong>{audienceLabels[audience]}</strong>
            <small>{audience === "everyone" ? "Every approved Crew connection" : audience === "people" ? "Choose individual connections" : "Use your custom groups"}</small>
          </label>)}
        </div>
        <AudienceTargets rule={defaultRule} onChange={(rule) => { setDefaultRule(rule); setSaved(false); }} members={members} groups={groups} prefix="default" />
      </section>

      <section className={styles.ticket} aria-labelledby="groups-title">
        <div className={styles.sectionHead}><span className={styles.step}>03</span><div><h2 id="groups-title">Make your own groups</h2><p>Create several groups—Family, Friends, or any name you choose—and decide which approved Crew members belong in each.</p></div></div>
        <div className={styles.groupArea}>
          <div className={styles.groupListHeading}><strong>Your groups</strong><span>{groups.length} {groups.length === 1 ? "group" : "groups"}</span></div>
          {groups.length ? <div className={styles.groupList}>{groups.map((group) => {
            const expanded = expandedGroupId === group.id;
            return <div id={`crew-group-${group.id}`} key={group.id} className={styles.groupRow}>
              <div className={styles.groupSummary}><div><strong>{group.name}</strong><small>{group.memberIds.length} {group.memberIds.length === 1 ? "person" : "people"}</small></div><button type="button" disabled={pending} aria-expanded={expanded} aria-controls={`crew-group-editor-${group.id}`} onClick={() => setExpandedGroupId(expanded ? null : group.id)}>{expanded ? "Close editor" : "Edit group"}</button></div>
              {expanded ? <div id={`crew-group-editor-${group.id}`} className={styles.groupEditor}>
                <label className={styles.groupName}>Group name<input value={group.name} maxLength={50} disabled={!available || pending} onChange={(event) => { setGroups((current) => current.map((item) => item.id === group.id ? { ...item, name: event.target.value } : item)); setSaved(false); }} /></label>
                <div className={styles.memberEditor}>
                  <div className={styles.memberPickerHeading}><strong>People in this group</strong><span>{group.memberIds.length ? "Use Remove to take someone out of this group." : "No one added yet."}</span></div>
                  {group.memberIds.length ? <div className={styles.memberChips}>{group.memberIds.map((id) => {
                    const member = members.find((item) => item.id === id);
                    return <span className={styles.memberChip} key={id}>{member?.name ?? "Former member"}<button type="button" disabled={!available || pending} onClick={() => { setGroups((current) => current.map((item) => item.id === group.id ? { ...item, memberIds: item.memberIds.filter((value) => value !== id) } : item)); setSaved(false); }} aria-label={`Remove ${member?.name ?? "former member"} from ${group.name}`}>Remove</button></span>;
                  })}</div> : null}
                  <div className={styles.memberPickerHeading}><strong>Add people</strong><span>Choose approved Crew members.</span></div>
                  <div className={styles.targets}>{members.length ? members.filter((member) => !group.memberIds.includes(member.id)).map((member) => <button type="button" key={member.id} className={styles.addMember} disabled={!available || pending} onClick={() => { setGroups((current) => current.map((item) => item.id === group.id ? { ...item, memberIds: [...item.memberIds, member.id] } : item)); setSaved(false); }}>+ Add {member.name}</button>) : <span className={styles.emptyTargets}>No approved Crew members yet. You can name this group now and add people after they accept an invitation.</span>}</div>
                </div>
                <div className={styles.groupActions}><button type="button" className={styles.removeGroup} onClick={() => removeGroup(group)} disabled={!available || pending}>Remove group</button><button type="button" className={styles.saveGroup} onClick={() => saveGroup(group)} disabled={!available || pending}>{pending ? "Saving…" : "Save group"}</button></div>
                {editorMessage?.id === group.id ? <p role={editorMessage.error ? "alert" : "status"} className={editorMessage.error ? styles.groupError : styles.groupSaved}>{editorMessage.text}</p> : <p className={styles.groupHint}>Add or remove people, then choose Save group to apply this group’s changes.</p>}
              </div> : null}
            </div>;
          })}</div> : <p className={styles.emptyGroup}>No groups yet. Create a name below; it will open here so you can add people.</p>}
          {groupMessage ? <p role={groupMessageError ? "alert" : "status"} className={styles.groupNotice} data-error={groupMessageError}>{groupMessage}</p> : null}
          <div className={styles.addGroup}><label htmlFor="new-crew-group">New group name</label><div><input id="new-crew-group" value={newGroupName} maxLength={50} disabled={!available || pending} placeholder="Family, Friends, or your own name" onChange={(event) => setNewGroupName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addGroup(); } }} /><button type="button" onClick={addGroup} disabled={!available || pending}>+ Create group</button></div></div>
        </div>
      </section>

      <section className={styles.ticket} aria-labelledby="picks-title">
        <div className={styles.sectionHead}><span className={styles.step}>04</span><div><h2 id="picks-title">Choose who sees what</h2><p>Each pick can use your default, selected people, or one or more of your groups. Only picks you explicitly share appear here.</p></div></div>
        {sharedPicks.length ? <div className={styles.pickGrid}>{sharedPicks.map((pick) => {
          const rule = entryRules[pick.id];
          return <div className={styles.pickCard} key={pick.id}>
            <div className={styles.pickTitle}>{pick.image ? <div className={styles.pickImage}><Image src={pick.image} alt="" fill sizes="64px" className="object-contain" /></div> : null}<div><strong>{pick.title}</strong><small>{pick.retailer}</small></div></div>
            <label className={styles.pickAudience}>Who can see this pick?
              <select value={rule?.audience ?? "default"} disabled={!available || pending} onChange={(event) => { const audience = event.target.value as CrewAudience | "default"; updateEntryRule(pick.id, audience === "default" ? null : { audience, memberIds: rule?.memberIds ?? [], groupIds: rule?.groupIds ?? [] }); }}>
                <option value="default">Use my default</option><option value="everyone">Everyone in my Crew</option><option value="people">Only selected people</option><option value="groups">Only selected groups</option>
              </select>
            </label>
            {rule ? <AudienceTargets rule={rule} onChange={(next) => updateEntryRule(pick.id, next)} members={members} groups={groups} prefix={`pick-${pick.id}`} /> : null}
          </div>;
        })}</div> : <p className={styles.emptyTargets}>You have no shared picks yet. <Link href="/account/crew?tab=picks#sharing">Choose picks to share</Link> first; they will use the default audience above.</p>}
      </section>

      <section className={styles.ticket} aria-label="Save Crew settings"><div className={styles.saveRow}><div><h2>Ready to save?</h2><p>Changes take effect when you save to your profile. Removing someone from your Crew ends their access immediately.</p></div><div className={styles.saveActions}><Link href="/account/crew">Back to Your Crew</Link><button type="button" disabled={!available || pending} onClick={save}>{pending ? "Saving…" : "OK · Save to my profile"}</button></div></div>{message ? <p role={saved ? "status" : "alert"} className={saved ? styles.success : styles.error}>{message}</p> : null}</section>
    </div>
  </main>;
}
