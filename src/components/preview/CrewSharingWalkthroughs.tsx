"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import { ShareIcon } from "@/components/product/ShareIcon";
import { addPreviewPerson, findPreviewPeople, initialPreviewCrew, previewPeople, savePreviewGroup, sharingJourneys,
  type PreviewGroup, type SharingJourney } from "./crew-walkthrough-model";
import styles from "./crew-sharing-walkthroughs.module.css";

type Screen = "overview" | "entry" | "home" | "text" | "messages" | "share-sheet" | "email" | "crew" | "groups" | "find" | "roster" | "group-edit" | "contacts" | "success";
const productImage = "/dollar-choice-gaming.png";
const productTitle = "PlayStation 5 Slim Model";
const publicProductUrl = "https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app/items/playstation-5-slim";
const shareText = `Thought you might like ${productTitle} on Zero Loss. Take a look:`;
const screenTitles: Record<Screen, string> = {
  overview: "Sharing, made simple", entry: "Your Entry Details", home: "Share this find", text: "Send a text",
  messages: "Your message is ready", "share-sheet": "Choose where to share", email: "Your email draft",
  crew: "Share with your Crew", groups: "Share with a group", find: "Add people", roster: "People in your Crew",
  "group-edit": "Create a group", contacts: "Choose a phone contact", success: "Shared in this walkthrough",
};
const explanations: Partial<Record<Screen, string>> = {
  home: "Choose who receives the find. Each route brings you back to the same entry details.",
  crew: "Crew sharing gets its own short screen. The orange button clearly sends to everyone shown.",
  groups: "Select a group and send. Adding people stays here, without opening the full settings page.",
  find: "The people list stays visible. Typing filters it; Add marks the person as added and puts confirmation directly below the search. Your group stays selected.",
  "group-edit": "Name the group and pick people in one place. Save returns with the group selected, ready to share.",
  text: "No Crew or account is needed for the recipient. Your phone opens a draft; you choose who receives it.",
  messages: "This is a Messages simulation. A real messaging app controls its own picture preview and sends only when you tap Send.",
  roster: "Numbered test profiles make it easy to see exactly who you added. Viewing the Crew keeps your place in sharing.",
  contacts: "This screen illustrates the phone contact picker. This walkthrough never reads your real contacts.",
};

function PersonAvatar({ id }: { id: number }) { return <span className={styles.avatar} aria-hidden="true">{id}</span>; }
function ProductSummary() {
  return <div className={styles.product}><Image src={productImage} alt="PlayStation 5 Slim" width={62} height={62} /><div><strong>{productTitle}</strong><small>Best Buy · $650 value</small></div></div>;
}

export function CrewSharingWalkthroughs({ initialJourney }: { initialJourney: SharingJourney | null }) {
  const [journey, setJourney] = useState<SharingJourney>(initialJourney ?? "text");
  const [screen, setScreen] = useState<Screen>(initialJourney ? "home" : "overview");
  const [crew, setCrew] = useState(initialPreviewCrew);
  const [selectedGroupId, setSelectedGroupId] = useState("mom");
  const [query, setQuery] = useState("");
  const [findGroupId, setFindGroupId] = useState<string | null>(null);
  const [findReturn, setFindReturn] = useState<Screen>("crew");
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [notice, setNotice] = useState("");
  const [completion, setCompletion] = useState("");
  const [recipient, setRecipient] = useState("");
  const [contactsReturn, setContactsReturn] = useState<"text" | "find">("find");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [draftIds, setDraftIds] = useState<number[]>([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [success, setSuccess] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const landingHeading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const scrollBody = useRef<HTMLDivElement>(null);
  const history = useRef<Screen[]>([]);
  const id = useId();
  const modalOpen = screen !== "entry" && screen !== "overview";
  const selectedGroup = crew.groups.find(group => group.id === selectedGroupId);
  const findGroup = crew.groups.find(group => group.id === findGroupId);
  const results = query.trim().length < 3 ? previewPeople : findPreviewPeople(query);
  const groupResults = groupQuery.trim() ? findPreviewPeople(groupQuery) : previewPeople.filter(person => crew.memberIds.includes(person.id));
  const journeyIndex = sharingJourneys.findIndex(item => item.id === journey);

  useEffect(() => {
    const element = dialog.current;
    if (!modalOpen || !element) return;
    element.showModal();
    const previous = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const resize = () => {
      const viewport = window.visualViewport;
      const available = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight, viewport?.height ?? window.innerHeight);
      element.style.setProperty("--visible-height", `${Math.floor(available)}px`);
    };
    resize();
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("scroll", resize);
    return () => {
      element.close(); document.body.style.overflow = previous;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("scroll", resize);
    };
  }, [modalOpen]);

  useEffect(() => {
    if (scrollBody.current) scrollBody.current.scrollTop = 0;
    if (modalOpen) heading.current?.focus({ preventScroll: true });
    else {
      window.scrollTo({ top: 0, behavior: "instant" });
      landingHeading.current?.focus({ preventScroll: true });
    }
  }, [screen, modalOpen]);

  useEffect(() => {
    if (screen !== "success") return;
    const timer = window.setTimeout(() => { setCompletion(success); setScreen("entry"); }, 2600);
    return () => window.clearTimeout(timer);
  }, [screen, success]);

  function go(next: Screen) { history.current.push(screen); setNotice(""); setScreen(next); }
  function back() { setNotice(""); setScreen(history.current.pop() ?? "home"); }
  function close() { setScreen("entry"); setNotice(""); }
  function overview() { setScreen("overview"); window.history.replaceState(null, "", "/crew-walkthroughs"); }
  function start(next: SharingJourney) {
    setJourney(next); setCrew(initialPreviewCrew()); setSelectedGroupId("mom"); setQuery(""); setAddedIds([]);
    setNotice(""); setCompletion(""); history.current = []; setScreen("home");
    window.history.replaceState(null, "", `/crew-walkthroughs?journey=${next}`);
  }
  function finish(message: string) { setSuccess(message); setScreen("success"); }
  function openFinder(groupId: string | null = null) {
    setFindGroupId(groupId); setFindReturn(screen); setQuery(""); setAddedIds([]); go("find");
  }
  function addPerson(personId: number) {
    setCrew(current => addPreviewPerson(current, personId, findGroupId));
    setAddedIds(current => [...new Set([...current, personId])]);
    setQuery("");
    setNotice(`Test Customer ${personId} added to ${findGroup ? `your Crew and ${findGroup.name}` : "your Crew"}.`);
    searchInput.current?.focus({ preventScroll: true });
  }
  function editGroup(group?: PreviewGroup) {
    setEditingGroupId(group?.id ?? null); setGroupName(group?.name ?? ""); setDraftIds(group?.memberIds ?? []); setGroupQuery(""); go("group-edit");
  }
  function commitGroup() {
    if (!groupName.trim()) return;
    const next = savePreviewGroup(crew, editingGroupId, groupName, draftIds);
    const groupId = editingGroupId ?? next.groups[next.groups.length - 1].id;
    setCrew(next); setSelectedGroupId(groupId); setScreen("groups");
    setNotice(`${groupName.trim()} saved with ${draftIds.length} ${draftIds.length === 1 ? "person" : "people"}. Ready to share.`);
    history.current = ["home"];
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(publicProductUrl); setNotice("Link copied. Paste it into your conversation."); }
    catch { go("messages"); setNotice("Copy this address from the message preview below."); }
  }
  const isAdded = (personId: number) => findGroup ? findGroup.memberIds.includes(personId) : crew.memberIds.includes(personId);
  const title = screen === "find" && findGroup ? `Add people to ${findGroup.name}`
    : screen === "group-edit" && editingGroupId ? "Edit your group" : screenTitles[screen];

  return <div className={styles.page}>
    <div className={styles.reviewBar}><span>SHARING WALKTHROUGHS</span><small>Preview only · fictional people · no messages sent</small></div>
    {screen === "overview" ? <section className={styles.overview}>
      <span className={styles.eyebrow}>FOUR COMPLETE JOURNEYS</span><h1 ref={landingHeading} tabIndex={-1}>Sharing, made simple.</h1>
      <p>Try each path with the same find. Add people, build a group, and see exactly where you land.</p>
      <div className={styles.journeyGrid}>{sharingJourneys.map((item, index) => <button key={item.id} onClick={() => start(item.id)}><b>0{index + 1}</b><strong>{item.title}</strong><span>{item.description}</span><small>Start walkthrough →</small></button>)}</div>
      <p className={styles.overviewNote}>Use Test Customer 1–5, 1111111111–5555555555, or testcustomer1@example.test. Changes are simulated and reset when you restart.</p>
      <Link href="https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app/items/playstation-5-slim">Back to the regular site →</Link>
    </section> : <section className={styles.entry} aria-label="Walkthrough entry details">
      <div className={styles.pathTabs}>{sharingJourneys.map((item, index) => <button key={item.id} aria-pressed={journey === item.id} onClick={() => start(item.id)}>{index + 1}. {item.id === "add" ? "Add people" : item.id === "group" ? "Groups" : item.id === "crew" ? "Crew" : "Text"}</button>)}</div>
      <span className={styles.eyebrow}>MY ACTIVITY</span><h1 ref={landingHeading} tabIndex={-1}>Your Entry Details</h1><p>Your 4 saved entries for the prize below.</p>
      {completion ? <div className={styles.completed} role="status"><strong>✓ Walkthrough complete</strong><span>{completion}</span><small>Nothing was sent and your real account is unchanged.</small></div> : null}
      <div className={styles.entryPaper}><ProductSummary /><div className={styles.pending}>NO WINNERS YET. WE WILL NOTIFY YOU WHEN THE POOL IS COMPLETE.</div>
        <div className={styles.entryStats}><div><small>Entered</small><strong>Oct 30, 2026</strong><span>4 separate entries</span></div><div><b>68%</b><small>607 tickets left</small></div></div>
        <div className={styles.prizeRow}><span>Prize number<strong>PRZ-1936474803</strong></span><button className={styles.orange} onClick={() => { history.current = []; setScreen("home"); }}><ShareIcon name="share" />Share</button></div>
      </div>
      <div className={styles.entryActions}><button className={styles.orange} onClick={() => start(journey)}>Restart this journey</button><button onClick={overview}>All four journeys</button></div>
      <p className={styles.overviewNote}>This is where every completed sharing journey returns.</p>
    </section>}

    {modalOpen ? <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-heading`} onCancel={event => { event.preventDefault(); close(); }} onKeyDown={containDialogTab}>
      <div className={styles.ticket}>
        <header className={styles.modalHead}><div><span className={styles.journeyLabel}>JOURNEY {journeyIndex + 1} OF 4 · {sharingJourneys[journeyIndex].title}</span><button className={styles.back} onClick={screen === "home" ? overview : back}>{screen === "home" ? "← All journeys" : "← Back"}</button></div><button className={styles.close} aria-label="Close walkthrough" onClick={close}>×</button></header>
        <h2 id={`${id}-heading`} ref={heading} tabIndex={-1}>{title}</h2>
        {screen !== "contacts" ? <ProductSummary /> : null}
        <div ref={scrollBody} className={`${styles.content} ${screen === "find" ? styles.pickerContent : ""}`}>
          {screen === "home" ? <div className={styles.stack}>
            <div className={styles.duo}><button className={styles.orange} onClick={() => go("share-sheet")}><ShareIcon name="share" />Share…</button><button onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button></div>
            <button className={journey === "crew" ? styles.orange : styles.blue} onClick={() => go("crew")}><ShareIcon name="crew" />Share with Crew</button>
            <button className={styles.blue} onClick={() => go("groups")}><ShareIcon name="crew" />Share with group(s)</button>
            <button className={journey === "add" ? styles.orange : styles.plainLink} onClick={() => { setFindReturn("crew"); setFindGroupId(null); setQuery(""); setAddedIds([]); go("find"); }}>Find &amp; add someone</button>
            <div className={styles.separator}>OR SEND DIRECTLY</div><div className={styles.duo}><button className={journey === "text" ? styles.orange : ""} onClick={() => go("text")}><ShareIcon name="message" />Text</button><button onClick={() => go("email")}><ShareIcon name="mail" />Email</button></div>
          </div> : null}

          {screen === "crew" ? <div className={styles.stack}>
            <div className={styles.rowHeading}><strong>{crew.memberIds.length} people in your Crew</strong><button className={styles.plainLink} onClick={() => go("roster")}>See your Crew →</button></div>
            <div className={styles.faces}>{crew.memberIds.map(personId => <div key={personId}><PersonAvatar id={personId} /><span>Customer {personId}</span></div>)}</div>
            <p className={styles.note}>Everyone shown receives this find. Your wallet and payment details stay private.</p>
            <button className={styles.orange} disabled={!crew.memberIds.length} onClick={() => finish(`Shared ${productTitle} with ${crew.memberIds.length} Crew members.`)}>Send to my Crew</button>
            <div className={styles.duo}><button onClick={() => openFinder()}>＋ Add people</button><button onClick={() => go("groups")}>Choose a group</button></div>
          </div> : null}

          {screen === "groups" ? <div className={styles.stack}>
            <fieldset className={styles.groupList}><legend>Choose who receives this find</legend>{crew.groups.map(group => <div key={group.id} className={`${styles.groupRow} ${selectedGroupId === group.id ? styles.selected : ""}`}>
              <label><input type="radio" name={`${id}-group`} checked={selectedGroupId === group.id} onChange={() => { setSelectedGroupId(group.id); setNotice(""); }} /><span><strong>{group.name}</strong><small>{group.memberIds.length} {group.memberIds.length === 1 ? "person" : "people"}</small></span></label>
              <button className={styles.smallButton} aria-label={`Add people to ${group.name}`} onClick={() => { setSelectedGroupId(group.id); openFinder(group.id); }}>＋ People</button>
            </div>)}</fieldset>
            {selectedGroup && !selectedGroup.memberIds.length ? <p className={styles.note}>Add people to {selectedGroup.name} to share with this group.</p> : null}
            <button className={styles.orange} disabled={!selectedGroup?.memberIds.length} onClick={() => finish(`Shared ${productTitle} with ${selectedGroup?.name} (${selectedGroup?.memberIds.length} ${selectedGroup?.memberIds.length === 1 ? "person" : "people"}).`)}>Send to {selectedGroup?.name ?? "my group"}</button>
            <div className={styles.duo}><button onClick={() => editGroup()}>＋ Create group</button><button disabled={!selectedGroup} onClick={() => editGroup(selectedGroup)}>Edit selected group</button></div>
          </div> : null}

          {screen === "find" ? <div className={styles.finder}>
            <label className={styles.field} htmlFor={`${id}-search`}>{findGroup ? "Add to your Crew and this group" : "Name, email, or phone number"}<div className={styles.searchField}><ShareIcon name="search" /><input ref={searchInput} id={`${id}-search`} value={query} placeholder={addedIds.length ? "Add another person…" : "Try Test Customer 1"} onChange={event => { setQuery(event.target.value); setNotice(""); }} autoComplete="off" aria-controls={`${id}-results`} /></div></label>
            {notice ? <p className={`${styles.notice} ${styles.searchReceipt}`} role="status">✓ {notice}</p> : null}
            <button className={styles.phoneContacts} onClick={() => { setContactsReturn("find"); go("contacts"); }}><ShareIcon name="crew" />Add people from your phone</button>
            <div className={styles.searchResultHeading}><strong>{query.trim().length >= 3 ? "Matching people" : "Suggested people"}</strong><span>{crew.memberIds.length} in your Crew</span></div>
            <div className={styles.results} id={`${id}-results`} aria-label="Matching people" aria-live="polite">{results.map(person => <div className={`${styles.personRow} ${isAdded(person.id) ? styles.addedPerson : ""}`} key={person.id}><PersonAvatar id={person.id} /><div><strong>{person.name}</strong><small>{person.email}</small><small>{person.phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")}</small></div><button className={isAdded(person.id) ? styles.smallButton : `${styles.smallButton} ${styles.orange}`} disabled={isAdded(person.id)} aria-label={`${isAdded(person.id) ? "Already added" : "Add"} ${person.name}`} onClick={() => addPerson(person.id)}>{isAdded(person.id) ? "✓ Added" : "＋ Add"}</button></div>)}
              {!results.length ? <p className={styles.emptyHint}>No demo match yet. Keep typing a complete phone or email, or try Test Customer 1.</p> : null}
            </div>
          </div> : null}

          {screen === "roster" ? <div className={styles.stack}>
            <p className={styles.note}>{crew.memberIds.length} people connected in this walkthrough.</p><div className={styles.roster}>{previewPeople.filter(person => crew.memberIds.includes(person.id)).map(person => <div className={styles.personRow} key={person.id}><PersonAvatar id={person.id} /><div><strong>{person.name}</strong><small>{person.email}</small></div><span className={styles.connected}>✓</span></div>)}</div>
            <button className={styles.orange} onClick={() => openFinder(findGroupId)}>＋ Add people</button><button onClick={back}>Back to where I was</button>
          </div> : null}

          {screen === "group-edit" ? <form id={`${id}-group-form`} className={styles.stack} onSubmit={event => { event.preventDefault(); commitGroup(); }}>
            <label className={styles.field}>Group name<input value={groupName} onChange={event => setGroupName(event.target.value)} maxLength={50} placeholder="Family, Friends, Movie night…" required /></label>
            <div className={styles.rowHeading}><strong>{draftIds.length} selected</strong><small>Saved together when you finish</small></div>
            <div className={styles.addedStrip}>{draftIds.map(personId => <button type="button" key={personId} aria-label={`Remove Test Customer ${personId} from selection`} onClick={() => setDraftIds(current => current.filter(value => value !== personId))}>✓ Customer {personId} ×</button>)}</div>
            <label className={styles.field}>Find people<input value={groupQuery} onChange={event => setGroupQuery(event.target.value)} autoComplete="off" placeholder="Search name, phone, or email" /></label>
            <div className={styles.memberChoices}>{groupResults.map(person => <label key={person.id}><input type="checkbox" checked={draftIds.includes(person.id)} onChange={event => setDraftIds(current => event.target.checked ? [...new Set([...current, person.id])] : current.filter(value => value !== person.id))} /><PersonAvatar id={person.id} /><span><strong>{person.name}</strong><small>{crew.memberIds.includes(person.id) ? "In your Crew" : "Add to your Crew and group"}</small></span></label>)}{!groupResults.length ? <p className={styles.emptyHint}>Try Test Customer 1–5.</p> : null}</div>
          </form> : null}

          {screen === "text" ? <div className={styles.stack}>
            <p className={styles.note}>Your texting app opens with the message ready. Choose recipients there, or enter a number here.</p>
            <label className={styles.field}>Phone number · optional<input type="tel" value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Choose in Messages, or type here" /></label>
            <button onClick={() => { setContactsReturn("text"); go("contacts"); }}><ShareIcon name="crew" />Choose from phone contacts</button>
            <div className={styles.messageDraft}>{shareText}<span>{publicProductUrl}</span></div>
            <button className={styles.orange} onClick={() => go("messages")}>Open Messages preview →</button>
            <button className={styles.plainLink} onClick={() => void copyLink()}>Copy link instead</button>
          </div> : null}

          {screen === "messages" ? <div className={styles.stack}>
            <div className={styles.messagesShell}><div className={styles.messagesTo}>To: {recipient.trim() || "Choose a recipient in your app"}</div><div className={styles.messageBubble}><p>{shareText}</p><span>{publicProductUrl}</span><div className={styles.linkPreview}><Image src={productImage} alt="PlayStation product link preview" width={180} height={110} /><strong>{productTitle}</strong><small>Zero Loss · Best Buy</small></div></div></div>
            <p className={styles.note}>Messages simulation. The real app may display its preview differently.</p>
            <button className={styles.orange} onClick={() => finish("Texting walkthrough finished. You return to the same entry details after using Messages.")}>Simulate Send →</button>
          </div> : null}

          {screen === "contacts" ? <div className={styles.stack}>
            <p className={styles.note}>Your phone would ask which contact to share. These are sample contacts; this preview does not access your phone.</p>
            <div className={styles.roster}>{previewPeople.map(person => <button className={styles.personRow} key={person.id} onClick={() => { if (contactsReturn === "text") setRecipient(person.phone); else setQuery(person.name); setScreen(contactsReturn); setNotice(""); }}><PersonAvatar id={person.id} /><span><strong>{person.name}</strong><small>{person.phone}</small></span><span>→</span></button>)}</div>
          </div> : null}

          {screen === "share-sheet" ? <div className={styles.stack}><p className={styles.note}>On your phone, Share opens its own app choices. Here you can try the same handoff safely.</p><button className={styles.orange} onClick={() => go("messages")}><ShareIcon name="message" />Messages</button><button onClick={() => go("email")}><ShareIcon name="mail" />Email</button><button onClick={() => void copyLink()}><ShareIcon name="link" />Copy link</button></div> : null}
          {screen === "email" ? <div className={styles.stack}><p className={styles.note}>The existing email handoff stays available. This draft is a simulation.</p><label className={styles.field}>To<input type="email" placeholder="testcustomer1@example.test" /></label><div className={styles.messageDraft}><strong>Subject: {productTitle}</strong><p>{shareText}</p><span>{publicProductUrl}</span></div><button className={styles.orange} onClick={() => finish("Email draft walkthrough finished. Your real email account is unchanged.")}>Finish email preview</button></div> : null}

          {screen === "success" ? <div className={styles.success}><span>✓</span><strong>All set.</strong><p>{success}</p><small>Simulated only. Returning to entry details…</small><button onClick={() => { setCompletion(success); close(); }}>Back to entry details</button></div> : null}
          {notice && screen !== "find" ? <p className={styles.notice} role="status">{notice}</p> : null}
        </div>
        <footer className={styles.modalFooter}>
          {screen === "find" ? <div className={styles.finderFooter}><button className={styles.orange} onClick={() => { setScreen(findReturn === "home" ? "crew" : findReturn); setNotice(""); }}>{findGroup ? `Done · back to ${findGroup.name}` : "Done · back to sharing"}</button><div className={styles.duo}><button className={styles.plainLink} onClick={() => go("roster")}>See your Crew →</button><button className={styles.plainLink} onClick={() => { setQuery(""); searchInput.current?.focus(); }}>Add more people</button></div></div> : null}
          {screen === "group-edit" ? <div className={styles.duo}><button type="submit" form={`${id}-group-form`} className={styles.orange} disabled={!groupName.trim()}>Save group</button><button type="button" onClick={back}>Cancel</button></div> : null}
          {screen !== "success" ? <><details className={styles.why}><summary>Why this step?</summary><p>{explanations[screen] ?? "Choose where to send the product link, then return to your entry details."}</p></details>{screen !== "group-edit" ? <button className={styles.notNow} onClick={close}>Not now</button> : null}</> : null}
          <small className={styles.previewNote}>Review only · no messages sent or account changes</small>
        </footer>
      </div>
    </dialog> : null}
  </div>;
}
