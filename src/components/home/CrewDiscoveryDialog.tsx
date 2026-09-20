"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type MouseEvent, type PointerEvent, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { inviteToCrew, inviteToCrewById, inviteToCrewByPhone, searchCrewByName, type CrewSearchPerson } from "@/lib/crew/actions";
import { addSampleCrewPreview, sampleCrewPeople, useSampleCrewPreviews, type SampleCrewName } from "@/lib/crew/sample-preview";
import { SharedPicksConcept } from "./SharedPicksConcept";
import base from "./CrewAndWinnerPreview.module.css";
import styles from "./CrewDiscoveryDialog.module.css";

type SearchKind = "name" | "phone" | "email";
type PhoneContact = { name?: string[]; email?: string[]; tel?: string[] };
type ContactPicker = { select: (properties: Array<"name" | "email" | "tel">, options: { multiple: boolean }) => Promise<PhoneContact[]> };

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.75" cy="10.75" r="6.75" /><path d="m16 16 4 4" /></svg>;
}

export function CrewDiscoveryPanel({ onClose, outerPanelRef }: { onClose: () => void; outerPanelRef: RefObject<HTMLElement | null> }) {
  const router = useRouter();
  const previewRequests = useSampleCrewPreviews();
  const [values, setValues] = useState({ name: "", phone: "", email: "" });
  const [nameFilter, setNameFilter] = useState("");
  const [realResults, setRealResults] = useState<CrewSearchPerson[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<SampleCrewName | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const drag = useRef({ active: false, moved: false, x: 0, scrollLeft: 0 });
  const samples = nameFilter ? sampleCrewPeople.filter((person) => person.name.toLowerCase().includes(nameFilter)) : sampleCrewPeople;

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!selected) return;
    const stage = stageRef.current;
    const rail = railRef.current;
    const tab = tabRef.current;
    const panel = panelRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!stage || !rail || !tab || !panel || !svg || !path) return;

    let frame = 0;
    const draw = () => {
      const stageRect = stage.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const left = panelRect.left - stageRect.left + 1;
      const right = panelRect.right - stageRect.left - 1;
      const top = panelRect.top - stageRect.top + 1;
      const bottom = panelRect.bottom - stageRect.top - 1;
      const radius = 18;
      const tabIsVisible = tabRect.right > railRect.left + 3 && tabRect.left < railRect.right - 3;
      const tabLeft = Math.max(left, tabRect.left - stageRect.left + 1);
      const tabRight = Math.min(right, tabRect.right - stageRect.left - 1);
      const tabTop = tabRect.top - stageRect.top + 1;
      const joinRight = Math.min(12, (right - radius - tabRight) / 2);
      const joinLeft = Math.min(12, (tabLeft - left - radius) / 2);
      const rightEdgeJoin = joinRight < 3 && tabRight >= right - radius - 6;
      const connected = tabIsVisible && tabRight - tabLeft > 30 && tabTop < top - radius && (joinRight >= 3 || rightEdgeJoin);
      let outline = "";
      if (connected) {
        outline = rightEdgeJoin
          ? `M ${left + radius} ${bottom} H ${right - radius} Q ${right} ${bottom} ${right} ${bottom - radius} V ${tabTop + radius} Q ${right} ${tabTop} ${right - radius} ${tabTop} H ${tabLeft + radius} Q ${tabLeft} ${tabTop} ${tabLeft} ${tabTop + radius}`
          : `M ${left + radius} ${bottom} H ${right - radius} Q ${right} ${bottom} ${right} ${bottom - radius} V ${top + radius} Q ${right} ${top} ${right - radius} ${top} H ${tabRight + joinRight} Q ${tabRight} ${top} ${tabRight} ${top - joinRight} V ${tabTop + radius} Q ${tabRight} ${tabTop} ${tabRight - radius} ${tabTop} H ${tabLeft + radius} Q ${tabLeft} ${tabTop} ${tabLeft} ${tabTop + radius}`;
        if (tabLeft <= left + 4) {
          outline += ` V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
        } else if (joinLeft >= 3) {
          outline += ` V ${top - joinLeft} Q ${tabLeft} ${top} ${tabLeft - joinLeft} ${top} H ${left + radius} Q ${left} ${top} ${left} ${top + radius} V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
        } else {
          const smallJoin = Math.max(2, (tabLeft - left) / 2);
          outline += ` V ${top - smallJoin} Q ${tabLeft} ${top} ${left} ${top} V ${bottom - radius} Q ${left} ${bottom} ${left + radius} ${bottom} Z`;
        }
      }
      svg.setAttribute("viewBox", `0 0 ${stageRect.width} ${stageRect.height}`);
      path.setAttribute("d", outline);
    };
    const scheduleDraw = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    const initialTab = tab.getBoundingClientRect();
    const initialRail = rail.getBoundingClientRect();
    const initialPanel = panel.getBoundingClientRect();
    if ((initialTab.right > initialPanel.right - 30 || initialTab.left < initialPanel.left) && typeof rail.scrollTo === "function") {
      rail.scrollTo({ left: rail.scrollLeft + initialTab.left - initialRail.left - 4, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
    draw();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleDraw) : null;
    observer?.observe(stage);
    observer?.observe(rail);
    observer?.observe(tab);
    observer?.observe(panel);
    rail.addEventListener("scroll", scheduleDraw, { passive: true });
    window.addEventListener("resize", scheduleDraw);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); rail.removeEventListener("scroll", scheduleDraw); window.removeEventListener("resize", scheduleDraw); };
  }, [selected, samples.length]);

  function moveRail(direction: -1 | 1) {
    const rail = railRef.current;
    const card = rail?.firstElementChild;
    if (!rail || !(card instanceof HTMLElement)) return;
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !railRef.current) return;
    drag.current = { active: true, moved: false, x: event.clientX, scrollLeft: railRef.current.scrollLeft };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!drag.current.active || !rail) return;
    const distance = event.clientX - drag.current.x;
    if (Math.abs(distance) > 5) drag.current.moved = true;
    if (!drag.current.moved) return;
    event.preventDefault();
    rail.style.scrollBehavior = "auto";
    rail.style.scrollSnapType = "none";
    if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
    rail.scrollLeft = drag.current.scrollLeft - distance;
  }
  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    drag.current.active = false;
    if (railRef.current) { railRef.current.style.scrollBehavior = ""; railRef.current.style.scrollSnapType = ""; }
    if (railRef.current?.hasPointerCapture(event.pointerId)) railRef.current.releasePointerCapture(event.pointerId);
  }
  function preventDraggedClick(event: MouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  async function submitSearch(kind: SearchKind) {
    const query = values[kind].trim();
    if (!query) { setMessage(`Enter a ${kind === "phone" ? "phone number" : kind === "email" ? "email address" : "name"} first.`); return; }
    if (kind === "name" && query.length < 3) { setMessage("Enter at least 3 letters to search by name."); return; }
    setPending(true);
    try {
      if (kind === "name") {
        setNameFilter(query.toLowerCase());
        setSelected(null);
        const result = await searchCrewByName(query);
        setRealResults(result.people);
        setMessage(result.message);
      } else {
        const result = kind === "phone" ? await inviteToCrewByPhone(query) : await inviteToCrew(query);
        setMessage(result.message);
        if (result.ok) router.refresh();
      }
    } catch {
      setMessage("We couldn’t connect right now. Please try again.");
    } finally { setPending(false); }
  }

  async function chooseContact() {
    const picker = (navigator as Navigator & { contacts?: ContactPicker }).contacts;
    if (!picker?.select) { setMessage("This browser doesn’t support choosing a phone contact. You can enter their details above instead."); return; }
    try {
      const [contact] = await picker.select(["name", "email", "tel"], { multiple: false });
      if (!contact) return;
      setValues((current) => ({ name: contact.name?.[0] ?? current.name, phone: contact.tel?.[0] ?? current.phone, email: contact.email?.[0] ?? current.email }));
      setMessage("Contact selected. Review their details, then choose whether to send a request. Your address book was not uploaded.");
    } catch { setMessage("No contact was selected. You can enter their details manually."); }
  }

  async function requestRealPerson(person: CrewSearchPerson) {
    setPending(true);
    try {
      const result = await inviteToCrewById(person.memberId);
      setMessage(result.message);
      if (result.ok) { setRequestedIds((current) => [...current, person.memberId]); router.refresh(); }
    } catch { setMessage("The request couldn’t be saved right now. Please try again."); }
    finally { setPending(false); }
  }

  return <section ref={outerPanelRef} aria-label="Add to Your Crew discovery" className={`${base.searchModal} ${styles.inlinePanel}`}>
      <button type="button" className={base.closeButton} aria-label="Close Crew search" onClick={onClose}>×</button>
      <div className={base.searchHeading}>
        <span className={base.searchHeadingIcon} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="27" cy="22" r="7" /><path d="M14 45c0-7 6-12 13-12s13 5 13 12M48 21v14m-7-7h14" /></svg></span>
        <div><span className={base.eyebrow}>FRIENDS &amp; FAMILY · FEATURE PREVIEW</span><h3 id="crew-search-title">Add to Your Crew</h3></div>
      </div>
      <p className={base.searchIntro}>Explore sample people below, or find a real Zero Loss member by name. A phone number or email sends a private request to a matching account. Real connections require their approval.</p>
      <div className={base.searchFields}>
        {(["name", "phone", "email"] as const).map((kind) => <form key={kind} className={`${base.searchRow} ${kind === "name" ? "" : styles.inviteRow}`} onSubmit={(event) => { event.preventDefault(); void submitSearch(kind); }}>
          <label className={base.srOnly} htmlFor={`crew-search-${kind}`}>Search by {kind === "phone" ? "phone number" : kind === "email" ? "email address" : "name"}</label>
          <input id={`crew-search-${kind}`} type={kind === "email" ? "email" : kind === "phone" ? "tel" : "search"} autoComplete={kind === "name" ? "off" : kind === "phone" ? "tel" : "email"} placeholder={`Search by ${kind === "phone" ? "phone number" : kind === "email" ? "email address" : "name"}...`} value={values[kind]} onChange={(event) => setValues((current) => ({ ...current, [kind]: event.target.value }))} disabled={pending} />
          <button type="submit" disabled={pending} aria-label={kind === "name" ? "Search Crew by name" : `Send Crew request by ${kind}`} title={kind === "name" ? "Search" : "Send a private Crew request"}>{kind === "name" ? <SearchIcon /> : "Invite"}</button>
        </form>)}
      </div>
      <button type="button" className={styles.contactButton} onClick={() => void chooseContact()}>Choose from phone contacts</button>
      <p className={styles.contactNote}>On supported phones, you select one contact. Nothing is sent until you press a request button; your address book is never uploaded.</p>
      {message ? <p className={styles.message} role="status">{message}</p> : null}
      {realResults.length ? <div className={styles.realResults}><h4>Zero Loss members</h4>{realResults.map((person) => <div key={person.memberId} className={styles.realPerson}>
        <span className={styles.realAvatar}>{person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="42px" unoptimized /> : person.name.slice(0, 1).toUpperCase()}</span><strong>{person.name}</strong><button type="button" disabled={pending || requestedIds.includes(person.memberId)} onClick={() => void requestRealPerson(person)}>{requestedIds.includes(person.memberId) ? "Request sent" : "Add to Crew"}</button>
      </div>)}</div> : null}
      <div className={styles.resultsHeading}><div><h4>Explore sample Crew</h4><p>Four familiar faces plus ten more. These profiles and their prizes are illustrative.</p></div><div className={styles.arrows}><button type="button" aria-label="Previous sample Crew profiles" onClick={() => moveRail(-1)}>‹</button><button type="button" aria-label="Next sample Crew profiles" onClick={() => moveRail(1)}>›</button></div></div>
      {nameFilter ? <button type="button" className={styles.clearSearch} onClick={() => { setNameFilter(""); setValues((current) => ({ ...current, name: "" })); setSelected(null); setRealResults([]); setMessage(""); }}>Show all sample profiles</button> : null}
      {samples.length ? <div className={styles.stage} ref={stageRef}>
        <div ref={railRef} className={styles.rail} aria-label="Fictional sample Crew profiles" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={() => { drag.current.active = false; drag.current.moved = false; if (railRef.current) { railRef.current.style.scrollBehavior = ""; railRef.current.style.scrollSnapType = ""; } }} onClickCapture={preventDraggedClick} onDragStart={(event) => event.preventDefault()}>
          {samples.map((person) => <div key={person.name} ref={selected === person.name ? tabRef : undefined} className={`${styles.person} ${selected === person.name ? styles.selected : ""}`}>
            <button type="button" className={styles.avatar} aria-label={`See ${person.name}'s sample prizes`} aria-expanded={selected === person.name} onClick={() => setSelected(selected === person.name ? null : person.name)}><Image src={person.photo} alt={`Fictional profile of ${person.name}`} fill sizes="88px" draggable={false} /></button>
            <button type="button" className={styles.name} aria-expanded={selected === person.name} onClick={() => setSelected(selected === person.name ? null : person.name)}>{person.name}</button>
            <button type="button" className={`${styles.add} ${previewRequests.includes(person.name) ? styles.added : ""}`} onClick={() => { addSampleCrewPreview(person.name); setMessage(`${person.name} was added to your sample Crew. No invitation was sent.`); }}>{previewRequests.includes(person.name) ? "Preview added" : "Add to Crew"}</button>
            <button type="button" className={styles.prizes} aria-expanded={selected === person.name} onClick={() => setSelected(selected === person.name ? null : person.name)}>{selected === person.name ? "Hide prizes ↑" : "See prizes ↓"}</button>
          </div>)}
        </div>
        {selected ? <SharedPicksConcept key={selected} person={selected} onClose={() => setSelected(null)} accent="orange" connectedOutline panelRef={panelRef} /> : null}
        {selected ? <svg ref={svgRef} className={styles.outline} aria-hidden="true" preserveAspectRatio="none"><path ref={pathRef} fill="none" stroke="#ff7417" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg> : null}
      </div> : <p className={styles.noSamples}>No sample profiles match that name. You can still invite a real person by phone or email.</p>}
      <div className={base.searchFooter}><p>Sample profiles stay in your browser preview, not the real member database. Real requests appear only after you choose to send one, and the other person must approve.</p><button type="button" onClick={onClose}>Done <span aria-hidden="true">✓</span></button></div>
  </section>;
}
