"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  inviteToCrew, inviteToCrewById, inviteToCrewByPhone, searchCrewByName,
  type CrewSearchPerson,
} from "@/lib/crew/actions";
import { sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import styles from "./crew-search.module.css";

type PhoneContact = { name?: string[]; email?: string[]; tel?: string[] };
type ContactPicker = { select: (properties: Array<"name" | "email" | "tel">, options: { multiple: boolean }) => Promise<PhoneContact[]> };

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.75" cy="10.75" r="6.75" /><path d="m16 16 4 4" /></svg>;
}

function PersonPlusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="4" /><path d="M3.5 25c0-5 3.5-8 8.5-8s8.5 3 8.5 8M24 9v10m-5-5h10" /></svg>;
}

export function CrewSearchPanel({ onSamplePicks, disabled }: { onSamplePicks: (name: SampleCrewName) => void; disabled: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<CrewSearchPerson[]>([]);
  const [sampleResults, setSampleResults] = useState<(typeof sampleCrewPeople)[number][]>([]);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("Search for members who chose to be found by name, or send a private request by email or verified phone.");
  const [pending, setPending] = useState(false);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await searchCrewByName(name);
      const matchingSamples = sampleCrewPeople.filter((person) => person.name.toLowerCase().includes(name.trim().toLowerCase()));
      setResults(result.people);
      setSampleResults(matchingSamples);
      setSearched(true);
      setMessage(result.ok && matchingSamples.length && !result.people.length ? "Matching sample profiles are below. To invite a real person who isn’t discoverable by name, use their email or verified phone." : result.message);
    } catch {
      setMessage("Search couldn’t connect right now. Please try again.");
    } finally { setPending(false); }
  }

  async function sendRequest(action: () => Promise<{ ok: boolean; message: string }>, memberId?: string) {
    setPending(true);
    try {
      const result = await action();
      setMessage(result.message);
      if (result.ok) {
        if (memberId) setRequestedIds((current) => [...current, memberId]);
        router.refresh();
      }
    } catch {
      setMessage("The request couldn’t be saved right now. Please try again.");
    } finally { setPending(false); }
  }

  async function chooseContact() {
    const picker = (navigator as Navigator & { contacts?: ContactPicker }).contacts;
    if (!picker?.select) {
      setMessage("This browser doesn’t offer a phone-contact picker. Enter your friend’s email or verified phone number below instead.");
      return;
    }
    try {
      const [contact] = await picker.select(["name", "email", "tel"], { multiple: false });
      if (!contact) return;
      if (contact.name?.[0]) setName(contact.name[0]);
      if (contact.email?.[0]) setEmail(contact.email[0]);
      if (contact.tel?.[0]) setPhone(contact.tel[0]);
      setMessage("Contact selected. Review the details, then choose whether to send a request. Your address book was not uploaded.");
    } catch {
      setMessage("No contact was selected. You can enter an email or verified phone number manually.");
    }
  }

  return <section id="crew-search" aria-labelledby="crew-search-title" className={styles.panel}>
      <div className={styles.header}><span className={styles.headerIcon}><PersonPlusIcon /></span><div><p>FRIENDS &amp; FAMILY</p><h2 id="crew-search-title">Add to Your Crew</h2></div></div>
      <p className={styles.intro}>Search here—no extra screen. A real person must approve your request before either of you can see shared picks.</p>

      <div className={styles.fields}>
        <form onSubmit={search} className={styles.field}>
          <label htmlFor="crew-search-name">Search by name</label>
          <div className={styles.row}><input id="crew-search-name" type="search" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={60} placeholder="Name (3+ letters)" autoComplete="off" disabled={disabled} />
          <button type="submit" disabled={pending || disabled} aria-label="Search Crew by name"><SearchIcon /><span>Search</span></button></div>
          <small>Only members who opted in appear in name search.</small>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); void sendRequest(() => inviteToCrewByPhone(phone)); }} className={styles.field}>
          <label htmlFor="crew-search-phone">Invite by verified phone</label>
          <div className={styles.row}><input id="crew-search-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone with country code" autoComplete="tel" disabled={disabled} />
          <button type="submit" disabled={pending || disabled} aria-label="Send Crew request by phone"><span>Send request</span></button></div>
          <small>Works only if that number is verified on a Zero Loss account.</small>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); void sendRequest(() => inviteToCrew(email)); }} className={styles.field}>
          <label htmlFor="crew-search-email">Invite by email</label>
          <div className={styles.row}><input id="crew-search-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" disabled={disabled} />
          <button type="submit" disabled={pending || disabled} aria-label="Send Crew request by email"><span>Send request</span></button></div>
          <small>They’ll see the request if they have a confirmed account.</small>
        </form>
      </div>

      <button type="button" onClick={() => void chooseContact()} disabled={disabled} className={styles.contactButton}>Choose from phone contacts</button>
      <p className={styles.contactNote}>On supported phones, you choose which contact to share. Nothing is sent until you press a request button.</p>

      <div className={styles.results} aria-live="polite">
        <p role="status">{message}</p>
        {searched && results.length ? <div className={styles.resultList}>{results.map((person) => <div key={person.memberId} className={styles.result}>
          <span className={styles.avatar}>{person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="48px" unoptimized className={styles.avatarImage} /> : person.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{person.name}</strong><small>Discoverable Zero Loss member</small></div>
          <button type="button" disabled={pending || requestedIds.includes(person.memberId)} onClick={() => void sendRequest(() => inviteToCrewById(person.memberId), person.memberId)}>{requestedIds.includes(person.memberId) ? "Requested" : "Add to Crew"}</button>
        </div>)}</div> : null}
        {searched && sampleResults.length ? <div className={styles.resultList}><strong className={styles.sampleHeading}>Sample profiles—not real invitations</strong>{sampleResults.map((person) => <div key={person.name} className={styles.result}>
          <span className={styles.avatar}><Image src={person.photo} alt="" fill sizes="48px" className={styles.avatarImage} /></span>
          <div><strong>{person.name}</strong><small>Fictional preview profile</small></div>
          <button type="button" onClick={() => onSamplePicks(person.name)}>View sample picks</button>
        </div>)}</div> : null}
      </div>
      <p className={styles.footer}>Your picks stay private until you explicitly share them. A request is not a connection until the other person approves it.</p>
    </section>;
}
