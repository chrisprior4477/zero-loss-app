"use client";

import { prepareProductShareLink } from "@/lib/sharing/receiving-actions";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { getCrewShareOptions, inviteToCrew, inviteToCrewById, inviteToCrewByPhone, saveCrewGroup, searchCrewByName, shareConfirmedEntryWithCrew, sharePrizeWithCrew, shareWinWithCrew, type CrewSearchPerson, type CrewShareOptions } from "@/lib/crew/actions";
import { getProductShareItem } from "@/lib/sharing/actions";
import { crewLookupKind, emailHref, isAppleMobile, messageHref, nativeProductShareData, productShareText, productShareUrl, webmailHref, type WebmailProvider, type ProductShareItem } from "@/lib/sharing/product-share";
import type { CrewGroupContact } from "@/lib/crew/visibility";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import type { EntryRequest } from "@/lib/entries/request";
import { ShareIcon } from "./ShareIcon";
import styles from "./post-entry-crew-toast.module.css";
import popupStyles from "@/components/layout/responsive-popup.module.css";

type Step = "home" | "send" | "messages" | "email" | "crew" | "find" | "audience" | "group" | "copy" | "contacts";
type PhoneContact = { name?: string[]; email?: string[]; tel?: string[] };
type ContactPicker = { select: (properties: string[], options: { multiple: boolean }) => Promise<PhoneContact[]> };
const contactKey = (value: string, kind: "id" | "email" | "phone") => kind === "phone" ? value.replace(/\D/g, "") : value.trim().toLowerCase();
const validPhone = (value: string) => /^\d{10,15}$/.test(value.replace(/\D/g, ""));
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
  const [groupsOnly, setGroupsOnly] = useState(false);
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
  const [contactChoices, setContactChoices] = useState<{ value: string; kind: "phone" | "email"; name: string }[]>([]);
  const contactReturn = useRef<"messages" | "find">("messages");
  const searchVersion = useRef(0);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const groupId = useRef<string | null>(null);
  const groupContacts = useRef<CrewGroupContact[]>([]);
  const [editingGroup, setEditingGroup] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const perforation = useRef<HTMLDivElement>(null);
  const emailRecipientPanel = useRef<HTMLDetailsElement>(null);
  const previousStep = useRef<Step | null>(null);
  const id = useId();
  const [shareToken, setShareToken] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void prepareProductShareLink(item.slug, audience || null).then(token => { if (!cancelled) { setShareToken(token); } }).catch(() => { if (!cancelled) { setShareToken(null); } });
    return () => { cancelled = true; };
  }, [item.slug, audience]);
  const url = origin ? productShareUrl(origin, item.slug, shareToken) : `/items/${item.slug}`;
  const text = productShareText(item.title, item);
  const body = `${text}\n${url}`;
  const members = options?.members ?? [];
  const selectedGroup = options?.groups.find(group => group.id === audience);
  const recipientCount = audience ? selectedGroup?.memberCount ?? 0 : groupsOnly ? 0 : options?.memberCount ?? 0;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    // The top layer keeps phone/tablet dialogs positioned against the viewport.
    element.showModal();
    document.body.style.overflow = "hidden";
    heading.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

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
    if (!shared) return;
    heading.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(onClose, 2500);
    return () => window.clearTimeout(timer);
  }, [shared, onClose]);

  useEffect(() => {
    if ((previousStep.current === null && focusOnOpen) || (previousStep.current !== null && previousStep.current !== step)) {
      if (paper.current) paper.current.scrollTop = 0;
      heading.current?.focus({ preventScroll: true });
    }
    previousStep.current = step;
  }, [step, focusOnOpen]);

  useEffect(() => {
    const surface = paper.current;
    const divider = perforation.current;
    if (step !== "home" || !surface || !divider) return;
    const positionCutouts = () => {
      const surfaceBox = surface.getBoundingClientRect();
      const dividerBox = divider.getBoundingClientRect();
      const y = dividerBox.top - surfaceBox.top + dividerBox.height / 2;
      surface.style.setProperty("--perforation-y", `${y > 24 && y < surfaceBox.height - 24 ? y : -100}px`);
    };
    positionCutouts();
    const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(positionCutouts) : null;
    resize?.observe(surface);
    resize?.observe(divider);
    surface.addEventListener("scroll", positionCutouts, { passive: true });
    return () => {
      resize?.disconnect();
      surface.removeEventListener("scroll", positionCutouts);
      surface.style.removeProperty("--perforation-y");
    };
  }, [step]);

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
      await navigator.share(nativeProductShareData(item, window.location.origin, navigator.userAgent, shareToken));
      // Handoff is not proof of delivery. Never report "sent" here.
    } catch (reason) {
      if ((reason as { name?: string })?.name !== "AbortError" && alive.current) {
        go("send"); feedback("Your browser couldn’t open sharing. Use Text, Email, or Copy link instead.");
      }
    } finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(productShareUrl(window.location.origin, item.slug, shareToken));
      if (alive.current) feedback("Link copied. Paste it into your conversation.");
    } catch {
      if (alive.current) { if (step !== "copy") go("copy"); feedback("Select and copy the link below. Automatic copying isn’t available in this browser."); }
    }
  }

  async function loadAudiences(onlyGroups = false) {
    setGroupsOnly(onlyGroups); setAudience(""); setShared(false);
    go("audience");
    await run(async () => {
      const result = await getCrewShareOptions();
      if (!alive.current) return;
      if (result.ok) setOptions(result); else feedback(result.message, true);
    });
  }

  function search() {
    const version = ++searchVersion.current;
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
      if (!alive.current || version !== searchVersion.current) return;
      setPeople(result.people); feedback(result.message, !result.ok);
    });
  }

  async function addPerson(value: string, kind: "id" | "email" | "phone", name?: string) {
    const key = contactKey(value, kind);
    if (requested.includes(key)) return;
    await run(async () => {
      const result = kind === "id" ? await inviteToCrewById(value) : kind === "email" ? await inviteToCrew(value) : await inviteToCrewByPhone(value);
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setRequested(current => [...new Set([...current, key])]);
      setShared(false);
      feedback(kind === "id" ? `${name || "This person"} is now part of your Crew.` : `${kind === "phone" ? "Phone number" : "Email"} ${value} added for automatic connection. Matching members who allow it join your Crew and can leave at any time.`);
      try {
        const updated = await getCrewShareOptions();
        if (alive.current && updated.ok) setOptions(updated);
      } catch { /* The add succeeded; a later audience load can retry this read. */ }
    });
  }

  function openContacts(from: "messages" | "find") {
    contactReturn.current = from;
    setContactChoices([]);
    go("contacts");
  }

  async function chooseContact() {
    if (busyRef.current) return;
    const picker = (navigator as Navigator & { contacts?: ContactPicker }).contacts;
    if (!picker?.select) { feedback("This browser doesn’t offer phone contacts. Copy a number from your Contacts app and paste it into the phone field instead."); return; }
    busyRef.current = true; setBusy(true); feedback("");
    try {
      // Keep the native picker in the button's user gesture. Never upload an address book.
      const selected = await picker.select(["name", "tel", "email"], { multiple: false });
      if (!alive.current) return;
      const choices = selected.flatMap(contact => [
        ...(contact.tel ?? []).filter(validPhone).map(value => ({ value, kind: "phone" as const, name: contact.name?.[0] || "Selected contact" })),
        ...(contact.email ?? []).filter(value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)).map(value => ({ value, kind: "email" as const, name: contact.name?.[0] || "Selected contact" })),
      ]).filter((choice, index, all) => all.findIndex(other => other.kind === choice.kind && contactKey(other.value, other.kind) === contactKey(choice.value, choice.kind)) === index);
      if (choices.length === 1) selectContact(choices[0]);
      else { setContactChoices(choices); if (!choices.length) feedback("No phone number or email was selected. You can type it instead."); }
    } catch (reason) {
      if (alive.current) feedback((reason as { name?: string })?.name === "AbortError" ? "No contact selected." : "Contacts couldn’t open. You can enter a phone number instead.");
    } finally { busyRef.current = false; if (alive.current) setBusy(false); }
  }

  function selectContact(contact: { value: string; kind: "phone" | "email"; name: string }) {
    const destination = contactReturn.current === "messages" && contact.kind === "phone" ? "messages" : "find";
    if (destination === contactReturn.current) history.current.pop();
    if (destination === "messages") { setPhone(contact.value); setStep("messages"); }
    else { searchVersion.current += 1; setQuery(contact.value); setReviewQuery(contact.value); setPeople([]); setStep("find"); }
    feedback(`${contact.name} selected. Choose Add to Crew to connect, or review and send in your app.`);
  }

  function editGroup(group?: CrewShareOptions["groups"][number]) {
    groupId.current = group?.id ?? null;
    groupContacts.current = group?.contacts ?? [];
    setEditingGroup(Boolean(group));
    setGroupName(group?.name ?? ""); setGroupMembers(group?.memberIds ?? []);
    if (group) setAudience(group.id);
    go("group");
  }

  async function refreshMembers() {
    await run(async () => {
      const result = await getCrewShareOptions();
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setOptions(result);
      setGroupMembers(current => current.filter(id => result.members.some(member => member.id === id)));
      feedback("Crew refreshed. Your connected people can now be selected.");
    });
  }

  async function createGroup() {
    if (!groupName.trim()) { feedback("Give your group a name.", true); return; }
    const group = { id: groupId.current ?? crypto.randomUUID(), name: groupName.trim(), memberIds: groupMembers, contacts: groupContacts.current };
    groupId.current = group.id; // Retry the same group if the response is lost.
    await run(async () => {
      const result = await saveCrewGroup({ group, remove: false });
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setOptions(current => ({ ...(current ?? emptyOptions), groups: [...(current?.groups ?? []).filter(g => g.id !== group.id), { ...group, memberCount: group.memberIds.length }] }));
      setAudience(group.id); setShared(false); setStep("audience"); history.current.pop(); feedback(result.message);
    });
  }

  async function shareCrew() {
    if (!recipientCount) return;
    await run(async () => {
      const recipients = audience ? selectedGroup?.memberIds ?? [] : members.map(member => member.id);
      if (!request && recipients.length > 20) { feedback("For email sharing, choose a group of 20 or fewer approved members.", true); return; }
      const result = item.win ? await shareWinWithCrew(item.win.rewardId, recipients) : request ? await shareConfirmedEntryWithCrew(request.requestId, audience || null) : await sharePrizeWithCrew(item.slug, recipients, audience || null);
      if (alive.current) { feedback(result.message, !result.ok); setShared(result.ok); }
    });
  }

  const itemSummary = <div className={styles.item}>
    <Image src={item.image ?? `/items/${item.slug}/opengraph-image`} alt={item.title} width={72} height={60} unoptimized className={styles.thumb} />
    <div><strong>{item.title}</strong>{item.retailer ? <small>{item.retailer}{item.value !== undefined ? ` · $${item.value.toLocaleString()} value` : ""}</small> : null}</div>
  </div>;
  const shortcuts = <div className={styles.shortcuts}>
    <button type="button" onClick={() => go("messages")}><ShareIcon name="message" />Text</button>
    <button type="button" onClick={() => go("email")}><ShareIcon name="mail" />Email</button>
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
  function emailLink(provider: WebmailProvider) {
    if (!externalHref) return undefined;
    return webmailHref(provider, email, item.title, body);
  }
  function invalidEmail() {
    feedback("Enter a valid email address, or leave it blank.", true);
    if (emailRecipientPanel.current) emailRecipientPanel.current.open = true;
    document.getElementById(`${id}-recipient`)?.focus();
  }
  const webmailLink = (provider: WebmailProvider, label: string, tile = false) => <a className={tile ? styles.emailTile : styles.emailOption} aria-label={`${label} in browser (opens a new tab)`} href={emailLink(provider)} target="_blank" rel="noopener noreferrer" onClick={event => {
    if (!externalHref) { event.preventDefault(); invalidEmail(); }
    else feedback("Review the subject, message, and link in your email draft, then send. If you need to sign in first, return here and choose your email again.");
  }}>{tile ? <ShareIcon name="mail" /> : null}<span>{label}{provider === "outlook" && tile ? <small>Hotmail too</small> : null}</span>{!tile ? " ↗" : null}</a>;
  const titles: Record<Step, string> = { home: item.win ? "Share your win" : "Share this find", send: "Send to anyone", messages: "Send a text", email: item.win ? "Email your win" : "Email this item", crew: "Who would you like to share with?", find: "Find someone on Zero Loss", audience: "Who in your Crew?", group: editingGroup ? "Add people to your group" : "Create a new group", copy: "Copy this item’s link", contacts: "Add people from your phone" };
  const titleHeading = <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>{shared ? "Shared with your Crew" : step === "audience" && groupsOnly ? "Share with my groups" : titles[step]}</h2>;
  const compact = step === "home" || step === "email";
  const journey = !compact;

  return <dialog ref={dialog} className={`${styles.toast} ${popupStyles.dialog} ${journey ? styles.journeyDialog : ""}`} aria-labelledby={`${id}-title`} aria-label="Optional item sharing" onKeyDown={containDialogTab} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={`${styles.paper} ${compact ? styles.compact : styles.journey} ${step === "home" ? styles.perforated : ""} ${step === "email" ? styles.emailPaper : ""}`} ref={paper}>
      <div className={styles.top}>
        {step === "home" ? <div>{request ? <p className={styles.eyebrow} role="status">✓ Entry confirmed</p> : null}{titleHeading}</div> : <button type="button" className={styles.back} onClick={back} disabled={busy}>← Back</button>}
        <button type="button" className={styles.close} aria-label="Close sharing toast" onClick={onClose}>×</button>
      </div>
      {step !== "home" ? titleHeading : null}
      {!["group", "find", "copy", "contacts"].includes(step) ? itemSummary : null}

      {step === "home" ? <div className={styles.actions}>
        <div className={styles.duo}><button type="button" className={styles.primary} disabled={busy} onClick={() => void nativeShare()}><ShareIcon name="share" />Share…</button><button type="button" onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button></div>
        <button type="button" className={styles.crewButton} onClick={() => go("crew")}><ShareIcon name="crew" />Share with your Crew</button>
        <div ref={perforation} className={styles.perforation}>Or send directly</div>
        {shortcuts}
      </div> : null}

      {step === "send" ? <div className={styles.actions}>{shortcuts}<button type="button" onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button><p className={styles.note}>No Crew or group setup needed. You choose who receives the link.</p></div> : null}

      {step === "crew" ? <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => void loadAudiences()} disabled={busy}><ShareIcon name="crew" />Share with my Crew</button>
        <button type="button" className={styles.crewButton} onClick={() => void loadAudiences(true)} disabled={busy}><ShareIcon name="crew" />Share with my groups</button>
        <button type="button" onClick={() => go("find")}><ShareIcon name="search" />Find someone on Zero Loss</button>
        <button type="button" onClick={() => go("messages")}><ShareIcon name="message" />Send to anyone</button>
      </div> : null}

      {step === "messages" ? <>
        <div className={styles.field}><label htmlFor={`${id}-recipient`}>Phone number <span>· optional</span></label>
          <div className={styles.phoneRow}><input id={`${id}-recipient`} type="tel" maxLength={25} autoComplete="off" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone with country code" disabled={busy} />
            <button type="button" className={styles.crewButton} disabled={busy || !validPhone(phone) || requested.includes(contactKey(phone, "phone"))} onClick={() => void addPerson(phone.trim(), "phone")}>{requested.includes(contactKey(phone, "phone")) ? "Added" : "Add to Crew"}</button></div>
          <button type="button" className={styles.contactsButton} disabled={busy} onClick={() => openContacts("messages")}><ShareIcon name="crew" />Add people from your phone</button>
        </div>
        <p className={styles.messagePreview}>{text}</p>
        <details className={styles.preview}><summary>See the picture and link</summary>{pictureLink}<p className={styles.note}>Picture previews depend on the receiving app.</p></details>
        <div className={styles.duo}><a className={styles.primary} href={externalHref ?? undefined} onClick={event => {
          if (!externalHref) { event.preventDefault(); feedback("Enter a valid phone number, or leave it blank.", true); }
          else feedback("Review and send in your texting app. If it doesn’t open, use Copy link.");
        }}>Send text →</a><button type="button" onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button></div>
        <p className={styles.note}>Review and send in your texting app.</p>
      </> : null}

      {step === "contacts" ? <>
        <p className={styles.note}>Your phone will ask which contact details to share. Only the person you choose is used. Nothing is sent or added until you press Add to Crew or send in your app.</p>
        <button type="button" className={styles.crewButton} disabled={busy} onClick={() => void chooseContact()}><ShareIcon name="crew" />Choose from phone contacts</button>
        {contactChoices.map(contact => <button type="button" className={styles.contactChoice} key={`${contact.kind}-${contact.value}`} onClick={() => selectContact(contact)}><strong>{contact.name}</strong><span>{contact.value}</span></button>)}
        <button type="button" disabled={busy} onClick={back}>Enter details instead</button>
      </> : null}

      {step === "email" ? <>
        <section className={styles.emailChoices} aria-label="Email apps">
          <h3>Open a draft in</h3>
          <div className={styles.emailTiles}>
            {webmailLink("gmail", "Gmail", true)}
            {webmailLink("outlook", "Outlook", true)}
            <a className={styles.emailTile} aria-label="Use my default email app" href={externalHref ?? undefined} onClick={event => {
              if (!externalHref) { event.preventDefault(); invalidEmail(); }
              else feedback("Review and send in your email app. If it doesn’t open, choose Gmail or Outlook, or copy the message below.");
            }}><ShareIcon name="mail" /><span>Email app</span></a>
          </div>
          <p className={styles.note}>Choose your recipient in your email app.</p>
        </section>
        <details className={styles.more} ref={emailRecipientPanel}>
          <summary>Add recipient · optional</summary>
          <div className={styles.field}><label htmlFor={`${id}-recipient`}>Email address</label><input id={`${id}-recipient`} type="email" maxLength={254} autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" /></div>
        </details>
        <details className={styles.more}>
          <summary>Preview &amp; other email options</summary>
          <p className={styles.messagePreview}><strong>Subject: {item.title}</strong><br />{text}<br /><span className={styles.publicUrl}>{url}</span></p>
          <details className={styles.preview}><summary>See the picture and link</summary>{pictureLink}<p className={styles.note}>Picture previews depend on the receiving app.</p></details>
          {webmailLink("outlook-work", "Outlook for work or school")}
          <details className={styles.more}><summary>Copy the message instead</summary><textarea aria-label="Message with item link" readOnly value={body} onFocus={event => event.target.select()} /></details>
        </details>
        <p className={styles.ready}>✓ Subject, message + link ready</p>
        <p className={styles.note}>You review and send. Nothing sends automatically.</p>
      </> : null}

      {step === "copy" ? <>{pictureLink}<div className={styles.field}><label htmlFor={`${id}-link`}>Product link</label><textarea id={`${id}-link`} readOnly value={url} onFocus={event => event.target.select()} /></div>{shortcuts}</> : null}

      {step === "find" ? <>
        <form className={styles.field} onSubmit={event => { event.preventDefault(); search(); }}>
          <label htmlFor={`${id}-query`}>Name, email address, or phone number</label>
          <div className={styles.searchRow}><input id={`${id}-query`} value={query} onChange={event => { searchVersion.current += 1; setQuery(event.target.value); setReviewQuery(""); setPeople([]); }} autoComplete="off" maxLength={254} placeholder="Name, email, or phone" disabled={busy} /><button type="submit" className={styles.primary} disabled={busy} aria-label="Search for a member"><ShareIcon name="search" /></button></div>
        </form>
        <button type="button" className={styles.contactsButton} disabled={busy} onClick={() => openContacts("find")}><ShareIcon name="crew" />Add people from your phone</button>
        <p className={styles.note}>Matching members connect automatically and can leave at any time. Phone and email lookups stay private.</p>
        <div className={styles.findResults}>{people.map(person => <div className={styles.result} key={person.memberId}><div><strong>{person.name}</strong><small>Discoverable Zero Loss member</small></div><button type="button" className={styles.darkButton} disabled={busy || requested.includes(contactKey(person.memberId, "id"))} onClick={() => void addPerson(person.memberId, "id", person.name)}>{requested.includes(contactKey(person.memberId, "id")) ? "Added" : "Add to Crew"}</button></div>)}
        {reviewQuery ? <div className={styles.result}><div><strong>{reviewQuery}</strong><small>Automatic connection · opt-out available</small></div><button type="button" className={styles.darkButton} disabled={busy || requested.includes(contactKey(reviewQuery, crewLookupKind(reviewQuery) === "phone" ? "phone" : "email"))} onClick={() => void addPerson(reviewQuery, crewLookupKind(reviewQuery) === "phone" ? "phone" : "email")}>{requested.includes(contactKey(reviewQuery, crewLookupKind(reviewQuery) === "phone" ? "phone" : "email")) ? "Added" : "Add to Crew"}</button></div> : null}</div>
        <div className={`${styles.divider} ${styles.duo}`}><button type="button" className={styles.crewButton} disabled={busy} onClick={() => void loadAudiences()}>Share with Crew</button><button type="button" onClick={() => go("messages")}>Send to anyone</button></div>
      </> : null}

      {step === "audience" && shared ? <div className={styles.shareSuccess} role="status"><strong>✓ Your share is saved</strong><p>{message}</p><small>Returning to where you were…</small></div> : step === "audience" ? <>
        {options ? <>
          {!groupsOnly ? <div className={styles.audienceRow}>
            <label className={styles.audienceChoice}><input type="radio" name={`${id}-audience`} checked={!audience} disabled={busy || !options.memberCount} onChange={() => { setAudience(""); setShared(false); }} /><span>Everyone in my Crew<small>{options.memberCount} {options.memberCount === 1 ? "connection" : "connections"}</small></span></label>
            <button type="button" className={styles.addPeople} aria-label="Add People to my Crew" disabled={busy} onClick={() => go("find")}>Add People</button>
          </div> : null}
          <section className={styles.groupSection} aria-label="Your groups"><h3>Share with groups you’ve created</h3><div className={styles.groupList}>
            {options.groups.map(group => <div className={styles.audienceRow} key={group.id}>
              <input type="radio" name={`${id}-audience`} aria-label={`Share with ${group.name}`} checked={audience === group.id} disabled={busy || !group.memberCount} onChange={() => { setAudience(group.id); setShared(false); }} />
              <button type="button" className={styles.groupName} disabled={busy} aria-label={`Edit ${group.name}`} onClick={() => editGroup(group)}><span>{group.name}<small>{group.memberCount} connected {group.memberCount === 1 ? "person" : "people"}</small></span></button>
              <button type="button" className={styles.addPeople} aria-label={`Add People to ${group.name}`} disabled={busy} onClick={() => editGroup(group)}>Add People</button>
            </div>)}
            </div>{!options.groups.length ? <p className={styles.note}>No groups yet. Create one below.</p> : null}
          </section>
          {!recipientCount ? <p className={styles.note}>{groupsOnly && !audience ? "Choose a group above to share with." : "No connected members in this audience yet. Add someone to your Crew, then refresh."}</p> : null}
          <button type="button" className={styles.crewButton} disabled={busy || !recipientCount || shared} onClick={() => void shareCrew()}>{busy ? "Saving…" : shared ? "Shared with Crew" : item.win ? "Share your win" : audience || groupsOnly ? "Send to this group" : "Send to my Crew"}</button>
          {!request ? <p className={styles.note}>{item.win ? "Shares your win with selected Crew members who allow win updates." : "Sends this item’s link to the selected connected members."}</p> : null}
          <button type="button" disabled={busy} onClick={() => editGroup()}>＋ Create a new group</button>
        </> : <button type="button" disabled={busy} onClick={() => void loadAudiences(groupsOnly)}>{busy ? "Loading Crew…" : "Retry loading Crew"}</button>}
      </> : null}

      {step === "group" ? <>
        <form onSubmit={event => { event.preventDefault(); void createGroup(); }}>
          <div className={styles.field}><label htmlFor={`${id}-group`}>Group name</label><input id={`${id}-group`} value={groupName} onChange={event => setGroupName(event.target.value)} maxLength={50} required disabled={busy} placeholder="Family, Friends…" /></div>
          <h3>Choose connected Crew members</h3>
          {members.map(member => <label className={styles.choice} key={member.id}><input type="checkbox" checked={groupMembers.includes(member.id)} disabled={busy} onChange={event => setGroupMembers(current => event.target.checked ? [...current, member.id] : current.filter(id => id !== member.id))} /><span>{member.name}</span></label>)}
          {!members.length ? <p className={styles.note}>Create the group now, then add connected Crew members.</p> : null}
          <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save group"}</button>
        </form>
        <button type="button" className={styles.darkButton} disabled={busy} onClick={() => go("find")}>Find someone to add to my Crew</button>
        <p className={styles.note}>Add someone to your Crew, then refresh this list, select them, and save your group.</p>
        <button type="button" disabled={busy} onClick={() => void refreshMembers()}>Refresh Crew members</button>
        <Link className={styles.manage} href="/account/crew#crew-groups" onClick={onClose}>Manage groups and saved contacts →</Link>
      </> : null}

      {message && !shared ? <p role={error ? "alert" : "status"} className={`${styles.feedback} ${error ? styles.error : ""}`}>{message}</p> : null}
      {requested.length > 0 && ["messages", "find", "contacts"].includes(step) ? <Link className={styles.seeCrew} href="/account/crew#crew-intro" onClick={onClose}>See your Crew →</Link> : null}
      <button type="button" className={styles.later} onClick={onClose}>{shared ? "Done" : "Not now"}</button>
      <p className={styles.privacy}>{request && !shared ? "Your entry stays private unless you share it with your Crew." : "Your wallet and payment details stay private."}</p>
    </div>
  </dialog>;
}
