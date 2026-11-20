"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { inviteToCrew, inviteToCrewByPhone } from "@/lib/crew/actions";
import { revealBelowHeader } from "@/lib/account/landing-position";
import { isCrewGroupContact, normalizeCrewContactPhone, type CrewGroupContact } from "@/lib/crew/visibility";
import styles from "./crew-display-settings.module.css";

function contactPhoneKey(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && !phone.trim().startsWith("+") ? `1${digits}` : digits;
}

export function CrewGroupContacts({ contacts, disabled, onChange, draftKey }: { contacts: CrewGroupContact[]; disabled: boolean; onChange: (contacts: CrewGroupContact[]) => void; draftKey?: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [invalid, setInvalid] = useState<"name" | "phone" | "email" | null>(null);
  const validationId = useId();
  const nameField = useRef<HTMLInputElement>(null);
  const phoneField = useRef<HTMLInputElement>(null);
  const emailField = useRef<HTMLInputElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (!draftKey) return;
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (!draft || typeof draft.name !== "string" || typeof draft.phone !== "string" || typeof draft.email !== "string") return;
      // Browser-only draft fields must be restored after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(draft.name.slice(0, 80));
      setPhone(draft.phone.slice(0, 32));
      setEmail(draft.email.slice(0, 254));
    } catch { /* The contact form still works without tab storage. */ }
  }, [draftKey]);
  function remember(nextName: string, nextPhone: string, nextEmail: string) {
    if (!draftKey) return;
    try {
      if (nextName || nextPhone || nextEmail) sessionStorage.setItem(draftKey, JSON.stringify({ name: nextName, phone: nextPhone, email: nextEmail }));
      else sessionStorage.removeItem(draftKey);
    } catch { /* Browser storage is optional. */ }
  }
  function add() {
    const contact = { id: crypto.randomUUID(), name: name.trim(), phone: phone.trim(), email: email.trim() };
    const valid = Boolean(isCrewGroupContact(contact));
    if (!valid) {
      const field = !contact.name ? "name" : contact.email && !isCrewGroupContact({ ...contact, phone: "" }) ? "email" : "phone";
      setInvalid(field);
      setMessage("Add a name and a valid email or phone number with country code.");
      const target = (field === "name" ? nameField : field === "email" ? emailField : phoneField).current;
      target?.focus({ preventScroll: true });
      if (target) revealBelowHeader(target);
      return;
    }
    setInvalid(null);
    if (contacts.length >= 100) { setMessage("This group’s contact list is full."); return; }
    if (contacts.some(item => contact.email && item.email.toLowerCase() === contact.email.toLowerCase() || contact.phone && contactPhoneKey(item.phone) === contactPhoneKey(contact.phone))) {
      setMessage("That contact is already in this group."); return;
    }
    onChange([...contacts, { ...contact, phone: normalizeCrewContactPhone(contact.phone) }]); setName(""); setPhone(""); setEmail("");
    remember("", "", "");
    setMessage(`Choose Save group to keep ${contact.name}’s details.`);
  }
  async function invite(contact: CrewGroupContact, method: "email" | "phone") {
    setSending(true);
    try { const result = await (method === "email" ? inviteToCrew(contact.email) : inviteToCrewByPhone(contact.phone)); setMessage(result.message); }
    catch { setMessage("Couldn’t confirm the connection. Please try again."); }
    finally { setSending(false); }
  }
  return <div className={styles.contacts}>
    <strong>Add a contact to this group</strong>
    <p><b>Save group</b> keeps their contact details here. <b>Add to Crew</b> connects you automatically if there’s a matching account that allows it.</p>
    {contacts.map(contact => <div key={contact.id} className={styles.contactRow}>
      <strong>{contact.name}</strong><span>{[contact.phone, contact.email].filter(Boolean).join(" · ")}</span>
      <div>{contact.email ? <button type="button" disabled={disabled || sending} onClick={() => void invite(contact, "email")}>Add to Crew by email</button> : null}
      {contact.phone ? <button type="button" disabled={disabled || sending} onClick={() => void invite(contact, "phone")}>Add to Crew by phone</button> : null}
      <button type="button" disabled={disabled || sending} onClick={() => {
        onChange(contacts.filter(item => item.id !== contact.id));
        setInvalid(null);
        setMessage("Contact removed from this draft. Choose Save group to apply the change.");
        addButton.current?.focus({ preventScroll: true });
        requestAnimationFrame(() => { if (addButton.current) revealBelowHeader(addButton.current); });
      }} aria-label={`Remove contact ${contact.name}`}>Remove contact</button></div>
    </div>)}
    <div className={styles.contactFields}>
      <label>Name<input ref={nameField} aria-invalid={invalid === "name" || undefined} aria-describedby={invalid === "name" ? validationId : undefined} value={name} onChange={event => { setName(event.target.value); remember(event.target.value, phone, email); if (invalid === "name") { setInvalid(null); setMessage(""); } }} disabled={disabled} maxLength={80} autoComplete="off" placeholder="Contact name" /></label>
      <label>Phone number<input ref={phoneField} aria-invalid={invalid === "phone" || undefined} aria-describedby={invalid === "phone" ? validationId : undefined} type="tel" value={phone} onChange={event => { setPhone(event.target.value); remember(name, event.target.value, email); if (invalid === "phone") { setInvalid(null); setMessage(""); } }} disabled={disabled} maxLength={32} autoComplete="off" placeholder="Phone with country code" /></label>
      <label>Email address<input ref={emailField} aria-invalid={invalid === "email" || undefined} aria-describedby={invalid === "email" ? validationId : undefined} type="email" value={email} onChange={event => { setEmail(event.target.value); remember(name, phone, event.target.value); if (invalid === "email" || (invalid === "phone" && !phone.trim())) { setInvalid(null); setMessage(""); } }} disabled={disabled} maxLength={254} autoComplete="off" placeholder="Email address" /></label>
    </div>
    <button ref={addButton} type="button" className={styles.addMember} onClick={add} disabled={disabled}>Add contact to group</button>
    {message ? <p role={invalid ? "alert" : "status"} id={validationId}>{message}</p> : null}
  </div>;
}
