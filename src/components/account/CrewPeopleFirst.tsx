"use client";

import Image from "next/image";
import { useRef, type PointerEvent } from "react";
import { sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import type { CrewPersonCard } from "./CrewPeopleCarousel";
import styles from "./crew-people-first.module.css";

type RailDrag = { pointerId: number; x: number; y: number; left: number; moved: boolean };

export function CrewPeopleFirst({ people, samples, selectedKey, onAdd, onRemove, onSampleRemove, onSamplePicks, onMemberPicks, pending }: {
  people: CrewPersonCard[]; samples: SampleCrewName[]; selectedKey: string | null;
  onAdd: () => void; onRemove: (id: string) => void; onSampleRemove: (name: SampleCrewName) => void;
  onSamplePicks: (name: SampleCrewName) => void; onMemberPicks: (id: string) => void; pending: boolean;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<RailDrag | null>(null);
  const suppressClick = useRef(false);
  const settlingTarget = useRef<number | null>(null);
  const selectedMember = people.find(person => person.memberId === selectedKey);
  const selectedSample = samples.find(name => `sample-${name}` === selectedKey);
  function restoreSnap(element: HTMLDivElement) {
    settlingTarget.current = null;
    delete element.dataset.settling;
  }
  function finishDrag(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const element = event.currentTarget;
    drag.current = null;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (current.moved && !cancelled) element.dataset.settling = "true";
    delete element.dataset.dragging;
    if (cancelled) { suppressClick.current = false; restoreSnap(element); return; }
    if (!current.moved) return;

    const cards = Array.from(element.children);
    const firstLeft = cards[0]?.getBoundingClientRect().left;
    if (firstLeft === undefined) { restoreSnap(element); return; }
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const positions = cards.map(card => Math.min(maxScroll, Math.max(0, card.getBoundingClientRect().left - firstLeft)));
    const nearest = positions.reduce((best, position) => Math.abs(position - element.scrollLeft) < Math.abs(best - element.scrollLeft) ? position : best);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    settlingTarget.current = nearest;
    const settled = Math.abs(element.scrollLeft - nearest) < 1;
    element.scrollTo({ left: nearest, behavior: reducedMotion ? "auto" : "smooth" });
    if (reducedMotion || settled) restoreSnap(element);
  }
  function move(direction: number) {
    const element = rail.current;
    if (!element) return;
    restoreSnap(element);
    const cardWidth = element.firstElementChild?.getBoundingClientRect().width ?? 128;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({ left: direction * (cardWidth + gap), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return <div className={styles.people}>
    <div className={styles.peopleHeading}><h2>People in your Crew</h2><div className={styles.peopleTools}>
      {selectedMember || selectedSample ? <details key={selectedKey} className={styles.manage}><summary>Manage</summary><div>
        {selectedMember ? <button type="button" disabled={pending} onClick={() => onRemove(selectedMember.invitationId)}>Remove {selectedMember.name} from Crew</button> : <button type="button" onClick={() => selectedSample && onSampleRemove(selectedSample)}>Remove preview</button>}
      </div></details> : null}
      <button type="button" onClick={() => move(-1)} aria-label="Previous Crew member">‹</button><button type="button" onClick={() => move(1)} aria-label="Next Crew member">›</button>
    </div></div>
    <div className={styles.peopleRail} ref={rail} role="group" aria-roledescription="carousel" aria-label="People in your Crew"
      onPointerDown={event => {
        suppressClick.current = false;
        const element = event.currentTarget;
        restoreSnap(element);
        if (event.pointerType !== "mouse" || event.button !== 0 || element.scrollWidth <= element.clientWidth + 1) return;
        drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: element.scrollLeft, moved: false };
      }}
      onPointerMove={event => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const distance = event.clientX - current.x;
        if (!current.moved) {
          if (Math.abs(distance) < 6) return;
          if (Math.abs(event.clientY - current.y) > Math.abs(distance)) { drag.current = null; return; }
          current.moved = true;
          suppressClick.current = true;
          event.currentTarget.dataset.dragging = "true";
          event.currentTarget.setPointerCapture(event.pointerId);
        }
        event.preventDefault();
        event.currentTarget.scrollLeft = current.left - distance;
      }}
      onPointerUp={event => finishDrag(event)}
      onPointerCancel={event => finishDrag(event, true)}
      onLostPointerCapture={event => finishDrag(event, true)}
      onPointerLeave={event => { if (drag.current && !drag.current.moved) finishDrag(event, true); }}
      onDragStart={event => event.preventDefault()}
      onScroll={event => { if (settlingTarget.current !== null && Math.abs(event.currentTarget.scrollLeft - settlingTarget.current) < 1) restoreSnap(event.currentTarget); }}
      onScrollEnd={event => { if (!drag.current) restoreSnap(event.currentTarget); }}
      onWheel={event => restoreSnap(event.currentTarget)}
      onKeyDown={event => restoreSnap(event.currentTarget)}
      onClickCapture={event => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        if (event.detail === 0) return;
        event.preventDefault();
        event.stopPropagation();
      }}>
      {people.map(person => <div key={person.memberId} className={`${styles.person} ${selectedKey === person.memberId ? styles.personSelected : ""}`}><button type="button" aria-label={`See ${person.name}'s shared activity`} aria-expanded={selectedKey === person.memberId} onClick={() => onMemberPicks(person.memberId)}>
        <span className={styles.avatar}>{person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="(max-width: 640px) 88px, 104px" unoptimized draggable={false} /> : person.name.slice(0, 1).toUpperCase()}</span><span className={styles.personName}>{person.name}</span><small>Connected</small>
      </button></div>)}
      {sampleCrewPeople.filter(person => samples.includes(person.name)).map(person => <div key={person.name} className={`${styles.person} ${selectedKey === `sample-${person.name}` ? styles.personSelected : ""}`}><button type="button" aria-label={`See ${person.name}'s sample shared activity`} aria-expanded={selectedKey === `sample-${person.name}`} onClick={() => onSamplePicks(person.name)}>
        <span className={styles.avatar}><Image src={person.photo} alt="" fill sizes="(max-width: 640px) 88px, 104px" draggable={false} /></span><span className={styles.personName}>{person.name}</span>
      </button></div>)}
      <button type="button" onClick={onAdd} className={styles.addPerson} aria-label="Add to Your Crew"><span aria-hidden="true">+</span>Add person</button>
    </div>
    {samples.length ? <p className={styles.sampleNotice}>Fictional sample profiles—no invitations sent. Real members join after approval.</p> : null}
  </div>;
}
