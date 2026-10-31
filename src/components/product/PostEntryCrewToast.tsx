"use client";

import { prepareProductShareLink } from "@/lib/sharing/receiving-actions";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { getCrewShareOptions, inviteToCrew, inviteToCrewById, inviteToCrewByPhone, removeCrewMember, saveCrewGroup, saveCrewMemberContact, searchCrewByName, shareConfirmedEntryWithCrew, sharePrizeWithCrew, shareWinWithCrew, type CrewSearchPerson, type CrewShareOptions } from "@/lib/crew/actions";
import type { CrewMemberContact } from "@/lib/crew/member-contact";
import { getProductShareItem } from "@/lib/sharing/actions";
import { crewLookupKind, emailHref, isAppleMobile, messageHref, nativeProductShareData, productShareText, productShareUrl, webmailHref, type WebmailProvider, type ProductShareItem } from "@/lib/sharing/product-share";
import type { CrewGroupContact } from "@/lib/crew/visibility";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import type { EntryRequest } from "@/lib/entries/request";
import { ShareIcon } from "./ShareIcon";
import styles from "./post-entry-crew-toast.module.css";
import popupStyles from "@/components/layout/responsive-popup.module.css";

type Step = "home" | "send" | "messages" | "email" | "crew" | "find" | "audience" | "group" | "copy" | "contacts" | "contactGroup" | "roster" | "contactEdit";
type PhoneContact = { name?: string[]; email?: string[]; tel?: string[] };
type ContactPicker = { select: (properties: string[], options: { multiple: boolean }) => Promise<PhoneContact[]> };
const contactKey = (value: string, kind: "id" | "email" | "phone") => kind === "phone" ? value.replace(/\D/g, "") : value.trim().toLowerCase();
const validPhone = (value: string) => /^\d{10,15}$/.test(value.replace(/\D/g, ""));
const samplePortraits = ["andre", "nora", "mateo", "sofia", "owen", "tessa", "samir", "jules"];
function CrewPortrait({ index }: { index: number }) {
  return <span className={styles.memberAvatar}><Image src={`/images/home/crew/person-${samplePortraits[index % samplePortraits.length]}.webp`} alt="" title="Sample portrait" width={34} height={34} className={styles.portrait} /></span>;
}
type Props = { onClose: () => void; focusOnOpen?: boolean } & ({ request: EntryRequest; product?: ProductShareItem } | { request?: undefined; product: ProductShareItem });
const emptyOptions: CrewShareOptions = { ok: true, message: "", memberCount: 0, members: [], groups: [] };

export function PostEntryCrewToast({ request, product, onClose, focusOnOpen = false }: Props) {
  const initialItem = product ?? { slug: request!.slug, title: request!.title };
  const [item, setItem] = useState<ProductShareItem>(initialItem);
  const [step, setStep] = useState<Step>("home");
  const history = useRef<Step[]>([]);
  const [origin] = useState(() => typeof window === "undefined" ? "" : window.location.origin);
  const [options, setOptions] = useState<CrewShareOptions | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupsOnly, setGroupsOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharedGroupName, setSharedGroupName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [people, setPeople] = useState<CrewSearchPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [findTargetGroup, setFindTargetGroup] = useState<string | null>(null);
  const findReturn = useRef<Step>("audience");
  const [groupFilter, setGroupFilter] = useState("");
  const findInput = useRef<HTMLInputElement>(null);
  const [requested, setRequested] = useState<string[]>([]);
  const [contactChoices, setContactChoices] = useState<{ value: string; kind: "phone" | "email"; name: string }[]>([]);
  const [pickedContact, setPickedContact] = useState<CrewGroupContact | null>(null);
  const [contactGroupId, setContactGroupId] = useState("");
  const contactReturn = useRef<"messages" | "find">("messages");
  const searchVersion = useRef(0);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const groupId = useRef<string | null>(null);
  const groupContacts = useRef<CrewGroupContact[]>([]);
  const [editingGroup, setEditingGroup] = useState(false);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(false);
  const [contactMemberId, setContactMemberId] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<CrewMemberContact>({ name: "", phone: "", email: "" });
  const contactEditorReturn = useRef<Step>("find");
  const [deleteContactConfirm, setDeleteContactConfirm] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const perforation = useRef<HTMLDivElement>(null);
  const emailRecipientPanel = useRef<HTMLDetailsElement>(null);
  const previousStep = useRef<Step | null>(null);
  const id = useId();
  const [shareToken, setShareToken] = useState<string | null>(null);
  const shareGroupId = selectedGroupIds.length === 1 ? selectedGroupIds[0] : null;
  useEffect(() => {
    let cancelled = false;
    void prepareProductShareLink(item.slug, shareGroupId).then(token => { if (!cancelled) { setShareToken(token); } }).catch(() => { if (!cancelled) { setShareToken(null); } });
    return () => { cancelled = true; };
  }, [item.slug, shareGroupId]);
  const url = origin ? productShareUrl(origin, item.slug, shareToken) : `/items/${item.slug}`;
  const text = productShareText(item.title, item);
  const body = `${text}\n${url}`;
  const members = options?.members ?? [];
  const selectedGroups = options?.groups.filter(group => selectedGroupIds.includes(group.id)) ?? [];
  const selectedGroup = selectedGroups.length === 1 ? selectedGroups[0] : undefined;
  const selectedRecipientCount = new Set(selectedGroups.flatMap(group => group.memberIds)).size;
  const portraitIndexes = new Map([...new Set([...members.map(member => member.id), ...people.map(person => person.memberId)])].sort().map((memberId, index) => [memberId, index]));

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    // The top layer keeps phone/tablet dialogs positioned against the viewport.
    element.showModal();
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const resize = () => {
      const height = Math.floor(Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight, window.visualViewport?.height ?? window.innerHeight));
      element.style.setProperty("--share-visible-height", `${height}px`);
      element.style.setProperty("--share-visible-top", `${window.visualViewport?.offsetTop ?? 0}px`);
      const ticketHeight = paper.current?.getBoundingClientRect().height ?? height;
      element.style.setProperty("--share-ticket-top", `${Math.max(0, Math.min(48, (height - 16 - ticketHeight) / 2))}px`);
    };
    resize(); window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (paper.current) observer?.observe(paper.current);
    heading.current?.focus({ preventScroll: true });
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", resize); observer?.disconnect();
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
  function back() { const previous = history.current.pop() ?? "home"; if (step === "audience" && previous === "audience") setGroupsOnly(false); setStep(previous); feedback(""); }
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
    setGroupsOnly(onlyGroups); setSelectedGroupIds([]); setShared(false);
    go("audience");
    await run(async () => {
      const result = await getCrewShareOptions();
      if (!alive.current) return;
      if (result.ok) setOptions(result); else feedback(result.message, true);
    });
  }

  const search = useCallback(() => {
    const version = ++searchVersion.current;
    const clean = query.trim();
    const kind = crewLookupKind(clean);
    setReviewQuery(""); setMessage(""); setError(false);
    if (kind !== "name") {
      if (kind === "email" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254)
        || kind === "phone" && !/^\d{10,15}$/.test(clean.replace(/\D/g, ""))) {
        setSearching(false); return;
      }
      setReviewQuery(clean); return;
    }
    if (clean.length < 3) return;
    setSearching(true);
    void searchCrewByName(clean).then(result => {
      if (!alive.current || version !== searchVersion.current) return;
      setPeople(result.people); setSearching(false);
      if (!result.ok) { setMessage(result.message); setError(true); }
    }).catch(() => { if (alive.current && version === searchVersion.current) { setSearching(false); setMessage("Search is unavailable. Please try again."); setError(true); } });
  }, [query]);

  useEffect(() => {
    if (step !== "find" || query.trim().length < 3) return;
    const timer = window.setTimeout(search, 350);
    return () => window.clearTimeout(timer);
  }, [step, query, search]);

  async function openFinder(targetGroup: string | null = null) {
    if (step === "home" || step === "crew") setGroupsOnly(false);
    findReturn.current = step === "home" || step === "crew" ? "audience" : step;
    setFindTargetGroup(targetGroup); setQuery(""); setReviewQuery(""); setSearching(false); go("find");
    if (!options) await run(async () => { const result = await getCrewShareOptions(); if (alive.current && result.ok) setOptions(result); });
  }

  function finishFinding() { if (history.current.at(-1) === findReturn.current) history.current.pop(); setStep(findReturn.current); feedback(""); }

  async function addPerson(value: string, kind: "id" | "email" | "phone", name?: string) {
    const key = contactKey(value, kind);
    if (requested.includes(key) && !findTargetGroup) return;
    await run(async () => {
      const before = options ?? await getCrewShareOptions();
      if (!before.ok) { feedback(before.message, true); return; }
      const alreadyConnected = kind === "id" && before.members.some(member => member.id === value);
      const result = alreadyConnected ? { ok: true, message: "Already connected." } : kind === "id" ? await inviteToCrewById(value) : kind === "email" ? await inviteToCrew(value) : await inviteToCrewByPhone(value);
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setRequested(current => [...new Set([...current, key])]);
      setShared(false);
      let addedName = name;
      try {
        const updated = await getCrewShareOptions();
        if (alive.current && updated.ok) {
          const newMembers = updated.members.filter(member => !before.members.some(previous => previous.id === member.id));
          const addedMember = kind === "id" ? updated.members.find(member => member.id === value) : newMembers.length === 1 ? newMembers[0] : undefined;
          addedName ||= addedMember?.name;
          if (findTargetGroup && addedMember) {
            const target = updated.groups.find(group => group.id === findTargetGroup);
            if (!target) { setOptions(updated); feedback("The Crew connection was saved, but that group is no longer available.", true); return; }
            const savedGroup = { id: target.id, name: target.name, memberIds: [...new Set([...target.memberIds, addedMember.id])], contacts: target.contacts ?? [] };
            const saved = await saveCrewGroup({ group: savedGroup, remove: false });
            if (!alive.current) return;
            if (!saved.ok) { setOptions(updated); feedback(`Crew connection saved. ${saved.message}`, true); return; }
            setOptions({ ...updated, groups: updated.groups.map(group => group.id === target.id ? { ...savedGroup, memberCount: savedGroup.memberIds.length } : group) });
            setSelectedGroupIds(current => [...new Set([...current, target.id])]);
            feedback(`${addedName || "This person"} added to your Crew and ${target.name}.`);
          } else {
            setOptions(updated);
            if (findReturn.current === "group" && addedMember) setGroupMembers(current => [...new Set([...current, addedMember.id])]);
            feedback(addedName ? `${addedName} added to your Crew.` : "Lookup saved. Matching members who allow connections appear in your Crew; phone and email details stay private.");
          }
          if (kind !== "id") setPeople(updated.members.map(member => ({ memberId: member.id, name: member.name, avatarUrl: null })));
          if (addedMember && !alreadyConnected) {
            setDeleteContactConfirm(false);
            contactEditorReturn.current = "find";
            setContactMemberId(addedMember.id);
            setContactDraft({ name: addedName || addedMember.name, phone: kind === "phone" ? value : addedMember.phone ?? "", email: kind === "email" ? value : addedMember.email ?? "" });
            history.current.push("find"); setStep("contactEdit");
          }
        } else feedback("Connection saved. Refresh your Crew to check the current people.");
      } catch { feedback("Connection saved. Reopen your Crew to refresh the people list."); }
      searchVersion.current += 1; setQuery(""); setReviewQuery(""); setSearching(false);
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
    setPickedContact({ id: crypto.randomUUID(), name: contact.name.slice(0, 80), phone: contact.kind === "phone" ? contact.value.trim() : "", email: contact.kind === "email" ? contact.value.trim() : "" });
    const destination = contactReturn.current === "messages" && contact.kind === "phone" ? "messages" : "find";
    if (destination === contactReturn.current) history.current.pop();
    if (destination === "messages") { setPhone(contact.value); setStep("messages"); }
    else { searchVersion.current += 1; setQuery(contact.value); setReviewQuery(contact.value); setPeople([]); setStep("find"); }
    feedback(`${contact.name} selected. Add to Crew, save to a group, or send in your app.`);
  }

  async function openContactGroups() {
    setContactGroupId(""); go("contactGroup");
    await run(async () => {
      const result = await getCrewShareOptions();
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setOptions(result);
    });
  }

  async function saveContactToGroup() {
    if (!pickedContact || !contactGroupId) return;
    await run(async () => {
      // Re-read before merging so other saved contacts and connected people survive.
      const latest = await getCrewShareOptions();
      if (!alive.current) return;
      if (!latest.ok) { feedback(latest.message, true); return; }
      const group = latest.groups.find(value => value.id === contactGroupId);
      if (!group) { feedback("That group is no longer available. Choose another group.", true); setOptions(latest); return; }
      const contacts = group.contacts ?? [];
      const exists = contacts.some(contact => Boolean(pickedContact.phone && contactKey(contact.phone, "phone") === contactKey(pickedContact.phone, "phone") || pickedContact.email && contactKey(contact.email, "email") === contactKey(pickedContact.email, "email")));
      const updated = { id: group.id, name: group.name, memberIds: group.memberIds, contacts: exists ? contacts : [...contacts, pickedContact] };
      const saved = await saveCrewGroup({ group: updated, remove: false });
      if (!alive.current) return;
      if (!saved.ok) { feedback(saved.message, true); return; }
      setOptions({ ...latest, groups: latest.groups.map(value => value.id === group.id ? { ...value, contacts: updated.contacts } : value) });
      feedback(`${pickedContact.name} ${exists ? "is already" : "is now"} saved in ${group.name}. No message was sent.`);
    });
  }

  function editGroup(group?: CrewShareOptions["groups"][number]) {
    groupId.current = group?.id ?? null;
    groupContacts.current = group?.contacts ?? [];
    setEditingGroup(Boolean(group));
    setDeleteGroupConfirm(false);
    setGroupName(group?.name ?? ""); setGroupMembers(group?.memberIds ?? []); setGroupFilter("");
    go("group");
  }

  function editContact(member: CrewShareOptions["members"][number]) {
    setDeleteContactConfirm(false);
    contactEditorReturn.current = step;
    setContactMemberId(member.id); setContactDraft({ name: member.name, phone: member.phone ?? "", email: member.email ?? "" });
    go("contactEdit");
  }

  async function deleteContact() {
    if (!contactMemberId) return;
    await run(async () => {
      const result = await removeCrewMember(contactMemberId);
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setOptions(current => current ? { ...current, memberCount: current.members.filter(member => member.id !== contactMemberId).length,
        members: current.members.filter(member => member.id !== contactMemberId),
        groups: current.groups.map(group => ({ ...group, memberIds: group.memberIds.filter(id => id !== contactMemberId), memberCount: group.memberIds.filter(id => id !== contactMemberId).length })) } : current);
      setRequested(current => current.filter(key => key !== contactKey(contactMemberId, "id")));
      setGroupMembers(current => current.filter(id => id !== contactMemberId));
      setDeleteContactConfirm(false); history.current.pop(); setStep(contactEditorReturn.current); feedback(`${contactDraft.name} removed from your Crew.`);
    });
  }

  async function saveContact() {
    if (!contactMemberId) return;
    await run(async () => {
      const saved = await saveCrewMemberContact(contactMemberId, contactDraft);
      if (!alive.current) return;
      if (!saved.ok) { feedback(saved.message, true); return; }
      const contact = { name: contactDraft.name.trim(), phone: contactDraft.phone.trim(), email: contactDraft.email.trim() };
      setOptions(current => current ? { ...current, members: current.members.map(member => member.id === contactMemberId ? { ...member, ...contact } : member) } : current);
      setPeople(current => current.map(person => person.memberId === contactMemberId ? { ...person, name: contact.name } : person));
      history.current.pop(); setStep(contactEditorReturn.current); feedback(`${contact.name} saved to your Crew.`);
    });
  }

  async function deleteGroup() {
    const group = options?.groups.find(value => value.id === groupId.current);
    if (!group) return;
    await run(async () => {
      const result = await saveCrewGroup({ group: { id: group.id, name: group.name, memberIds: group.memberIds, contacts: group.contacts ?? [] }, remove: true });
      if (!alive.current) return;
      if (!result.ok) { feedback(result.message, true); return; }
      setOptions(current => current ? { ...current, groups: current.groups.filter(value => value.id !== group.id) } : current);
      setSelectedGroupIds(current => current.filter(id => id !== group.id)); setGroupsOnly(true); setDeleteGroupConfirm(false); history.current.pop(); setStep("audience"); feedback(`${group.name} deleted. The people are still in your Crew.`);
    });
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
      setSelectedGroupIds(current => [...new Set([...current, group.id])]); setGroupsOnly(true); setShared(false); setStep("audience"); history.current.pop(); feedback(result.message);
    });
  }

  async function shareCrew(target: string[] | null) {
    const groups = target ? options?.groups.filter(value => target.includes(value.id)) ?? [] : [];
    const recipients = [...new Set(target ? groups.flatMap(group => group.memberIds) : members.map(member => member.id))];
    if (!recipients.length || target && groups.length !== target.length) return;
    await run(async () => {
      const singleGroup = groups.length === 1 ? groups[0].id : null;
      let result = { ok: true, message: "Your share is saved." };
      if (request && !item.win) result = await shareConfirmedEntryWithCrew(request.requestId, target && target.length > 1 ? target : singleGroup);
      else {
        let completed = 0;
        // Keep the existing server batch bound; a person in several groups is
        // included once, and canonical delivery actions make retries safe.
        for (let offset = 0; offset < recipients.length; offset += 20) {
          const batch = recipients.slice(offset, offset + 20);
          result = item.win ? await shareWinWithCrew(item.win.rewardId, batch) : await sharePrizeWithCrew(item.slug, batch, singleGroup);
          if (!alive.current) return;
          if (!result.ok) { feedback(`${completed ? `${completed} people already have a saved share. ` : ""}${result.message}`, true); return; }
          completed += batch.length;
        }
        if (recipients.length > 20) result = { ok: true, message: `Share saved for ${recipients.length} selected Crew members.` };
      }
      if (alive.current) { feedback(result.message, !result.ok); if (result.ok) setSharedGroupName(groups.length > 1 ? `${groups.length} groups` : groups[0]?.name ?? ""); setShared(result.ok); }
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
  const titles: Record<Step, string> = { home: item.win ? "Share your win" : "Share this find", send: "Send to anyone", messages: "Send a text", email: item.win ? "Email your win" : "Email this item", crew: "Who would you like to share with?", find: findTargetGroup ? `Add people to ${options?.groups.find(group => group.id === findTargetGroup)?.name ?? "your group"}` : "Add people", audience: "Share with your Crew", group: editingGroup ? "Edit your group" : "Create a new group", copy: "Copy this item’s link", contacts: "Add people from your phone", contactGroup: "Save contact to a group", roster: "People in your Crew", contactEdit: "Save this contact" };
  const titleHeading = <h2 id={`${id}-title`} ref={heading} tabIndex={-1}>{shared ? sharedGroupName ? `Shared with ${sharedGroupName}` : "Shared with your Crew" : step === "audience" && groupsOnly ? "Share with my groups" : titles[step]}</h2>;
  const compact = step === "home" || step === "email";
  const journey = true;
  const visiblePeople = people.length || query.trim().length >= 3 ? people : members.map(member => ({ memberId: member.id, name: member.name, avatarUrl: null }));
  const personAdded = (memberId: string) => findTargetGroup ? Boolean(options?.groups.find(group => group.id === findTargetGroup)?.memberIds.includes(memberId)) : members.some(member => member.id === memberId) || requested.includes(contactKey(memberId, "id"));

  return <dialog ref={dialog} className={`${styles.toast} ${popupStyles.dialog} ${journey ? styles.journeyDialog : ""}`} aria-labelledby={`${id}-title`} aria-label="Optional item sharing" onKeyDown={containDialogTab} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className={`${styles.paper} ${compact ? styles.compact : styles.journey} ${step === "home" ? styles.perforated : ""} ${step === "email" ? styles.emailPaper : ""}`} ref={paper}>
      <div className={styles.top}>
        {step === "home" ? <div>{request ? <p className={styles.eyebrow} role="status">✓ Entry confirmed</p> : null}{titleHeading}</div> : <button type="button" className={styles.back} onClick={back} disabled={busy}>← Back</button>}
        <button type="button" className={styles.close} aria-label="Close sharing toast" onClick={onClose}>×</button>
      </div>
      {step !== "home" ? <div className={styles.headingRow}>{titleHeading}{step === "group" && editingGroup ? <button type="button" className={styles.deleteGroup} disabled={busy} onClick={() => setDeleteGroupConfirm(true)}>Delete this group</button> : null}</div> : null}
      {step === "roster" ? <button type="button" className={styles.primary} disabled={busy || !members.length} onClick={() => { setStep("audience"); void shareCrew(null); }}>Send to my Crew</button> : null}
      {!["group", "find", "copy", "contacts", "contactGroup", "contactEdit"].includes(step) ? itemSummary : null}

      {step === "home" ? <div className={styles.actions}>
        <div className={styles.duo}><button type="button" className={styles.primary} disabled={busy} onClick={() => void nativeShare()}><ShareIcon name="share" />Share…</button><button type="button" onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button></div>
        <button type="button" className={styles.crewButton} disabled={busy} onClick={() => void loadAudiences()}><ShareIcon name="crew" />Share with Crew</button>
        <button type="button" className={styles.crewButton} disabled={busy} onClick={() => void loadAudiences(true)}><ShareIcon name="crew" />Share with group(s)</button>
        <button type="button" className={styles.back} disabled={busy} onClick={() => void openFinder()}>Find &amp; add someone</button>
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
          <div className={styles.phoneRow}><input id={`${id}-recipient`} type="tel" maxLength={25} autoComplete="off" value={phone} onChange={event => { setPhone(event.target.value); setPickedContact(null); }} placeholder="Phone with country code" disabled={busy} />
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
        {contactChoices.length > 1 ? <p className={styles.note}>These are details for one person. Choose the phone number or email you want to use.</p> : null}
        {contactChoices.map(contact => <button type="button" className={styles.contactChoice} key={`${contact.kind}-${contact.value}`} onClick={() => selectContact(contact)}><strong>{contact.name}</strong><span>{contact.value}</span></button>)}
        <button type="button" disabled={busy} onClick={back}>Enter details instead</button>
      </> : null}

      {step === "contactGroup" && pickedContact ? <>
        <div className={styles.result}><strong>{pickedContact.name}</strong><small>{pickedContact.phone || pickedContact.email}</small></div>
        <p className={styles.note}>Choose where to save this contact. Saving does not send a message or turn the contact into a connected member.</p>
        {options ? <fieldset className={styles.contactGroups}><legend>Choose a group</legend>{options.groups.map(group => <label className={styles.choice} key={group.id}><input type="radio" name={`${id}-contact-group`} value={group.id} checked={contactGroupId === group.id} onChange={() => { setContactGroupId(group.id); feedback(""); }} disabled={busy} /><span>{group.name}</span></label>)}</fieldset> : null}
        {options && !options.groups.length ? <p className={styles.note}>Create a group in Your Crew first, then return to save this contact.</p> : null}
        <button type="button" className={styles.crewButton} disabled={busy || !contactGroupId} onClick={() => void saveContactToGroup()}>{busy ? "Saving…" : "Save contact to group"}</button>
        <Link className={styles.seeCrew} href="/account/crew#crew-groups" onClick={onClose}>See your groups →</Link>
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
          <div className={styles.searchRow}><input ref={findInput} id={`${id}-query`} value={query} onChange={event => { searchVersion.current += 1; setQuery(event.target.value); setReviewQuery(""); setSearching(false); setPickedContact(null); }} autoComplete="off" maxLength={254} placeholder={requested.length ? "Add another person…" : "Name, email, or phone"} disabled={busy} /><button type="submit" className={styles.primary} disabled={busy} aria-label="Search for a member"><ShareIcon name="search" /></button></div>
        </form>
        {message ? <p role={error ? "alert" : "status"} className={`${styles.feedback} ${error ? styles.error : ""}`}>{message}</p> : null}
        <button type="button" className={styles.contactsButton} disabled={busy} onClick={() => openContacts("find")}><ShareIcon name="crew" />Add people from your phone</button>
        <p className={styles.note}>{searching ? "Searching…" : "Type a name for suggestions. Complete phone and email lookups stay private."}</p>
        <div className={styles.findResults}>{visiblePeople.map(person => <div className={styles.result} key={person.memberId}><div className={styles.personIdentity}><CrewPortrait index={portraitIndexes.get(person.memberId) ?? 0} /><div><strong>{person.name}</strong><small>{personAdded(person.memberId) ? "Connected" : "Discoverable Zero Loss member"}</small></div></div><button type="button" className={personAdded(person.memberId) ? styles.crewButton : styles.primary} disabled={busy || searching || personAdded(person.memberId)} onClick={() => void addPerson(person.memberId, "id", person.name)}>{personAdded(person.memberId) ? "✓ Added" : findTargetGroup ? "Add to group" : "Add to Crew"}</button></div>)}
        {reviewQuery ? <div className={styles.result}><div><strong>{reviewQuery}</strong><small>Automatic connection · opt-out available</small></div><button type="button" className={styles.darkButton} disabled={busy || requested.includes(contactKey(reviewQuery, crewLookupKind(reviewQuery) === "phone" ? "phone" : "email"))} onClick={() => void addPerson(reviewQuery, crewLookupKind(reviewQuery) === "phone" ? "phone" : "email")}>{requested.includes(contactKey(reviewQuery, crewLookupKind(reviewQuery) === "phone" ? "phone" : "email")) ? "Added" : "Add to Crew"}</button></div> : null}</div>
        <button type="button" className={styles.primary} disabled={busy} onClick={finishFinding}>Done · back to sharing</button>
        <div className={styles.duo}><button type="button" className={styles.back} onClick={() => go("roster")}>See &amp; Edit your Crew</button><button type="button" className={styles.back} onClick={() => { searchVersion.current += 1; setQuery(""); setReviewQuery(""); findInput.current?.focus(); }}>Add more people</button></div>
      </> : null}

      {step === "audience" && shared ? <div className={styles.shareSuccess} role="status"><strong>✓ Your share is saved</strong><p>{message}</p><small>Returning to where you were…</small></div> : step === "audience" ? <>
        {options ? <>
          {!groupsOnly ? <section aria-label="Share with Crew"><div className={styles.audienceRow}>
            <div className={styles.audienceChoice}><span>Share with Crew<small>{options.memberCount} {options.memberCount === 1 ? "connection" : "connections"}</small></span></div>
            <button type="button" className={styles.addPeople} aria-label="Add People to my Crew" disabled={busy} onClick={() => void openFinder()}>Add People</button>
          </div><div className={styles.memberFaces}>{members.map(member => <span key={member.id}><CrewPortrait index={portraitIndexes.get(member.id) ?? 0} /><small>{member.name}</small></span>)}</div><button type="button" className={styles.primary} disabled={busy || !options.memberCount} onClick={() => void shareCrew(null)}>Send to my Crew</button><div className={styles.duo}><button type="button" onClick={() => go("roster")}>See &amp; Edit your Crew</button><button type="button" onClick={() => void loadAudiences(true)}>Choose a group</button></div></section> : null}
          {groupsOnly ? <section className={styles.groupSection} aria-label="Your groups"><h3>Share with groups you’ve created</h3><div className={styles.groupList}>
            {options.groups.map(group => <div className={styles.audienceRow} key={group.id}>
              <label className={styles.groupChoice}><input type="checkbox" aria-label={`Share with ${group.name}`} checked={selectedGroupIds.includes(group.id)} disabled={busy} onChange={event => { setSelectedGroupIds(current => event.target.checked ? [...new Set([...current, group.id])] : current.filter(id => id !== group.id)); setShared(false); feedback(""); }} /><span>{group.name}<small>{group.memberCount} connected {group.memberCount === 1 ? "person" : "people"}{group.contacts?.length ? ` · ${group.contacts.length} saved ${group.contacts.length === 1 ? "contact" : "contacts"}` : ""}</small></span></label>
              <div className={styles.groupActions}><button type="button" className={styles.addPeople} aria-label={`Add People to ${group.name}`} disabled={busy} onClick={() => { setSelectedGroupIds(current => [...new Set([...current, group.id])]); void openFinder(group.id); }}><ShareIcon name="crew" /><span>Add</span></button><button type="button" className={styles.editGroup} aria-label={`Edit ${group.name}`} disabled={busy} onClick={() => editGroup(group)}>Edit</button></div>
            </div>)}
            </div>{!options.groups.length ? <p className={styles.note}>No groups yet. Create one below.</p> : null}
          </section> : null}
          {groupsOnly && !selectedGroupIds.length ? <p className={styles.note}>Choose one or more groups to share with.</p> : null}
          {groupsOnly && selectedGroup && !selectedGroup.memberCount ? <p className={styles.note}>Add people to {selectedGroup.name} to send this item.</p> : null}
          {groupsOnly ? <button type="button" className={styles.primary} disabled={busy || !selectedRecipientCount} onClick={() => void shareCrew(selectedGroupIds)}>{selectedGroups.length > 1 ? `Send to ${selectedGroups.length} groups` : selectedGroup ? `Send to ${selectedGroup.name}` : "Send to my groups"}</button> : null}
          {!request ? <p className={styles.note}>{item.win ? "Shares your win with selected Crew members who allow win updates." : "Sends this item’s link to the selected connected members."}</p> : null}
          {groupsOnly ? <button type="button" disabled={busy} onClick={() => editGroup()}>＋ Create a new group</button> : null}
        </> : <button type="button" disabled={busy} onClick={() => void loadAudiences(groupsOnly)}>{busy ? "Loading Crew…" : "Retry loading Crew"}</button>}
      </> : null}

      {step === "group" ? <>
        {deleteGroupConfirm ? <div className={styles.confirmDelete} role="region" aria-label="Confirm group deletion"><strong>Delete {groupName}?</strong><p>The people stay in your Crew.</p><div className={styles.duo}><button type="button" className={styles.deleteGroup} disabled={busy} onClick={() => void deleteGroup()}>Yes, delete group</button><button type="button" disabled={busy} onClick={() => setDeleteGroupConfirm(false)}>Cancel</button></div></div> : null}
        {!deleteGroupConfirm ? <>
        <form onSubmit={event => { event.preventDefault(); void createGroup(); }}>
          <div className={styles.field}><label htmlFor={`${id}-group`}>Group name</label><input id={`${id}-group`} value={groupName} onChange={event => setGroupName(event.target.value)} maxLength={50} required disabled={busy} placeholder="Family, Friends…" /></div>
          <h3>Choose connected Crew members</h3>
          <div className={styles.field}><label htmlFor={`${id}-group-search`}>Find people in your Crew</label><input id={`${id}-group-search`} value={groupFilter} onChange={event => setGroupFilter(event.target.value)} placeholder="Search your Crew" /></div>
          <div className={styles.groupMemberPicker}>{members.filter(member => member.name.toLowerCase().includes(groupFilter.trim().toLowerCase())).map(member => <div className={styles.memberRow} key={member.id}><label className={styles.choice}><input type="checkbox" checked={groupMembers.includes(member.id)} disabled={busy} onChange={event => setGroupMembers(current => event.target.checked ? [...new Set([...current, member.id])] : current.filter(id => id !== member.id))} /><span>{member.name}</span></label><button type="button" className={styles.editContact} aria-label={`Edit ${member.name}`} disabled={busy} onClick={() => editContact(member)}>Edit</button></div>)}</div>
          {!members.length ? <p className={styles.note}>Create the group now, then add connected Crew members.</p> : null}
          <button type="submit" className={styles.primary} disabled={busy}>{busy ? "Saving…" : "Save group"}</button>
        </form>
        <button type="button" disabled={busy} onClick={() => void openFinder()}>Find someone to add to my Crew</button>
        <details className={styles.more}><summary>More group options</summary><button type="button" disabled={busy} onClick={() => void refreshMembers()}>Refresh Crew members</button>
        <Link className={styles.manage} href="/account/crew#crew-groups" onClick={onClose}>Manage groups and saved contacts →</Link>
        </details>
        </> : null}
      </> : null}

      {step === "roster" ? <><p className={styles.note}>{members.length} people in your Crew</p><div className={styles.groupMemberPicker}>{members.map(member => <div className={styles.memberRow} key={member.id}><div className={styles.personIdentity}><CrewPortrait index={portraitIndexes.get(member.id) ?? 0} /><strong>{member.name}</strong></div><button type="button" className={styles.editContact} aria-label={`Edit ${member.name}`} disabled={busy} onClick={() => editContact(member)}>Edit</button><button type="button" className={styles.deleteContact} aria-label={`Delete ${member.name}`} disabled={busy} onClick={() => { editContact(member); setDeleteContactConfirm(true); }}>Delete</button></div>)}</div><button type="button" className={styles.primary} onClick={() => void openFinder()}>＋ Add people</button><button type="button" onClick={() => { setGroupsOnly(false); setStep("audience"); history.current = ["home"]; feedback(""); }}>Back to sharing</button></> : null}

      {step === "contactEdit" ? <>
        <p className={styles.note}>Choose the name and contact details you want to save in your Crew.</p>
        {deleteContactConfirm ? <div className={styles.confirmDelete} role="region" aria-label="Confirm contact deletion"><strong>Remove {contactDraft.name} from your Crew?</strong><p>This ends your Crew connection and shared-pick access.</p><div className={styles.duo}><button type="button" className={styles.deleteGroup} disabled={busy} onClick={() => void deleteContact()}>Yes, delete contact</button><button type="button" disabled={busy} onClick={() => setDeleteContactConfirm(false)}>Cancel</button></div></div> : <form onSubmit={event => { event.preventDefault(); void saveContact(); }}>
          <div className={styles.field}><label htmlFor={`${id}-contact-name`}>Name for your Crew</label><input id={`${id}-contact-name`} value={contactDraft.name} onChange={event => setContactDraft(current => ({ ...current, name: event.target.value }))} onFocus={event => event.target.select()} maxLength={80} autoComplete="off" required disabled={busy} /></div>
          <div className={styles.field}><label htmlFor={`${id}-contact-phone`}>Phone number <span>· {contactDraft.phone ? "Edit" : "Add"}</span></label><input id={`${id}-contact-phone`} type="tel" value={contactDraft.phone} onChange={event => setContactDraft(current => ({ ...current, phone: event.target.value }))} maxLength={32} autoComplete="off" placeholder="Add a phone number" disabled={busy} /></div>
          <div className={styles.field}><label htmlFor={`${id}-contact-email`}>Email address <span>· {contactDraft.email ? "Edit" : "Add"}</span></label><input id={`${id}-contact-email`} type="email" value={contactDraft.email} onChange={event => setContactDraft(current => ({ ...current, email: event.target.value }))} maxLength={254} autoComplete="off" placeholder="Add an email address" disabled={busy} /></div>
          <div className={styles.duo}><button type="submit" className={styles.primary} disabled={busy}>Save contact</button><button type="button" disabled={busy} onClick={back}>Cancel</button></div>
          <button type="button" className={styles.deleteContact} disabled={busy} onClick={() => setDeleteContactConfirm(true)}>Delete contact</button>
        </form>}
      </> : null}

      {pickedContact && ["messages", "find"].includes(step) ? <button type="button" className={styles.crewButton} disabled={busy} onClick={() => void openContactGroups()}>Save {pickedContact.name} to a group</button> : null}
      {message && !shared && step !== "find" ? <p role={error ? "alert" : "status"} className={`${styles.feedback} ${error ? styles.error : ""}`}>{message}</p> : null}
      {requested.length > 0 && ["messages", "contacts"].includes(step) ? <Link className={styles.seeCrew} href="/account/crew#crew-intro" onClick={onClose}>See your Crew →</Link> : null}
      <button type="button" className={styles.later} onClick={onClose}>{shared ? "Done" : "Not now"}</button>
      <p className={styles.privacy}>{request && !shared ? "Your entry stays private unless you share it with your Crew." : "Your wallet and payment details stay private."}</p>
    </div>
  </dialog>;
}
