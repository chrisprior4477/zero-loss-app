"use client";

import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, type PointerEvent, useRef } from "react";
import styles from "./crew-people.module.css";

export type CrewPersonCard = { memberId: string; invitationId: string; name: string; avatarUrl: string | null };

export function CrewPeopleCarousel({ people, onAdd, onRemove, pending }: {
  people: CrewPersonCard[];
  onAdd: () => void;
  onRemove: (invitationId: string) => void;
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
    if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
    rail.scrollLeft = dragRef.current.scrollLeft - movement;
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current.active = false;
    if (railRef.current?.hasPointerCapture(event.pointerId)) railRef.current.releasePointerCapture(event.pointerId);
  }
  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!dragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
  }
  function move(direction: -1 | 1) {
    railRef.current?.scrollBy({ left: direction * 165, behavior: "smooth" });
  }

  return <div className={styles.root}>
    <div className={styles.heading}>
      <div><h2>People in your Crew</h2><p>{people.length ? "Swipe through your connections. Only their chosen picks are visible." : "Your Crew starts with people you choose to invite."}</p></div>
      <div className={styles.arrows} aria-label="Crew carousel controls">
        <button type="button" aria-label="Previous Crew member" onClick={() => move(-1)}>‹</button>
        <button type="button" aria-label="Next Crew member" onClick={() => move(1)}>›</button>
      </div>
    </div>
    <div className={styles.rail} ref={railRef} aria-label="People in your Crew" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragRef.current.active = false; dragRef.current.moved = false; }} onClickCapture={onClickCapture} onDragStart={(event) => event.preventDefault()}>
      {people.map((person) => <div className={styles.person} key={person.memberId}>
        <Link href={`/account/crew?member=${person.memberId}`} className={styles.avatar} aria-label={`View ${person.name}'s shared picks`} draggable={false}>
          {person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="112px" unoptimized className={styles.avatarImage} /> : <span>{person.name.slice(0, 1).toUpperCase()}</span>}
        </Link>
        <strong className={styles.name}>{person.name}</strong>
        <small className={styles.connected}>Connected</small>
        <Link href={`/account/crew?member=${person.memberId}`} className={styles.picksLink}>Shared picks →</Link>
        <button type="button" disabled={pending} onClick={() => onRemove(person.invitationId)} className={styles.remove}>Remove</button>
      </div>)}
      <button type="button" onClick={onAdd} className={styles.discover} aria-label="Add to Your Crew">
        <span className={styles.discoverAvatar} aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="27" cy="22" r="7" /><path d="M14 45c0-7 6-12 13-12s13 5 13 12M48 21v14m-7-7h14" /></svg></span>
        <span>Add to Your<br />Crew</span>
      </button>
    </div>
  </div>;
}
