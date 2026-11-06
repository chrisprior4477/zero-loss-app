"use client";
import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OwnCrewEntry } from "@/app/account/crew/page";
import type { CrewVisibilityGroup, CrewVisibilityRule } from "@/lib/crew/visibility";
import { cleanupCutoff, entrySharedInScope, type SharingSelection } from "@/lib/crew/sharing-management";
import { cleanupCrewShares, shareOwnedCrewEntry, undoCrewShareCleanup, type SharingResult } from "@/lib/crew/sharing-actions";
import { CrewSharingDialog } from "./CrewSharingDialog";
import { useAccountTimeZone } from "./TimeZoneProvider";
import styles from "./crew-shared-picks.module.css";

type Props = { entries: OwnCrewEntry[]; groups: CrewVisibilityGroup[]; defaultRule: CrewVisibilityRule; rules: Record<string, CrewVisibilityRule>; available: boolean; onPrivacy: () => void };
type Operation = { id: string; selection: SharingSelection; label: string };
const ages = [[15, "15 days"], [30, "30 days"], [60, "60 days"], [90, "90 days"], [180, "6 months"], [0, "All time"]] as const;
function TrashIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CrewSharedPicks({ entries, groups, defaultRule, rules, available, onPrivacy }: Props) {
  const router = useRouter();
  const timeZone = useAccountTimeZone();
  const [audience, setAudience] = useState<"crew" | "groups">("crew");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const group = groups.find(g => g.id === groupId) ?? groups[0];
  const scope = audience === "crew" ? "crew" : group?.id ?? "";
  const label = audience === "crew" ? "My Crew" : group?.name ?? "Choose a group";
  const [sharedOnly, setSharedOnly] = useState(true);
  const [visible, setVisible] = useState(5);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entryLimit, setEntryLimit] = useState(5);
  const [picker, setPicker] = useState(false);
  const [cleanup, setCleanup] = useState<"choose" | "review" | null>(null);
  const [days, setDays] = useState(30);
  const [before, setBefore] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [retry, setRetry] = useState<Operation | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const listTop = useRef<HTMLHeadingElement>(null);
  const isShared = (entry: OwnCrewEntry) => entrySharedInScope(entry, scope, defaultRule, rules);
  const buckets = useMemo(() => {
    const map = new Map<string, OwnCrewEntry[]>();
    for (const entry of entries) {
      const key = entry.offeringSlug ?? entry.title;
      const bucket = map.get(key) ?? []; bucket.push(entry); map.set(key, bucket);
    }
    return [...map.entries()];
  }, [entries]);
  const shown = buckets.map(([key, all]) => ({ key, all, rows: all.filter(e => isShared(e) || !sharedOnly && !e.shared) })).filter(b => b.rows.length);
  const candidates = entries.filter(e => isShared(e) && (!before || e.sharedAt && e.sharedAt < before));
  const previewBefore = cleanup === "review" ? before : cleanupCutoff(days);
  const previewMatches = entries.filter(e => isShared(e) && (!previewBefore || e.sharedAt && e.sharedAt < previewBefore));
  const selectedAge = days === 0 ? "All time" : days === 180 ? "Older than six months" : `Older than ${days} days`;

  function resetList() { setVisible(5); setExpanded(null); setEntryLimit(5); }
  function feedback(result: SharingResult) { setMessage(result.message); setError(!result.ok); }
  function stop(operation: Operation) {
    if (inFlight.current || !available) return;
    inFlight.current = true; setMessage(""); setRetry(null);
    startTransition(async () => {
      try {
        const result = await cleanupCrewShares(operation.id, operation.selection);
        feedback({ ...result, message: result.ok && result.count ? `${result.message} Audience: ${operation.label}.` : result.message });
        if (result.ok) { setUndoId(result.undoId ?? null); setCleanup(null); router.refresh(); }
        else setRetry(operation);
      } catch { setMessage("We couldn’t confirm cleanup. Retry checks the same request safely."); setError(true); setRetry(operation); }
      finally { inFlight.current = false; }
    });
  }
  function stopSelection(selection: SharingSelection) { stop({ id: crypto.randomUUID(), selection, label }); }
  function restore() {
    if (!undoId || inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try { const result = await undoCrewShareCleanup(undoId); feedback(result); if (result.ok) { setUndoId(null); router.refresh(); } }
      catch { setError(true); setMessage("Couldn’t confirm Undo. Try again."); }
      finally { inFlight.current = false; }
    });
  }
  function share(entryId: string) {
    if (inFlight.current || !available) return;
    inFlight.current = true;
    startTransition(async () => {
      try { const result = await shareOwnedCrewEntry(entryId, scope); feedback(result); if (result.ok) router.refresh(); }
      catch { setError(true); setMessage("Couldn’t confirm sharing. Refresh before trying again."); }
      finally { inFlight.current = false; }
    });
  }
  const disabled = pending || !available || !scope;
  const status = message ? <div className={error ? styles.error : styles.notice} role={error ? "alert" : "status"}>
    <p>{message}</p><div>{undoId ? <button type="button" disabled={pending} onClick={restore}>Undo</button> : null}
      {retry ? <button type="button" disabled={pending} onClick={() => stop(retry)}>Retry cleanup</button> : null}</div>
  </div> : null;
  return <section className={styles.root} id="sharing" aria-labelledby="my-shared-picks-heading">
    <h2 id="my-shared-picks-heading" ref={listTop}>My Shared Picks</h2>
    <div className={styles.tabs} role="group" aria-label="Sharing audience">
      <button type="button" aria-pressed={audience === "crew"} disabled={pending} onClick={() => { setAudience("crew"); resetList(); }}>My Crew</button>
      <button type="button" aria-pressed={audience === "groups"} disabled={pending} onClick={() => { setAudience("groups"); resetList(); }}>My groups</button>
    </div>
    {audience === "groups" ? groups.length ? <div className={styles.groupPicker}>
      <label htmlFor="shared-pick-group">Choose a group</label>
      <select id="shared-pick-group" className={styles.desktopPicker} value={group?.id ?? ""} disabled={pending} onChange={e => { setGroupId(e.target.value); resetList(); }}>
        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <button className={styles.mobilePicker} type="button" disabled={pending} aria-haspopup="dialog" onClick={() => setPicker(true)}>{label}<span aria-hidden="true">⌄</span></button>
    </div> : <p>Create a saved group in Your Crew to manage its shared picks here.</p>
      : <p className={styles.intro}>Picks shared with your whole Crew or individually chosen people. Group-only picks are under My groups.</p>}
    <div className={styles.toolbar}>
      <label><input type="checkbox" checked={sharedOnly} onChange={e => { setSharedOnly(e.target.checked); resetList(); }} /> Shared only</label>
      <button type="button" disabled={disabled} onClick={() => { setCleanup("choose"); setBefore(undefined); }}>Clean up sharing</button>
    </div>
    {status}
    <div className={styles.list}>
      {shown.slice(0, visible).map(({ key, all, rows }) => {
        const item = all[0], sharedCount = all.filter(isShared).length, open = expanded === key;
        return <div key={key} className={styles.stack} data-stacked={all.length > 1}>
          {all.length > 1 ? <span className={styles.thirdLayer} aria-hidden="true" /> : null}
          <article className={styles.ticket}>
            <div className={styles.prize}>
              <div className={styles.image}>{item.image ? <Image src={item.image} alt="" fill sizes="64px" className="object-contain p-1" /> : <span aria-hidden="true">Ø</span>}</div>
              <div className={styles.description}><h3>{item.title}</h3><div className={styles.summary}><p>{all.length} {all.length === 1 ? "entry" : "entries"} · {sharedCount} shared to {label}</p>
                <button type="button" className={styles.trash} disabled={disabled || !sharedCount || !item.offeringSlug} aria-label={`Stop sharing all ${item.title} entries with ${label}`} title={`Stop sharing this prize with ${label}`} onClick={() => stopSelection({ scope, offeringSlug: item.offeringSlug })}><TrashIcon /></button>
              </div></div>
            </div>
            <button type="button" className={styles.expand} aria-expanded={open} onClick={() => { setExpanded(open ? null : key); setEntryLimit(5); }}>
              <span>{open ? "Close entries" : "View entries"} <strong>{rows.length}</strong></span><span aria-hidden="true">{open ? "−" : "+"}</span>
            </button>
            {open ? <div className={styles.entries}>
              {rows.slice(0, entryLimit).map(entry => <div key={entry.id} className={styles.entry}>
                <div><strong>Entry {all.findIndex(e => e.id === entry.id) + 1}</strong><button type="button" disabled={disabled} onClick={() => isShared(entry) ? stopSelection({ scope, entryId: entry.id }) : share(entry.id)}>{isShared(entry) ? "Stop sharing" : "Share here"}</button></div>
                <p>{isShared(entry) ? `Shared ${entry.sharedAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(new Date(entry.sharedAt)) : "previously"} · ${label}` : "Private · choose Share here to share with this audience"}</p>
              </div>)}
              {rows.length > entryLimit ? <button type="button" onClick={() => setEntryLimit(n => n + 5)}>Show more entries · {rows.length - entryLimit} remaining</button> : null}
              {entryLimit > 5 ? <button type="button" onClick={() => setEntryLimit(5)}>Close to first five entries</button> : null}
              <button type="button" className={styles.orange} disabled={disabled || !sharedCount || !item.offeringSlug} onClick={() => stopSelection({ scope, offeringSlug: item.offeringSlug })}>Stop Sharing All</button>
            </div> : null}
          </article>
        </div>;
      })}
    </div>
    {!shown.length ? <p className={styles.empty}>{sharedOnly ? "No shared picks in this view. Turn off Shared only to see your private entries." : "You don’t have entries to share in this view yet."}</p> : null}
    {shown.length > visible ? <button type="button" className={styles.orange} onClick={() => setVisible(n => n + 5)}>Show more · {shown.length - visible} prizes</button> : null}
    {visible > 5 ? <button type="button" className={styles.blue} onClick={() => { resetList(); listTop.current?.scrollIntoView({ block: "start" }); }}>Close to first five</button> : null}
    <button type="button" className={styles.privacy} onClick={onPrivacy}>Privacy Settings · choose who sees your picks</button>
    {picker ? <CrewSharingDialog title="Choose a group" onClose={() => setPicker(false)}>
      <div className={styles.mobileGroupList} role="group" aria-label="Your saved groups">{groups.map(g => <button type="button" key={g.id} aria-pressed={g.id === group?.id} onClick={() => { setGroupId(g.id); resetList(); setPicker(false); }}>{g.name}<span>{g.memberIds.length} connected {g.memberIds.length === 1 ? "person" : "people"}</span></button>)}</div>
    </CrewSharingDialog> : null}
    {cleanup ? <CrewSharingDialog title={cleanup === "choose" ? "Clean up sharing" : "Review cleanup"} onClose={() => { if (!pending) setCleanup(null); }}>
      <div className={styles.cleanup}>
        <div className={styles.scope}><small>CLEAN UP SHARING TO</small><h3>{label}</h3></div>
        {cleanup === "choose" ? <><h3>Stop sharing older picks</h3><p>Choose how long ago they were shared.</p><div className={styles.ages}>{ages.map(([age, text]) => <button type="button" key={age} aria-pressed={days === age} onClick={() => setDays(age)}>{text}</button>)}</div><p><strong>{selectedAge}</strong><br />{previewMatches.length} {previewMatches.length === 1 ? "entry matches" : "entries match"}.</p></>
          : <><p><strong>{selectedAge}</strong><br />Stop sharing {candidates.length} {candidates.length === 1 ? "entry" : "entries"} with {label}?</p><div className={styles.reviewList}>{buckets.map(([key, all]) => { const count = candidates.filter(e => all.some(a => a.id === e.id)).length; return count ? <p key={key}><span>{all[0].title}</span><strong>{count}</strong></p> : null; })}</div></>}
        <p className={styles.explanation}>Your tickets, offers, rewards, and saved groups stay. Other sharing audiences stay as they are.</p>
        {status}
        <button className={styles.orange} type="button" disabled={disabled || !previewMatches.length} onClick={() => cleanup === "choose" ? (setBefore(cleanupCutoff(days)), setCleanup("review")) : stopSelection({ scope, before })}>{cleanup === "choose" ? "Review cleanup" : `Stop sharing ${candidates.length} ${candidates.length === 1 ? "entry" : "entries"}`}</button>
        <button type="button" disabled={pending} onClick={() => cleanup === "choose" ? setCleanup(null) : setCleanup("choose")}>{cleanup === "choose" ? "Cancel" : "Change selection"}</button>
      </div>
    </CrewSharingDialog> : null}
  </section>;
}
