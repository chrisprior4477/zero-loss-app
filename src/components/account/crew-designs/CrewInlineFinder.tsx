"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { inviteToCrew, inviteToCrewById, inviteToCrewByPhone, searchCrewByName, type CrewSearchPerson } from "@/lib/crew/actions";
import { addSampleCrewPreview, sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import { ShareIcon } from "@/components/product/ShareIcon";
import styles from "./crew-designs.module.css";

export function CrewInlineFinder({ available, onSample, onClose }: { available: boolean; onSample: (name: SampleCrewName) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<CrewSearchPerson[]>([]);
  const [samples, setSamples] = useState<(typeof sampleCrewPeople)[number][]>([]);
  const [target, setTarget] = useState<{ value: string; kind: "email" | "phone" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const request = useRef(0);

  async function find(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    const turn = ++request.current;
    setPeople([]); setSamples([]); setTarget(null); setMessage("");
    if (value.includes("@") || /^[+\d\s().-]+$/.test(value)) {
      const kind = value.includes("@") ? "email" : "phone";
      if (kind === "email" ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : !/^\d{10,15}$/.test(value.replace(/\D/g, ""))) {
        setMessage(kind === "email" ? "Enter a valid email address." : "Enter a phone number, including its country code."); return;
      }
      setTarget({ value, kind }); return;
    }
    if (value.length < 3) { setMessage("Enter at least three letters, an email, or a phone number."); return; }
    setBusy(true);
    try {
      const result = await searchCrewByName(value);
      if (request.current !== turn) return;
      const matching = sampleCrewPeople.filter(person => person.name.toLowerCase().includes(value.toLowerCase()));
      setPeople(result.people); setSamples(matching);
      if (!result.ok || (!result.people.length && !matching.length)) setMessage(result.message);
    } catch { if (request.current === turn) setMessage("Search couldn’t connect. Try again."); }
    finally { if (request.current === turn) setBusy(false); }
  }

  async function add(id: string, action: () => Promise<{ ok: boolean; message: string }>) {
    setBusy(true); setSending(true);
    try { const result = await action(); setMessage(result.message); if (result.ok) setSent(current => [...current, id]); }
    catch { setMessage("We couldn’t confirm that request. Check Requests before trying again."); }
    finally { setBusy(false); setSending(false); }
  }

  return <section className={styles.finder} aria-label="Find someone for your Crew">
    <div className={styles.finderHeading}><div><span className={styles.eyebrow}>MAKE THE CONNECTION</span><h2>Add someone to your Crew</h2></div><button type="button" className={styles.iconButton} aria-label="Close people search" onClick={onClose}>×</button></div>
    <form onSubmit={find}>
      <label htmlFor="design-crew-query">Name, email, or phone</label>
      <div className={styles.findRow}><input id="design-crew-query" value={query} autoComplete="off" maxLength={254} placeholder="Who are you looking for?" onChange={event => { request.current += 1; setBusy(false); setQuery(event.target.value); setTarget(null); setPeople([]); setSamples([]); setMessage(""); }} required disabled={!available || sending} /><button className={styles.orangeButton} disabled={!available || busy}><ShareIcon name="search" />{sending ? "Sending…" : busy ? "Finding…" : "Find"}</button></div>
    </form>
    <div className={styles.findResults} aria-live="polite">
      {target ? <article className={styles.findResult}><span className={styles.contactSymbol}><ShareIcon name={target.kind === "email" ? "mail" : "message"} /></span><div><strong>{target.value}</strong><small>Private request · approval required</small></div><button type="button" className={styles.greenButton} disabled={busy || sent.includes(target.value)} onClick={() => void add(target.value, () => target.kind === "email" ? inviteToCrew(target.value) : inviteToCrewByPhone(target.value))}>{sent.includes(target.value) ? "Requested" : "Add to Crew"}</button></article> : null}
      {people.map(person => <article className={styles.findResult} key={person.memberId}><span className={styles.smallAvatar}>{person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="44px" unoptimized /> : person.name[0]}</span><div><strong>{person.name}</strong><small>Discoverable member</small></div><button type="button" className={styles.greenButton} disabled={busy || sent.includes(person.memberId)} onClick={() => void add(person.memberId, () => inviteToCrewById(person.memberId))}>{sent.includes(person.memberId) ? "Requested" : "Add to Crew"}</button></article>)}
      {samples.map(person => <article className={styles.findResult} key={person.name}><span className={styles.smallAvatar}><Image src={person.photo} alt="" fill sizes="44px" /></span><div><strong>{person.name}</strong><small>Fictional sample profile</small></div><button type="button" className={styles.greenButton} onClick={() => { addSampleCrewPreview(person.name); onSample(person.name); }}>Add sample</button></article>)}
      {message ? <p role="status" className={styles.findMessage}>{message}</p> : null}
    </div>
    <p className={styles.findHint}>{target ? "We don’t reveal whether that contact has an account. They approve before sharing begins." : "Name results respect each person’s search settings. Requests are sent only when you press Add to Crew."}</p>
  </section>;
}
