"use client";

import Image from "next/image";
import { type MouseEvent, type PointerEvent, useRef } from "react";
import { sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import styles from "./crew-people.module.css";

export type CrewPersonCard = { memberId: string; invitationId: string; name: string; avatarUrl: string | null };

export function CrewPeopleCarousel({ people, samples, selectedKey, onAdd, onRemove, onSampleRemove, onSamplePicks, onMemberPicks, pending }: {
  people: CrewPersonCard[];
  samples: SampleCrewName[];
  selectedKey: string | null;
  onAdd: () => void;
  onRemove: (invitationId: string) => void;
  onSampleRemove: (name: SampleCrewName) => void;
  onSamplePicks: (name: SampleCrewName) => void;
  onMemberPicks: (memberId: string) => void;
  pending: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, scrollLeft: 0 });

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !railRef.current) return;
    dragRef.current = { active: true, moved: false, x: event.clientX, scrollLeft: railRef.current.scrollLeft };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || !dragRef.current.active) return;
    const movement = event.clientX - dragRef.current.x;
    if (Math.abs(movement) > 5) dragRef.current.moved = true;
    if (!dragRef.current.moved) return;
    event.preventDefault();
    rail.style.scrollBehavior = "auto";
    rail.style.scrollSnapType = "none";
    if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
    rail.scrollLeft = dragRef.current.scrollLeft - movement;
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current.active = false;
    if (railRef.current) { railRef.current.style.scrollBehavior = ""; railRef.current.style.scrollSnapType = ""; }
    if (railRef.current?.hasPointerCapture(event.pointerId)) railRef.current.releasePointerCapture(event.pointerId);
  }
  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  }
  function move(direction: -1 | 1) {
    const rail = railRef.current;
    const firstCard = rail?.firstElementChild;
    if (!rail || !(firstCard instanceof HTMLElement)) return;
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + gap), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return <div className={`${styles.root} ${selectedKey ? styles.rootSelected : ""}`}>
    <div className={styles.heading}>
      <div><h2>People in your Crew</h2><p>{people.length ? "Swipe through approved connections and sample profiles." : "The people you tried on the homepage appear below as sample previews."}</p></div>
      <div className={styles.arrows} aria-label="Crew carousel controls">
        <button type="button" aria-label="Previous Crew member" onClick={() => move(-1)}>‹</button>
        <button type="button" aria-label="Next Crew member" onClick={() => move(1)}>›</button>
      </div>
    </div>
    {samples.length ? <p className={styles.sampleNotice}>Sample profiles are fictional. “Preview added” did not send invitations; real members appear here after they approve a request.</p> : null}
    <div className={styles.rail} ref={railRef} aria-label="People in your Crew" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragRef.current.active = false; dragRef.current.moved = false; if (railRef.current) { railRef.current.style.scrollBehavior = ""; railRef.current.style.scrollSnapType = ""; } }} onClickCapture={onClickCapture} onDragStart={(event) => event.preventDefault()}>
      {people.map((person) => <div className={`${styles.person} ${selectedKey === person.memberId ? styles.personSelected : ""}`} key={person.memberId}>
        <button type="button" className={styles.avatar} aria-label={`See ${person.name}'s shared activity`} aria-expanded={selectedKey === person.memberId} onClick={() => onMemberPicks(person.memberId)}>
          {person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="112px" unoptimized className={styles.avatarImage} /> : <span>{person.name.slice(0, 1).toUpperCase()}</span>}
        </button>
        <button type="button" className={styles.name} aria-expanded={selectedKey === person.memberId} onClick={() => onMemberPicks(person.memberId)}>{person.name}</button>
        <small className={styles.connected}>Connected</small>
        <button type="button" aria-expanded={selectedKey === person.memberId} onClick={() => onMemberPicks(person.memberId)} className={styles.picksLink}>{selectedKey === person.memberId ? "Hide activity ↑" : "See activity ↓"}</button>
        <button type="button" disabled={pending} onClick={() => onRemove(person.invitationId)} className={styles.remove}>Remove</button>
      </div>)}
      {sampleCrewPeople.filter((person) => samples.includes(person.name)).map((person) => <div className={`${styles.person} ${selectedKey === `sample-${person.name}` ? styles.personSelected : ""}`} key={`sample-${person.name}`}>
        <button type="button" className={styles.avatar} aria-label={`See ${person.name}'s sample shared activity`} aria-expanded={selectedKey === `sample-${person.name}`} onClick={() => onSamplePicks(person.name)}>
          <Image src={person.photo} alt="" fill sizes="112px" className={styles.avatarImage} />
        </button>
        <button type="button" className={styles.name} aria-expanded={selectedKey === `sample-${person.name}`} onClick={() => onSamplePicks(person.name)}>{person.name}</button>
        <small className={styles.sampleBadge}>Sample preview</small>
        <button type="button" aria-expanded={selectedKey === `sample-${person.name}`} onClick={() => onSamplePicks(person.name)} className={styles.picksLink}>{selectedKey === `sample-${person.name}` ? "Hide activity ↑" : "See activity ↓"}</button>
        <button type="button" onClick={() => onSampleRemove(person.name)} className={styles.remove}>Remove preview</button>
      </div>)}
      <button type="button" onClick={onAdd} className={styles.discover} aria-label="Add to Your Crew">
        <span className={styles.discoverAvatar} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="27" cy="22" r="7" /><path d="M14 45c0-7 6-12 13-12s13 5 13 12M48 21v14m-7-7h14" /></svg></span>
        <span>Add to Your<br />Crew</span>
      </button>
    </div>
  </div>;
}
