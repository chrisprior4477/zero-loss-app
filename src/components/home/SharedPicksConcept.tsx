"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent, useRef, useState } from "react";
import styles from "./SharedPicksConcept.module.css";

const picksByPerson = {
  Maya: [
    { title: 'Samsung 50" M70H Mini LED TV', retailer: "Best Buy", image: "/catalog/samsung-m70h-tv-real.png", slug: "samsung-m70h-tv", note: "A living-room upgrade" },
    { title: "Nike Court Shot Shoes", retailer: "Dick’s Sporting Goods", image: "/catalog/nike-court-shot-side-cutout.png", slug: "nike-court-shot-shoes", note: "Everyday style" },
    { title: "Dunkin’ $25 Gift Card", retailer: "Dunkin’", image: "/catalog/dunkin-25-gift-card.svg", slug: "dunkin-25-gift-card", note: "Coffee run" },
  ],
  Daniel: [
    { title: "PlayStation 5 Slim", retailer: "Best Buy", image: "/dollar-choice-gaming.png", slug: "playstation-5-slim", note: "Game night" },
    { title: "Dyson V8 Cordless Vacuum", retailer: "Lowe’s", image: "/catalog/dyson-v8-diagonal-real.png", slug: "dyson-v8-cordless-vacuum", note: "Home upgrade" },
    { title: 'Samsung 50" M70H Mini LED TV', retailer: "Best Buy", image: "/catalog/samsung-m70h-tv-real.png", slug: "samsung-m70h-tv", note: "Weekend movies" },
  ],
} as const;

type Person = keyof typeof picksByPerson;

export function SharedPicksConcept({ initialPerson, onClose }: { initialPerson: Person; onClose: () => void }) {
  const [person, setPerson] = useState<Person>(initialPerson);
  const railRef = useRef<HTMLDivElement>(null);
  const railDrag = useRef({ active: false, moved: false, x: 0, scrollLeft: 0 });
  const picks = picksByPerson[person];

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !railRef.current) return;
    railDrag.current = { active: true, moved: false, x: event.clientX, scrollLeft: railRef.current.scrollLeft };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!railDrag.current.active || !railRef.current) return;
    const movement = event.clientX - railDrag.current.x;
    if (Math.abs(movement) > 5) railDrag.current.moved = true;
    if (!railDrag.current.moved) return;
    event.preventDefault();
    if (!railRef.current.hasPointerCapture(event.pointerId)) railRef.current.setPointerCapture(event.pointerId);
    railRef.current.scrollLeft = railDrag.current.scrollLeft - movement;
  }
  function stopDrag(event: PointerEvent<HTMLDivElement>) {
    railDrag.current.active = false;
    if (railRef.current?.hasPointerCapture(event.pointerId)) railRef.current.releasePointerCapture(event.pointerId);
  }

  function card(pick: (typeof picks)[number], index: number) {
    return <Link href={`/items/${pick.slug}`} key={`${person}-${pick.slug}`} className={styles.pickCard}>
      <span className={styles.productArt}><Image src={pick.image} alt="" fill sizes="(max-width: 650px) 170px, 200px" className={styles.productImage} /></span>
      <span className={styles.pickCopy}><small>{pick.retailer}</small><strong>{pick.title}</strong><em>{pick.note}</em><span className={styles.viewLink}>View product →</span></span>
      <span className={styles.pickNumber}>0{index + 1}</span>
    </Link>;
  }

  return <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="shared-picks-title" className={styles.modal}>
      <button type="button" onClick={onClose} className={styles.close} aria-label="Close shared picks preview">×</button>
      <div className={styles.topline}>YOUR CREW · SHARED PICKS PREVIEW</div>
      <div className={styles.header}><div><h2 id="shared-picks-title">What your Crew is into</h2><p>Explore the picks a connected Crew member chooses to share.</p></div><span className={styles.previewTag}>Fictional sample</span></div>
      <div className={styles.personTabs} aria-label="Sample Crew member">
        {(["Maya", "Daniel"] as const).map((name) => <button type="button" key={name} aria-pressed={person === name} onClick={() => { setPerson(name); if (railRef.current) railRef.current.scrollLeft = 0; }} className={person === name ? styles.activePerson : ""}>{name}<span>{picksByPerson[name].length} picks</span></button>)}
      </div>
      <div className={styles.previewPanel}>
        <div className={styles.previewHeading}><div className={styles.personHeading}><span className={styles.personAvatar}><Image src={person === "Maya" ? "/images/home/crew/person-1.webp" : "/images/home/crew/person-2.webp"} alt="" fill sizes="44px" className={styles.avatarImage} /></span><div><span className={styles.eyebrow}>SHARED BY {person.toUpperCase()}</span><h3>{person}’s picks</h3></div></div><span className={styles.onlyCrew}>Visible to approved Crew only</span></div>
        <div ref={railRef} className={styles.rail} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={() => { railDrag.current.active = false; }} onClickCapture={(event) => { if (railDrag.current.moved) { event.preventDefault(); event.stopPropagation(); railDrag.current.moved = false; } }} onDragStart={(event) => event.preventDefault()}>{picks.map(card)}</div>
        <div className={styles.railFooter}><span>Swipe to explore · {picks.length} sample picks</span><div><button type="button" aria-label="Previous pick" onClick={() => railRef.current?.scrollBy({ left: -225, behavior: "smooth" })}>‹</button><button type="button" aria-label="Next pick" onClick={() => railRef.current?.scrollBy({ left: 225, behavior: "smooth" })}>›</button></div></div>
      </div>
      <p className={styles.disclosure}>Maya and Daniel are fictional preview profiles. These picks are illustrative; no invitations or notifications were sent. Real shared picks require approval and an explicit sharing choice for each entry.</p>
    </section>
  </div>;
}
