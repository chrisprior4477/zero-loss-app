"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { inviteToCrew, inviteToCrewById, inviteToCrewByPhone, searchCrewByName, type CrewSearchPerson } from "@/lib/crew/actions";
import { addSampleCrewPreview, sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { ShareIcon } from "@/components/product/ShareIcon";
import styles from "./crew-connected.module.css";

const finderDraftKey = "zeroLossCrewFinderDraft";
const maxQueryLength = 254;

export function CrewInlineFinder({ available, ownerId, onSample, onClose }: { available: boolean; ownerId?: string; onSample: (name: SampleCrewName) => void; onClose: () => void }) {
  const router = useRouter();
  const [query, updateQuery] = useState("");
  useLayoutEffect(() => {
    if (!ownerId) return;
    const frame = requestAnimationFrame(() => {
      const saved = history.state?.[finderDraftKey];
      if (saved?.ownerId === ownerId && saved.href === location.href && typeof saved.value === "string" && saved.value.length <= maxQueryLength) {
        updateQuery(current => current || saved.value);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [ownerId]);

  function setQuery(value: string) {
    updateQuery(value);
    if (!ownerId) return;
    const state = { ...history.state };
    if (value) state[finderDraftKey] = { ownerId, href: location.href, value };
    else delete state[finderDraftKey];
    try { history.replaceState(state, ""); } catch { /* The inline search still works. */ }
  }
  const [contactMethods, setContactMethods] = useState<string[]>([]);
  const contactChoice = useRef<HTMLSelectElement>(null);
  const [people, setPeople] = useState<CrewSearchPerson[]>([]);
  const [samples, setSamples] = useState<(typeof sampleCrewPeople)[number][]>([]);
  const [target, setTarget] = useState<{ value: string; kind: "email" | "phone" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const request = useRef(0);
  const queryField = useRef<HTMLInputElement>(null);
  const findButton = useRef<HTMLButtonElement>(null);
  const focusRetry = useRef(false);
  const focusResult = useRef(false);
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (busy || (!focusRetry.current && !focusResult.current)) return;
    const retry = focusRetry.current;
    focusRetry.current = focusResult.current = false;
    if (document.activeElement !== document.body && document.activeElement !== findButton.current) return;
    const target = retry ? findButton.current : results.current;
    target?.focus({ preventScroll: true });
    if (target) revealBelowHeader(target);
  }, [busy]);
  const connectionFeedback = useRef<HTMLParagraphElement>(null);
  const focusConnectionFeedback = useRef(false);
  useEffect(() => {
    if (sending || !focusConnectionFeedback.current) return;
    focusConnectionFeedback.current = false;
    if (document.activeElement === document.body) connectionFeedback.current?.focus();
  }, [sending]);
  const validationId = useId();
  const [invalid, setInvalid] = useState(false);

  async function find(event: React.FormEvent) {
    event.preventDefault();
    if (!available || busy) return;
    const value = query.trim();
    const turn = ++request.current;
    setPeople([]); setSamples([]); setTarget(null); setMessage(""); setInvalid(false);
    if (value.includes("@") || /^[+\d\s().-]+$/.test(value)) {
      const kind = value.includes("@") ? "email" : "phone";
      if (kind === "email" ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : !/^\d{10,15}$/.test(value.replace(/\D/g, ""))) {
        setInvalid(true);
        queryField.current?.focus();
        setMessage(kind === "email" ? "Enter a valid email address." : "Enter a phone number, including its country code."); return;
      }
      setTarget({ value, kind }); return;
    }
    if (value.length < 3) {
      setInvalid(true);
      setMessage("Enter at least three letters, an email, or a phone number.");
      queryField.current?.focus();
      return;
    }
    focusResult.current = document.activeElement === findButton.current;
    setBusy(true);
    try {
      const result = await searchCrewByName(value);
      if (request.current !== turn) return;
      const matching = sampleCrewPeople.filter(person => person.name.toLowerCase().includes(value.toLowerCase()));
      setPeople(result.people); setSamples(matching);
      if (!result.ok) focusRetry.current = true;
      if (!result.ok || (!result.people.length && !matching.length)) setMessage(result.message);
    } catch {
      if (request.current === turn) { focusRetry.current = true; setMessage("Search couldn’t connect. Try again."); }
    }
    finally { if (request.current === turn) setBusy(false); }
  }

  async function add(id: string, action: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true); setSending(true);
    try { const result = await action(); setMessage(result.message); if (result.ok) { setSent(current => [...current, id]); router.refresh(); } }
    catch {
      focusConnectionFeedback.current = true;
      setMessage("We couldn’t confirm that change. Refresh your Crew before trying again.");
    }
    finally { setBusy(false); setSending(false); }
  }

  function returnFromContacts(control: HTMLElement | null) {
    if (!control?.isConnected) return;
    control.focus({ preventScroll: true });
    control.scrollIntoView?.({ block: "center", behavior: "instant" });
  }

  async function chooseContact() {
    const picker = (navigator as Navigator & { contacts?: { select: (properties: string[], options: { multiple: boolean }) => Promise<{ name?: string[]; email?: string[]; tel?: string[] }[]> } }).contacts;
    setInvalid(false);
    if (!picker?.select) { setMessage("This browser doesn’t offer phone contacts. Enter a name, email, or phone instead."); returnFromContacts(queryField.current); return; }
    try {
      const [contact] = await picker.select(["name", "email", "tel"], { multiple: false });
      if (!contact) { returnFromContacts(queryField.current); return; }
      request.current += 1; setPeople([]); setSamples([]); setTarget(null);
      const methods = [...new Set([...(contact.email ?? []), ...(contact.tel ?? [])].map(value => value.trim()).filter(Boolean))];
      setContactMethods(methods.length > 1 ? methods : []);
      if (methods.length > 1) {
        setQuery("");
        setMessage("Choose an email address or phone number for this contact.");
        requestAnimationFrame(() => returnFromContacts(contactChoice.current));
      } else {
        setQuery(methods[0] || contact.name?.[0] || "");
        setMessage(methods.length ? "Contact selected. Press Find, then Add to Crew. Your address book was not uploaded."
          : "This contact has no email or phone number. Search their name with Find, or enter an email or phone for a private lookup.");
        returnFromContacts(findButton.current);
      }
    } catch { setMessage("No contact was selected. You can type their details instead."); returnFromContacts(queryField.current); }
  }

  return <section id="crew-search" className={styles.finder} aria-label="Find someone for your Crew" onKeyDown={event => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    onClose();
  }}>
    <div className={styles.finderHeading}><div><span className={styles.eyebrow}>MAKE THE CONNECTION</span><h2>Add someone to your Crew</h2></div><button type="button" className={styles.iconButton} aria-label="Close people search" onClick={onClose}>×</button></div>
    {contactMethods.length ? <label>Contact method
      <select ref={contactChoice} value={contactMethods.includes(query) ? query : ""} onChange={event => {
        setQuery(event.target.value); setInvalid(false); setTarget(null); setMessage("Press Find, then Add to Crew.");
      }}>
        <option value="">Choose an email or phone</option>
        {contactMethods.map(method => <option key={method} value={method}>{method}</option>)}
      </select>
    </label> : null}
    <form onSubmit={find}>
      <label htmlFor="crew-query">Name, email, or phone</label>
      <div className={styles.findRow}><input ref={queryField} type="search" id="crew-query" value={query} aria-invalid={invalid || undefined} aria-describedby={invalid ? validationId : undefined} autoComplete="off" maxLength={maxQueryLength} placeholder="Who are you looking for?" onChange={event => { request.current += 1; setBusy(false); focusResult.current = focusRetry.current = false; setQuery(event.target.value); setContactMethods([]); setInvalid(false); setTarget(null); setPeople([]); setSamples([]); setMessage(""); }} required disabled={!available || sending} /><button ref={findButton} className={styles.orangeButton} disabled={!available || sending} aria-disabled={busy || undefined}><ShareIcon name="search" />{sending ? "Sending…" : busy ? "Finding…" : "Find"}</button></div>
    </form>
    <div ref={results} className={styles.findResults} tabIndex={-1} role="region" aria-label="People search results">
      {target ? <article className={styles.findResult}><span className={styles.contactSymbol}><ShareIcon name={target.kind === "email" ? "mail" : "message"} /></span><div><strong>{target.value}</strong><small>Private contact lookup</small></div><button type="button" className={styles.greenButton} disabled={busy || sent.includes(target.value)} onClick={() => void add(target.value, () => target.kind === "email" ? inviteToCrew(target.value) : inviteToCrewByPhone(target.value))}>{sent.includes(target.value) ? "Saved" : "Add to Crew"}</button></article> : null}
      {people.map(person => <article className={styles.findResult} key={person.memberId}><span className={styles.smallAvatar}>{person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="44px" unoptimized /> : person.name[0]}</span><div><strong>{person.name}</strong><small>Discoverable member</small></div><button type="button" className={styles.greenButton} disabled={busy || sent.includes(person.memberId)} onClick={() => void add(person.memberId, () => inviteToCrewById(person.memberId))}>{sent.includes(person.memberId) ? "Added" : "Add to Crew"}</button></article>)}
      {samples.map(person => <article className={styles.findResult} key={person.name}><span className={styles.smallAvatar}><Image src={person.photo} alt="" fill sizes="44px" /></span><div><strong>{person.name}</strong><small>Fictional sample profile</small></div><button type="button" className={styles.greenButton} onClick={() => { addSampleCrewPreview(person.name); onSample(person.name); }}>Add sample</button></article>)}
      {message ? <p ref={connectionFeedback} tabIndex={-1} id={validationId} role="status" className={styles.findMessage}>{message}</p> : null}
    </div>
    <button type="button" className={styles.contactsButton} disabled={!available || busy} onClick={() => void chooseContact()}>Choose from phone contacts</button>
    <p className={styles.findHint}>{target ? "We don’t reveal whether that contact has an account. Matching members are connected automatically and can leave at any time." : "Name results respect each person’s search settings. Connections are made only when you press Add to Crew."}</p>
  </section>;
}
