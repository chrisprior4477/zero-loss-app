"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  inviteToCrew, inviteToCrewById, inviteToCrewByPhone, searchCrewByName,
  type CrewSearchPerson,
} from "@/lib/crew/actions";
import styles from "./crew-search.module.css";

type PhoneContact = { name?: string[]; email?: string[]; tel?: string[] };
type ContactPicker = { select: (properties: Array<"name" | "email" | "tel">, options: { multiple: boolean }) => Promise<PhoneContact[]> };

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.75" cy="10.75" r="6.75" /><path d="m16 16 4 4" /></svg>;
}

function PersonPlusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="4" /><path d="M3.5 25c0-5 3.5-8 8.5-8s8.5 3 8.5 8M24 9v10m-5-5h10" /></svg>;
}

export function CrewSearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<CrewSearchPerson[]>([]);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("Search for members who chose to be found by name, or send a private request by email or verified phone.");
  const [pending, setPending] = useState(false);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await searchCrewByName(name);
      setResults(result.people);
      setSearched(true);
      setMessage(result.message);
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

  return <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="crew-search-title" className={styles.modal}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close Crew search">×</button>
      <div className={styles.header}><span className={styles.headerIcon}><PersonPlusIcon /></span><div><p>FRIENDS &amp; FAMILY</p><h2 id="crew-search-title">Add to Your Crew</h2></div></div>
      <p className={styles.intro}>Find someone by name, email, or phone. They must approve your request before either of you can see shared picks.</p>

      <div className={styles.fields}>
        <form onSubmit={search} className={styles.row}>
          <label htmlFor="crew-search-name" className={styles.srOnly}>Search by name</label>
          <input id="crew-search-name" type="search" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={60} placeholder="Search by name..." autoComplete="off" />
          <button type="submit" disabled={pending} aria-label="Search Crew by name"><SearchIcon /></button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); void sendRequest(() => inviteToCrewByPhone(phone)); }} className={styles.row}>
          <label htmlFor="crew-search-phone" className={styles.srOnly}>Invite by phone number</label>
          <input id="crew-search-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number with country code..." autoComplete="tel" />
          <button type="submit" disabled={pending} aria-label="Send Crew request by phone"><SearchIcon /></button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); void sendRequest(() => inviteToCrew(email)); }} className={styles.row}>
          <label htmlFor="crew-search-email" className={styles.srOnly}>Invite by email address</label>
          <input id="crew-search-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address..." autoComplete="email" />
          <button type="submit" disabled={pending} aria-label="Send Crew request by email"><SearchIcon /></button>
        </form>
      </div>

      <button type="button" onClick={() => void chooseContact()} className={styles.contactButton}>Choose from phone contacts</button>
      <p className={styles.contactNote}>On supported phones, you choose which contact to share. Nothing is sent until you press a request button.</p>

      <div className={styles.results} aria-live="polite">
        <p role="status">{message}</p>
        {searched && results.length ? <div className={styles.resultList}>{results.map((person) => <div key={person.memberId} className={styles.result}>
          <span className={styles.avatar}>{person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="48px" unoptimized className={styles.avatarImage} /> : person.name.slice(0, 1).toUpperCase()}</span>
          <div><strong>{person.name}</strong><small>Discoverable Zero Loss member</small></div>
          <button type="button" disabled={pending || requestedIds.includes(person.memberId)} onClick={() => void sendRequest(() => inviteToCrewById(person.memberId), person.memberId)}>{requestedIds.includes(person.memberId) ? "Requested" : "Add to Crew"}</button>
        </div>)}</div> : null}
      </div>
      <div className={styles.footer}><p>Name search shows only members who opted in. Your picks stay private until you explicitly share them.</p><button type="button" onClick={onClose}>Done ✓</button></div>
    </section>
  </div>;
}
