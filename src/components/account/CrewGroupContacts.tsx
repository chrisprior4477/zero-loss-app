"use client";

import { useState } from "react";
import { inviteToCrew, inviteToCrewByPhone } from "@/lib/crew/actions";
import { isCrewGroupContact, type CrewGroupContact } from "@/lib/crew/visibility";
import styles from "./crew-display-settings.module.css";

export function CrewGroupContacts({ contacts, disabled, onChange }: { contacts: CrewGroupContact[]; disabled: boolean; onChange: (contacts: CrewGroupContact[]) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  function add() {
    const contact = { id: crypto.randomUUID(), name: name.trim(), phone: phone.trim(), email: email.trim() };
    if (!isCrewGroupContact(contact)) { setMessage("Add a name and a valid email or phone number with country code."); return; }
    if (contacts.length >= 100) { setMessage("This group’s contact list is full."); return; }
    if (contacts.some(item => contact.email && item.email.toLowerCase() === contact.email.toLowerCase() || contact.phone && item.phone.replace(/\D/g, "") === contact.phone.replace(/\D/g, ""))) {
      setMessage("That contact is already in this group."); return;
    }
    onChange([...contacts, contact]); setName(""); setPhone(""); setEmail("");
    setMessage(`${contact.name} added. Choose Save group to keep these details. No request has been sent.`);
  }
  async function invite(contact: CrewGroupContact, method: "email" | "phone") {
    setSending(true);
    try { const result = await (method === "email" ? inviteToCrew(contact.email) : inviteToCrewByPhone(contact.phone)); setMessage(result.message); }
    catch { setMessage("Couldn’t confirm the request. Please try again."); }
    finally { setSending(false); }
  }
  return <div className={styles.contacts}>
    <strong>Add a contact to this group</strong>
    <p>Save their details here. Send a Crew request separately; only approved members can see shared picks.</p>
    {contacts.map(contact => <div key={contact.id} className={styles.contactRow}>
      <strong>{contact.name}</strong><span>{[contact.phone, contact.email].filter(Boolean).join(" · ")}</span>
      <div>{contact.email ? <button type="button" disabled={disabled || sending} onClick={() => void invite(contact, "email")}>Request by email</button> : null}
      {contact.phone ? <button type="button" disabled={disabled || sending} onClick={() => void invite(contact, "phone")}>Request by phone</button> : null}
      <button type="button" disabled={disabled || sending} onClick={() => onChange(contacts.filter(item => item.id !== contact.id))} aria-label={`Remove contact ${contact.name}`}>Remove contact</button></div>
    </div>)}
    <div className={styles.contactFields}>
      <label>Name<input value={name} onChange={event => setName(event.target.value)} disabled={disabled} maxLength={80} autoComplete="off" placeholder="Contact name" /></label>
      <label>Phone number<input type="tel" value={phone} onChange={event => setPhone(event.target.value)} disabled={disabled} maxLength={32} autoComplete="off" placeholder="Phone with country code" /></label>
      <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} disabled={disabled} maxLength={254} autoComplete="off" placeholder="Email address" /></label>
    </div>
    <button type="button" className={styles.addMember} onClick={add} disabled={disabled}>Add contact to group</button>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
