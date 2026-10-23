"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { getCrewShareOptions, inviteToCrew, inviteToCrewById, inviteToCrewByPhone, saveCrewGroup, searchCrewByName, shareConfirmedEntryWithCrew, sharePrizeWithCrew, type CrewSearchPerson, type CrewShareOptions } from "@/lib/crew/actions";
import { getProductShareItem } from "@/lib/sharing/actions";
import { crewLookupKind, emailHref, isAppleMobile, messageHref, productShareText, productShareUrl, type ProductShareItem } from "@/lib/sharing/product-share";
import type { EntryRequest } from "@/lib/entries/request";
import { ShareIcon } from "./ShareIcon";
import styles from "./post-entry-crew-toast.module.css";

type Step = "home" | "send" | "messages" | "email" | "crew" | "find" | "audience" | "group" | "copy";
type Props = { onClose: () => void; focusOnOpen?: boolean } & ({ request: EntryRequest; product?: ProductShareItem } | { request?: undefined; product: ProductShareItem });
const emptyOptions: CrewShareOptions = { ok: true, message: "", memberCount: 0, members: [], groups: [] };

export function PostEntryCrewToast({ request, product, onClose, focusOnOpen = false }: Props) {
  const initialItem = product ?? { slug: request!.slug, title: request!.title };
  const [item, setItem] = useState<ProductShareItem>(initialItem);
  const [step, setStep] = useState<Step>("home");
  const history = useRef<Step[]>([]);
  const [origin] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
  const [options, setOptions] = useState<CrewShareOptions | null>(null);
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [shared, setShared] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [people, setPeople] = useState<CrewSearchPerson[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const groupId = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const previousStep = useRef<Step | null>(null);
  const id = useId();
  const url = origin ? productShareUrl(origin, item.slug) : `/items/${item.slug}`;
  const text = productShareText(item.title);
  const body = `${text}\n${url}`;
  const members = options?.members ?? [];
  const selectedGroup = options?.groups.find(group => group.id === audience);
  const recipientCount = audience ? selectedGroup?.memberCount ?? 0 : options?.memberCount ?? 0;

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    if (!product?.image) void getProductShareItem(initialItem.slug).then(value => { if (!cancelled && value) setItem(value); }).catch(() => { /* The public picture link remains usable. */ });
    return () => { cancelled = true; alive.current = false; };
  }, [initialItem.slug, product?.image]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  useEffect(() => {
    if ((previousStep.current === null && focusOnOpen) || (previousStep.current !== null && previousStep.current !== step)) {
      if (paper.current) paper.current.scrollTop = 0;
      heading.current?.focus({ preventScroll: true });
    }
    previousStep.current = step;
  }, [step, focusOnOpen]);

  function feedback(value: string, failed = false) { setMessage(value); setError(failed); }
  function go(next: Step) { history.current.push(step); setStep(next); feedback(""); }
  function back() { setStep(history.current.pop() ?? "home"); feedback(""); }
  async function run(work: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); feedback("");
    try { await work(); }
    catch { if (alive.current) feedback("We couldn’t confirm that action. Please try again. Your entry is unchanged.", true); }
    finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }

  async function nativeShare() {
    if (busyRef.current) return;
    if (!navigator.share) { go("send"); return; }
    // Invoke directly from the tap: a preceding server read would lose activation.
    busyRef.current = true; setBusy(true); feedback("");
    try {
      await navigator.share({ title: item.title, text, url: productShareUrl(window.location.origin, item.slug) });
      // Handoff is not proof of delivery. Never report "sent" here.
    } catch (reason) {
      if ((reason as { name?: string })?.name !== "AbortError" && alive.current) {
        go("send"); feedback("Your browser couldn’t open sharing. Use Messages, Email, or Copy link instead.");
      }
    } finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(productShareUrl(window.location.origin, item.slug));
      if (alive.current) feedback("Link copied. Paste it into your conversation.");
    } catch {
      if (alive.current) { if (step !== "copy") go("copy"); feedback("Select and copy the link below. Automatic copying isn’t available in this browser."); }
    }
  }

  async function loadAudiences() {
    go("audience");
    await run(async () => {
      const result = await getCrewShareOptions();
      if (!alive.current) return;
      if (result.ok) setOptions(result); else feedback(result.message, true);
    });
  }

  function search() {
    const clean = query.trim();
    const kind = crewLookupKind(clean);
    setPeople([]); setReviewQuery(""); feedback("");
    if (kind !== "name") {
      if (kind === "email" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254)
        || kind === "phone" && !/^\d{10,15}$/.test(clean.replace(/\D/g, ""))) {
        feedback(kind === "email" ? "Enter a valid email address." : "Enter a phone number with its country code.", true); return;
      }
      setReviewQuery(clean); return;
    }
    void run(async () => {
      const result = await searchCrewByName(clean);
      if (!alive.current) return;
      setPeople(result.people); feedback(result.message, !result.ok);
    });
  }

  async function addPerson(value: string, kind: "id" | "email" | "phone") {
    await run(async () => {
      const result = kind === "id" ? await inviteToCrewById(value) : kind === "email" ? await inviteToCrew(value) : await inviteToCrewByPhone(value);
      if (!alive.current) return;
      feedback(result.message, !result.ok);
      if (result.ok) setRequested(current => [...current, value]);
    });
  }

  async function createGroup() {
    if (!groupName.trim()) { feedback("Give your group a name.", true); return; }
    const group = { id: groupId.current ?? crypto.randomUUID(), name: groupName.trim(), memberIds: groupMembers, contacts: [] };
    groupId.current = group.id; // Retry the same group if the response is lost.
    await run(async () => {
      const result = await saveCrewGroup({ group, remove: false });
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setOptions(current => ({ ...(current ?? emptyOptions), groups: [...(current?.groups ?? []).filter(g => g.id !== group.id), { ...group, memberCount: group.memberIds.length }] }));
      setAudience(group.id); setStep("audience"); history.current.pop(); feedback(result.message);
    });
  }

  async function shareCrew() {
    if (!recipientCount) return;
    await run(async () => {
      const recipients = audience ? selectedGroup?.memberIds ?? [] : members.map(member => member.id);
      if (!request && recipients.length > 20) { feedback("For email sharing, choose a group of 20 or fewer approved members.", true); return; }
      const result = request ? await shareConfirmedEntryWithCrew(request.requestId, audience || null) : await sharePrizeWithCrew(item.slug, recipients);
      if (alive.current) { feedback(result.message, !result.ok); setShared(result.ok); }
    });
  }

  const itemSummary = <div className={styles.item}>
    <Image src={item.image ?? `/items/${item.slug}/opengraph-image`} alt={item.title} width={72} height={60} unoptimized className={styles.thumb} />
    <div><strong>{item.title}</strong>{item.retailer ? <small>{item.retailer}{item.value !== undefined ? ` · $${item.value.toLocaleString()} value` : ""}</small> : null}</div>
  </div>;
  const shortcuts = <div className={styles.shortcuts}>
    <button type="button" onClick={() => go("messages")}><ShareIcon name="message" />Messages</button>
    <button type="button" onClick={() => go("email")}><ShareIcon name="mail" />Email</button>
    <button type="button" onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button>
  </div>;
  const pictureLink = <a href={url} target="_blank" rel="noopener noreferrer" className={styles.pictureLink}>
    <Image src={`/items/${item.slug}/opengraph-image`} alt={`${item.title} sharing picture`} width={1200} height={630} unoptimized />
    <strong>{item.title}</strong><span>Zero Loss · View this item →</span>
  </a>;
  let externalHref: string | null = null;
  if (origin && (step === "messages" || step === "email")) {
    try { externalHref = step === "email" ? emailHref(email, item.title, body) : messageHref(phone, body, isAppleMobile(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)); }
    catch { /* Validate when the user chooses to open their app. */ }
  }
  const titles: Record<Step, string> = { home: "Would you like to share this with anyone?", send: "Send to anyone", messages: "Send a text", email: "Send an email", crew: "Who would you like to share with?", find: "Find someone on Zero Loss", audience: "Who in your Crew?", group: "Create a new group", copy: "Copy this item’s link" };

  return <aside className={styles.toast} aria-labelledby={`${id}-title`} aria-label="Optional item sharing">
    <div className={styles.paper} ref={paper}>
      <div className={styles.top}>
        {step === "home" ? <p className={styles.eyebrow} role="status">{request ? "✓ Entry confirmed" : "Share this item"}</p> : <button type="button" className={styles.back} onClick={back} disabled={busy}>← Back</button>}
        <button type="button" className={styles.close} aria-label="Close sharing toast" onClick={onClose}>×</button>
      </div>
      <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>{titles[step]}</h2>
      {!["group", "find", "copy"].includes(step) ? itemSummary : null}

      {step === "home" ? <div className={styles.actions}>
        <div className={styles.duo}><button type="button" className={styles.primary} disabled={busy} onClick={() => void nativeShare()}><ShareIcon name="share" />Share…</button><button type="button" onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button></div>
        <button type="button" className={styles.crewButton} onClick={() => go("crew")}><ShareIcon name="crew" />Share with your Crew</button>
        <details className={styles.more}><summary>Messages &amp; email shortcuts</summary>{shortcuts}</details>
      </div> : null}

      {step === "send" ? <div className={styles.actions}>{shortcuts}<p className={styles.note}>No Crew or group setup needed. You choose who receives the link.</p></div> : null}

      {step === "crew" ? <div className={styles.actions}>
        <button type="button" className={`${styles.primary} ${styles.path}`} onClick={() => go("messages")}><ShareIcon name="message" /><span>Send to anyone<small>A text with this item’s picture and link.</small></span><span aria-hidden="true">›</span></button>
        <button type="button" className={`${styles.crewButton} ${styles.path}`} onClick={() => go("find")}><ShareIcon name="crew" /><span>Find someone on Zero Loss<small>Search by name, email, or phone.</small></span><span aria-hidden="true">›</span></button>
        <button type="button" onClick={() => void loadAudiences()} disabled={busy}>Use my Crew or groups →</button>
      </div> : null}

      {step === "messages" || step === "email" ? <>
        <div className={styles.field}><label htmlFor={`${id}-recipient`}>{step === "messages" ? "Phone number" : "Email address"} <span>· optional</span></label>
          <input id={`${id}-recipient`} type={step === "messages" ? "tel" : "email"} maxLength={254} autoComplete="off" value={step === "messages" ? phone : email} onChange={event => step === "messages" ? setPhone(event.target.value) : setEmail(event.target.value)} placeholder={step === "messages" ? "Phone with country code" : "name@example.com"} />
          <small>Or choose the recipient in your {step === "messages" ? "Messages" : "email"} app.</small>
        </div>
        <p className={styles.messagePreview}>{text}</p>
        <details className={styles.preview}><summary>See the picture and link</summary>{pictureLink}<p className={styles.note}>Picture previews depend on the receiving app.</p></details>
        <a className={styles.primary} href={externalHref ?? undefined} onClick={event => {
          if (!externalHref) { event.preventDefault(); feedback(`Enter a valid ${step === "messages" ? "phone number" : "email address"}, or leave it blank.`, true); }
          else feedback("You review and send in your app. If it doesn’t open or the text is missing, copy the message below.");
        }}>Open {step === "messages" ? "Messages" : "Email"} →</a>
        <details className={styles.more}><summary>Copy the message instead</summary><textarea aria-label="Message with item link" readOnly value={body} onFocus={event => event.target.select()} /></details>
      </> : null}

      {step === "copy" ? <>{pictureLink}<div className={styles.field}><label htmlFor={`${id}-link`}>Product link</label><textarea id={`${id}-link`} readOnly value={url} onFocus={event => event.target.select()} /></div>{shortcuts}</> : null}

      {step === "find" ? <>
        <form className={styles.field} onSubmit={event => { event.preventDefault(); search(); }}>
          <label htmlFor={`${id}-query`}>Name, email address, or phone number</label>
          <div className={styles.searchRow}><input id={`${id}-query`} value={query} onChange={event => { setQuery(event.target.value); setReviewQuery(""); setPeople([]); }} autoComplete="off" maxLength={254} placeholder="Name, email, or phone" disabled={busy} /><button type="submit" className={styles.primary} disabled={busy} aria-label="Search for a member"><ShareIcon name="search" /></button></div>
        </form>
        <p className={styles.note}>Name search shows members who opted in. Email and phone requests are private—we don’t reveal whether an account exists.</p>
        {people.map(person => <div className={styles.result} key={person.memberId}><strong>{person.name}</strong><small>Discoverable Zero Loss member</small><button type="button" disabled={busy || requested.includes(person.memberId)} onClick={() => void addPerson(person.memberId, "id")}>{requested.includes(person.memberId) ? "Request sent" : "Add to Crew"}</button></div>)}
        {reviewQuery ? <div className={styles.result}><strong>{reviewQuery}</strong><small>They can approve your request if this belongs to a confirmed account{crewLookupKind(reviewQuery) === "phone" ? " with that verified phone" : ""}.</small><button type="button" disabled={busy || requested.includes(reviewQuery)} onClick={() => void addPerson(reviewQuery, crewLookupKind(reviewQuery) === "phone" ? "phone" : "email")}>{requested.includes(reviewQuery) ? "Request submitted" : "Add to Crew"}</button></div> : null}
        <div className={styles.divider}><button type="button" className={styles.crewButton} disabled={busy} onClick={() => void loadAudiences()}>Share with your Crew or groups</button><button type="button" onClick={() => go("messages")}>Send to anyone instead</button></div>
      </> : null}

      {step === "audience" ? <>
        <button type="button" onClick={() => go("find")}>Don’t have a Crew yet? Create one.</button>
        {options ? <>
          <label className={styles.choice}><input type="radio" name={`${id}-audience`} checked={!audience} disabled={busy || !options.memberCount} onChange={() => setAudience("")} /><span>Everyone in my Crew<small>{options.memberCount} approved {options.memberCount === 1 ? "connection" : "connections"}</small></span></label>
          <section className={styles.divider} aria-label="Your groups"><h3>Share with groups you’ve created</h3><button type="button" disabled={busy} onClick={() => { setGroupName(""); setGroupMembers([]); groupId.current = null; go("group"); }}>＋ Create a new group</button>
            {options.groups.map(group => <label className={styles.choice} key={group.id}><input type="radio" name={`${id}-audience`} checked={audience === group.id} disabled={busy || !group.memberCount} onChange={() => setAudience(group.id)} /><span>{group.name}<small>{group.memberCount} approved {group.memberCount === 1 ? "person" : "people"}</small></span></label>)}
            {!options.groups.length ? <p className={styles.note}>No groups yet. Create one whenever you’re ready.</p> : null}
          </section>
          {!recipientCount ? <p className={styles.note}>No approved members in this audience yet. They need to accept your Crew request first.</p> : null}
          <button type="button" className={styles.crewButton} disabled={busy || !recipientCount || shared} onClick={() => void shareCrew()}>{busy ? "Saving…" : shared ? "Shared with Crew" : request ? "Share this pick" : "Send item to Crew"}</button>
          {!request ? <p className={styles.note}>Sends the product link by email to your selected approved Crew members. No purchase required.</p> : null}
        </> : <button type="button" disabled={busy} onClick={() => void loadAudiences()}>{busy ? "Loading Crew…" : "Retry loading Crew"}</button>}
      </> : null}

      {step === "group" ? <>
        <form onSubmit={event => { event.preventDefault(); void createGroup(); }}>
          <div className={styles.field}><label htmlFor={`${id}-group`}>Group name</label><input id={`${id}-group`} value={groupName} onChange={event => setGroupName(event.target.value)} maxLength={50} required disabled={busy} placeholder="Family, Friends…" /></div>
          <h3>Choose approved Crew members</h3>
          {members.map(member => <label className={styles.choice} key={member.id}><input type="checkbox" checked={groupMembers.includes(member.id)} disabled={busy} onChange={event => setGroupMembers(current => event.target.checked ? [...current, member.id] : current.filter(id => id !== member.id))} /><span>{member.name}</span></label>)}
          {!members.length ? <p className={styles.note}>Create the group now. Add people after they accept your request.</p> : null}
          <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save group"}</button>
        </form>
        <Link className={styles.manage} href="/account/crew#crew-groups" onClick={onClose}>Manage groups and saved contacts →</Link>
      </> : null}

      {message ? <p role={error ? "alert" : "status"} className={`${styles.feedback} ${error ? styles.error : ""}`}>{message}</p> : null}
      <button type="button" className={styles.later} onClick={onClose}>{shared ? "Done" : "Not now"}</button>
      <p className={styles.privacy}>{request && !shared ? "Your entry stays private unless you share it with your Crew." : "Your wallet and payment details stay private."}</p>
    </div>
  </aside>;
}
