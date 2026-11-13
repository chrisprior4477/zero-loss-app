"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OwnCrewEntry } from "@/app/account/crew/page";
import type { CrewVisibilityGroup, CrewVisibilityRule } from "@/lib/crew/visibility";
import { cleanupCutoff, entrySharedAtInScope, entrySharedInScope, type SharingSelection } from "@/lib/crew/sharing-management";
import { cleanupCrewShares, shareOwnedCrewEntry, undoCrewShareCleanup, type SharingResult } from "@/lib/crew/sharing-actions";
import { CrewSharingDialog } from "./CrewSharingDialog";
import { useAccountTimeZone } from "./TimeZoneProvider";
import styles from "./crew-shared-picks.module.css";

type Props = { ownerId?: string; entries: OwnCrewEntry[]; groups: CrewVisibilityGroup[]; defaultRule: CrewVisibilityRule; rules: Record<string, CrewVisibilityRule>; available: boolean; onPrivacy: () => void };
type Operation = { id: string; selection: SharingSelection; label: string };
const ages = [[15, "15 days"], [30, "30 days"], [60, "60 days"], [90, "90 days"], [180, "6 months"], [0, "All time"]] as const;
function TrashIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CrewSharedPicks({ ownerId, entries, groups, defaultRule, rules, available, onPrivacy }: Props) {
  const router = useRouter();
  const timeZone = useAccountTimeZone();
  const [selectedScope, setSelectedScope] = useState(() => {
    if (entries.some(entry => entrySharedInScope(entry, "crew", defaultRule, rules))) return "crew";
    return groups.find(group => entries.some(entry => entrySharedInScope(entry, group.id, defaultRule, rules)))?.id ?? "crew";
  });
  const group = groups.find(g => g.id === selectedScope);
  const scope = group?.id ?? "crew";
  const scopeAvailable = scope === "crew" || Boolean(group);
  const label = scope === "crew" ? "Your Crew" : group?.name ?? "Unavailable group";
  const [sharedOnly, setSharedOnly] = useState(true);
  const [visible, setVisible] = useState(5);
  const [expandedByScope, setExpandedByScope] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [retry, setRetry] = useState<Operation | null>(null);
  const expanded = expandedByScope[scope] ?? null;
  const storageKey = ownerId ? `zero-loss-crew-picks:${ownerId}` : null;
  function writePreference(key: string, value: unknown) {
    if (!storageKey) return;
    try { sessionStorage.setItem(`${storageKey}:${key}`, JSON.stringify(value)); }
    catch { /* Storage is optional. */ }
  }
  useEffect(() => {
    if (!storageKey) return;
    try {
      const audience = JSON.parse(sessionStorage.getItem(`${storageKey}:scope`) ?? "null");
      const shared = JSON.parse(sessionStorage.getItem(`${storageKey}:shared-only`) ?? "null");
      const stacks = JSON.parse(sessionStorage.getItem(`${storageKey}:expanded`) ?? "null");
      // Browser storage is read after hydration so the first render matches the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (typeof audience === "string") setSelectedScope(audience);
      if (typeof shared === "boolean") setSharedOnly(shared);
      if (stacks && typeof stacks === "object" && !Array.isArray(stacks)) setExpandedByScope(stacks);
      const saved = JSON.parse(sessionStorage.getItem(`${storageKey}:operation`) ?? "null");
      if (saved?.operation?.id && saved.operation.selection?.scope) {
        if (saved.undoId === saved.operation.id && Date.now() < saved.undoUntil) {
          setUndoId(saved.undoId);
          setMessage(saved.message);
        } else if (!saved.undoId) {
          setRetry(saved.operation);
          setMessage("Check the cleanup request before starting another.");
        }
      }
    } catch { /* The default Crew view remains usable. */ }
  }, [storageKey]);
  const [entryLimit, setEntryLimit] = useState(5);
  const [picker, setPicker] = useState(false);
  const [cleanup, setCleanup] = useState<"choose" | "review" | null>(null);
  const [cleanupAudience, setCleanupAudience] = useState<{ scope: string; label: string } | null>(null);
  const [days, setDays] = useState(30);
  const [review, setReview] = useState<{ before?: string; entries: OwnCrewEntry[] } | null>(null);
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
  const cleanupScope = cleanupAudience?.scope ?? scope;
  const cleanupLabel = cleanupAudience?.label ?? label;
  const cleanupAvailable = cleanupScope === "crew" || groups.some(g => g.id === cleanupScope);
  const previewBefore = cleanupCutoff(days);
  const previewMatches = entries.filter(entry => {
    if (!entrySharedInScope(entry, cleanupScope, defaultRule, rules)) return false;
    const sharedAt = entrySharedAtInScope(entry, cleanupScope);
    return !previewBefore || Boolean(sharedAt && Date.parse(sharedAt) < Date.parse(previewBefore));
  });
  const candidates = review?.entries ?? [];
  const reviewCounts = new Map<string, { title: string; count: number }>();
  for (const entry of candidates) {
    const key = entry.offeringSlug ?? entry.title;
    reviewCounts.set(key, { title: entry.title, count: (reviewCounts.get(key)?.count ?? 0) + 1 });
  }
  const selectedAge = days === 0 ? "All time" : days === 180 ? "Older than six months" : `Older than ${days} days`;

  function resetList() { setVisible(5); setEntryLimit(5); }
  function selectScope(next: string) {
    setSelectedScope(next); writePreference("scope", next); resetList();
  }
  function toggleStack(next: string | null) {
    const stacks = { ...expandedByScope, [scope]: next };
    setExpandedByScope(stacks); writePreference("expanded", stacks); setEntryLimit(5);
  }
  function feedback(result: SharingResult) { setMessage(result.message); setError(!result.ok); }
  function stop(operation: Operation) {
    if (inFlight.current || !available) return;
    inFlight.current = true; setMessage(""); setRetry(null); setUndoId(null);
    writePreference("operation", { operation });
    startTransition(async () => {
      try {
        const result = await cleanupCrewShares(operation.id, operation.selection);
        feedback({ ...result, message: result.ok && result.count ? `${result.message} Audience: ${operation.label}.` : result.message });
        if (result.ok) {
          setUndoId(result.undoId ?? null);
          writePreference("operation", result.undoId ? { operation, undoId: result.undoId, undoUntil: Date.now() + 86_400_000, message: `${result.message} Audience: ${operation.label}.` } : null);
          setCleanup(null); router.refresh();
        }
        else setRetry(operation);
      } catch { setMessage("We couldn’t confirm cleanup. Retry checks the same request safely."); setError(true); setRetry(operation); }
      finally { inFlight.current = false; }
    });
  }
  function stopSelection(selection: SharingSelection, audienceLabel = label) { stop({ id: crypto.randomUUID(), selection, label: audienceLabel }); }
  function restore() {
    if (!undoId || inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try { const result = await undoCrewShareCleanup(undoId); feedback(result); if (result.ok) { setUndoId(null); writePreference("operation", null); router.refresh(); } }
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
  const disabled = pending || !available || !scopeAvailable;
  const status = message ? <div className={error ? styles.error : styles.notice} role={error ? "alert" : "status"}>
    <p>{message}</p><div>{undoId ? <button type="button" disabled={pending} onClick={restore}>Undo</button> : null}
      {retry ? <button type="button" disabled={pending} onClick={() => stop(retry)}>Retry cleanup</button> : null}</div>
  </div> : null;
  return <section className={styles.root} id="sharing" aria-labelledby="my-shared-picks-heading">
    <div className={styles.sectionHeading}>
      <h2 id="my-shared-picks-heading" ref={listTop}>My Shared Picks Cleanup</h2>
      <button type="button" className={styles.privacy} onClick={onPrivacy}>Privacy Settings</button>
    </div>
    <div className={styles.groupPicker}>
      <label id="shared-with-label" htmlFor="shared-pick-group">Shared with</label>
      <select id="shared-pick-group" className={styles.desktopPicker} value={scope} disabled={pending} onChange={e => { selectScope(e.target.value); }}>
        <option value="crew">Your Crew</option>
        {!scopeAvailable ? <option value={scope} disabled>Unavailable group</option> : null}
        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <button className={styles.mobilePicker} type="button" disabled={pending} aria-haspopup="dialog" aria-labelledby="shared-with-label shared-with-value" onClick={() => setPicker(true)}><span id="shared-with-value">{label}</span><span aria-hidden="true">⌄</span></button>
    </div>
    <p className={styles.intro}>{scope === "crew" ? "Picks shared with your whole Crew or individually chosen people." : `Picks shared with ${label}. Cleanup applies only to this group.`}</p>
    {!scopeAvailable ? <p role="alert">That group is no longer available. Choose another audience to continue.</p> : null}
    <div className={styles.toolbar}>
      <label><input type="checkbox" checked={sharedOnly} onChange={e => { setSharedOnly(e.target.checked); writePreference("shared-only", e.target.checked); resetList(); }} /> Shared only</label>
      <button type="button" disabled={disabled} onClick={() => { setCleanupAudience({ scope, label }); setCleanup("choose"); setReview(null); }}>Clean up sharing</button>
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
            <button type="button" className={styles.expand} aria-expanded={open} onClick={() => { toggleStack(open ? null : key); }}>
              <span>{open ? "Close entries" : "View entries"} <strong>{rows.length}</strong></span><span aria-hidden="true">{open ? "−" : "+"}</span>
            </button>
            {open ? <div className={styles.entries}>
              {rows.slice(0, entryLimit).map(entry => {
                const sharedAt = entrySharedAtInScope(entry, scope);
                return <div key={entry.id} className={styles.entry}>
                <div><strong>Entry {all.findIndex(e => e.id === entry.id) + 1}</strong><button type="button" disabled={disabled} onClick={() => isShared(entry) ? stopSelection({ scope, entryId: entry.id }) : share(entry.id)}>{isShared(entry) ? "Stop sharing" : "Share here"}</button></div>
                <p>{isShared(entry) ? `Shared ${sharedAt ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone }).format(new Date(sharedAt)) : "previously"} · ${label}` : "Private · choose Share here to share with this audience"}</p>
              </div>; })}
              {rows.length > entryLimit ? <button type="button" onClick={() => setEntryLimit(n => n + 5)}>Show more entries · {rows.length - entryLimit} remaining</button> : null}
              {entryLimit > 5 ? <button type="button" onClick={() => setEntryLimit(5)}>Close to first five entries</button> : null}
              <button type="button" className={styles.orange} disabled={disabled || !sharedCount || !item.offeringSlug} onClick={() => stopSelection({ scope, offeringSlug: item.offeringSlug })}>Stop Sharing All</button>
            </div> : null}
          </article>
        </div>;
      })}
    </div>
    {!shown.length ? <p className={styles.empty}>{sharedOnly ? "No shared picks in this view. Turn off Shared only to see your private entries." : "You don’t have entries to share in this view yet."}</p> : null}
    {shown.length > visible ? <button type="button" className={styles.orange} onClick={() => setVisible(n => n + 5)}>Show more · {shown.length - visible} {shown.length - visible === 1 ? "prize" : "prizes"}</button> : null}
    {visible > 5 ? <button type="button" className={styles.blue} onClick={() => { resetList(); listTop.current?.scrollIntoView({ block: "start" }); }}>Close to first five</button> : null}
    {picker ? <CrewSharingDialog title="Shared with" onClose={() => setPicker(false)}>
      <div className={styles.mobileGroupList} role="group" aria-label="Sharing audiences">
        <button type="button" aria-pressed={scope === "crew"} onClick={() => { selectScope("crew"); setPicker(false); }}>Your Crew<span>Whole Crew or individually chosen people</span></button>
        {groups.map(g => <button type="button" key={g.id} aria-pressed={g.id === scope} onClick={() => { selectScope(g.id); setPicker(false); }}>{g.name}<span>{g.memberIds.length} connected {g.memberIds.length === 1 ? "person" : "people"}</span></button>)}
      </div>
    </CrewSharingDialog> : null}
    {cleanup ? <CrewSharingDialog title={cleanup === "choose" ? "Clean up sharing" : "Review cleanup"} onClose={() => { if (!pending) setCleanup(null); }}>
      <div className={styles.cleanup}>
        <div className={styles.scope}><small>CLEAN UP SHARING TO</small><h3>{cleanupLabel}</h3></div>
        {!cleanupAvailable ? <p role="alert">This group is no longer available. Nothing will be cleaned up. Close this review and choose a current audience.</p> : null}
        {cleanup === "choose" ? <><h3>Stop sharing older picks</h3><p>Choose how long ago they were shared.</p><div className={styles.ages}>{ages.map(([age, text]) => <button type="button" key={age} aria-pressed={days === age} onClick={() => setDays(age)}>{text}</button>)}</div><p><strong>{selectedAge}</strong><br />{previewMatches.length} {previewMatches.length === 1 ? "entry matches" : "entries match"}.</p></>
          : <><p><strong>{selectedAge}</strong><br />Stop sharing {candidates.length} {candidates.length === 1 ? "entry" : "entries"} with {cleanupLabel}?</p><div className={styles.reviewList}>{Array.from(reviewCounts, ([key, { title, count }]) => <p key={key}><span>{title}</span><strong>{count}</strong></p>)}</div></>}
        <p className={styles.explanation}>Your tickets, offers, rewards, and saved groups stay. Other sharing audiences stay as they are.</p>
        {status}
        <button className={styles.orange} type="button" disabled={disabled || !cleanupAvailable || !(cleanup === "choose" ? previewMatches : candidates).length} onClick={() => {
          if (!cleanupAvailable) return;
          if (cleanup === "choose") { setReview({ before: previewBefore, entries: previewMatches }); setCleanup("review"); }
          else if (review) stopSelection({ scope: cleanupScope, before: review.before, reviewedEntryIds: review.entries.map(entry => entry.id) }, cleanupLabel);
        }}>{cleanup === "choose" ? "Review cleanup" : `Stop sharing ${candidates.length} ${candidates.length === 1 ? "entry" : "entries"}`}</button>
        <button type="button" disabled={pending} onClick={() => !cleanupAvailable || cleanup === "choose" ? setCleanup(null) : setCleanup("choose")}>{!cleanupAvailable ? "Close review" : cleanup === "choose" ? "Cancel" : "Change selection"}</button>
      </div>
    </CrewSharingDialog> : null}
  </section>;
}
