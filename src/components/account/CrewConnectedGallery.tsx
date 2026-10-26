"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import { samplePicks, type CrewActivityPick } from "@/components/home/SharedPicksConcept";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { ShareIcon } from "@/components/product/ShareIcon";
import { PRODUCT_SHARE_EVENT } from "@/lib/sharing/product-share";
import type { CrewPersonCard } from "./CrewPeopleCarousel";
import styles from "./crew-connected.module.css";
import { useCrewCarousel } from "./useCrewCarousel";

/** Both rails share free-gliding movement and a spring at their edges. */
export function CrewRail({ label, children, tools, kind, count }: { label: string; children: ReactNode; tools?: ReactNode; kind: "people" | "picks"; count: number }) {
  const { rail, move, ...gestures } = useCrewCarousel();
  const [position, setPosition] = useState({ first: 1, start: true, end: true });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => {
      const width = element.firstElementChild?.getBoundingClientRect().width ?? 1;
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      setPosition({ first: Math.min(count, Math.max(1, Math.round(element.scrollLeft / (width + gap)) + 1)), start: element.scrollLeft < 3, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 3 });
    };
    update(); element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [count, rail]);
  const controls = <div className={styles.railControls}>{tools}<span className={styles.railCount}>{count ? `${position.first} / ${count}` : "0"}</span><button type="button" aria-label={`Previous ${kind === "people" ? "Crew member" : "shared pick"}`} disabled={position.start} onClick={() => move(-1)}>←</button><button type="button" aria-label={`Next ${kind === "people" ? "Crew member" : "shared pick"}`} disabled={position.end} onClick={() => move(1)}>→</button></div>;
  return <div className={`${styles.carousel} ${kind === "people" ? styles.peopleCarousel : styles.picksCarousel}`}>
    {kind === "people" ? <div className={styles.peopleHeading}><h2>People in your Crew</h2>{controls}</div> : null}
    <div className={styles.railWindow}><div ref={rail} className={kind === "people" ? styles.peopleRail : styles.picksRail} role="group" aria-roledescription="carousel" aria-label={label} tabIndex={0}
      {...gestures}
      onDragStart={event => event.preventDefault()}
      onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); } }}>
      {children}
    </div></div>
    {kind === "picks" ? <div className={styles.picksFooter}><span>Swipe for more picks</span>{controls}</div> : null}
  </div>;
}

function PickCard({ pick }: { pick: CrewActivityPick }) {
  return <article className={styles.pickCard}>
    <Link className={styles.pickArt} href={`/items/${encodeURIComponent(pick.slug)}`} aria-label={`View ${pick.title}`}><Image src={pick.image} alt={pick.title} fill sizes="(max-width: 640px) 280px, 440px" draggable={false} /></Link>
    <div className={styles.pickCopy}><small>{pick.retailer}</small><h3>{pick.title}</h3>{pick.note ? <p>{pick.note}</p> : null}</div>
    <div className={styles.pickActions}><Link href={`/items/${encodeURIComponent(pick.slug)}`}>View item <span aria-hidden="true">↗</span></Link><ProductShareButton product={pick} label="Share" className={styles.shareButton} /></div>
  </article>;
}

export function CrewConnectedGallery({ people, samples, selectedKey, picks, loading, error, pending, onMember, onSample, onRemove, onSampleRemove, onRetry, onShare, onAdd, onShareBack }: {
  people: CrewPersonCard[]; samples: SampleCrewName[]; selectedKey: string | null; picks: CrewActivityPick[]; loading: boolean; error: boolean; pending: boolean;
  onShareBack: (id: string, enabled: boolean) => void; onMember: (id: string) => void; onSample: (name: SampleCrewName) => void; onRemove: (id: string) => void; onSampleRemove: (name: SampleCrewName) => void; onRetry: () => void; onShare: () => void; onAdd: () => void;
}) {
  const space = useRef<HTMLElement>(null);
  useEffect(() => {
    const selected = space.current?.querySelector<HTMLButtonElement>('[data-selected="true"]');
    const rail = selected?.parentElement;
    if (!selected || !rail) return;
    const card = selected.getBoundingClientRect(), viewport = rail.getBoundingClientRect();
    if (card.left < viewport.left || card.right > viewport.right) {
      rail.scrollTo({ left: rail.scrollLeft + card.left - viewport.left, behavior: "auto" });
    }
  }, [selectedKey]);
  const roster = [...people.map(person => ({ key: person.memberId, name: person.name, photo: person.avatarUrl, invitationId: person.invitationId, sample: false })),
    ...sampleCrewPeople.filter(person => samples.includes(person.name)).map(person => ({ key: `sample-${person.name}`, name: person.name, photo: person.photo, invitationId: null, sample: true }))];
  const selected = roster.find(person => person.key === selectedKey);
  const visiblePicks = selected?.sample ? samplePicks[selected.name as SampleCrewName] : picks;
  const manage = selected ? <details className={styles.manage} key={selected.key}><summary>Manage</summary><div>{!selected.sample ? <><button type="button" disabled={pending} onClick={() => onShareBack(selected.invitationId!, true)}>Allow my shared picks</button><button type="button" disabled={pending} onClick={() => onShareBack(selected.invitationId!, false)}>Stop sharing my picks</button></> : null}<button type="button" disabled={pending} onClick={() => selected.sample ? onSampleRemove(selected.name as SampleCrewName) : onRemove(selected.invitationId!)}>{selected.sample ? "Remove preview" : `Leave connection with ${selected.name}`}</button></div></details> : null;
  return <section ref={space} className={styles.connectedSpace} aria-label="Your Crew and shared picks">
    <CrewRail key={roster.map(person => person.key).join(",")} label="People in your Crew" kind="people" count={roster.length + 1} tools={manage}>
      {roster.map(person => <button type="button" key={person.key} className={styles.personCard} data-selected={person.key === selectedKey} aria-expanded={person.key === selectedKey} aria-label={`See ${person.name}'s ${person.sample ? "sample " : ""}shared activity`} onClick={() => person.sample ? onSample(person.name as SampleCrewName) : onMember(person.key)}>
        <span className={styles.avatar} aria-hidden="true">{person.photo ? <Image src={person.photo} alt="" fill sizes="100px" unoptimized={!person.sample} draggable={false} /> : person.name[0]}</span><strong>{person.name}</strong><small>{person.sample ? `${samplePicks[person.name as SampleCrewName].length} sample picks` : "Connected"}</small>{person.key === selectedKey ? <span className={styles.selectedMark} aria-hidden="true">✓</span> : null}
      </button>)}
      <button type="button" className={styles.addPerson} aria-label="Add to Your Crew" onClick={onAdd}><span>+</span>Add person</button>
    </CrewRail>
    <section className={styles.activityPanel} aria-label={selected ? `${selected.name}'s shared activity` : "Crew member activity"}>
      <header className={styles.personHeading}><div><span>{selected?.sample ? "SAMPLE PROFILE" : "YOUR CREW"}</span><h2>{selected ? `${selected.name}’s shared picks` : "Choose someone to explore"}</h2><p aria-live="polite">{loading ? "Loading picks…" : selected ? `${visiblePicks.length} ${visiblePicks.length === 1 ? "find" : "finds"} to explore` : "Their shared finds will appear here."}</p></div><button type="button" className={styles.headingShare} onClick={onShare} aria-label="Share a find"><ShareIcon name="share" /><span>Share a find</span></button></header>
      {selected && !loading && !error && visiblePicks.length ? <CrewRail key={selected.key} label={`${selected.name}'s shared picks`} kind="picks" count={visiblePicks.length}>{visiblePicks.map((pick, index) => <PickCard key={`${pick.slug}-${index}`} pick={pick} />)}</CrewRail> : <div className={styles.emptyPicks} role={error ? "alert" : "status"}>{loading ? "Loading shared activity…" : error ? <><p>We couldn’t load this Crew member’s activity.</p><button type="button" onClick={onRetry}>Retry shared activity</button></> : selected ? <><p>No activity shared with Crew yet.</p><button type="button" onClick={onShare}>Share a find with them</button></> : "Select a person above to see the picks they’ve chosen to share."}</div>}
    </section>
  </section>;
}

export function CrewSharePicker({ products, onClose }: { products: CrewActivityPick[]; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className={styles.shareDialog} aria-labelledby="crew-share-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <header><div><small>PASS IT ON</small><h2 id="crew-share-title">What caught your eye?</h2></div><button type="button" aria-label="Close share picker" onClick={onClose}>×</button></header><p>Choose a find, then choose who to share it with.</p>
    <div className={styles.shareChoices}>{products.map(product => <article key={product.slug}><span><Image src={product.image} alt="" fill sizes="90px" /></span><div><small>{product.retailer}</small><strong>{product.title}</strong></div><button type="button" className={styles.shareButton} onClick={() => { dialog.current?.close(); onClose(); window.dispatchEvent(new CustomEvent(PRODUCT_SHARE_EVENT, { detail: product })); }}><ShareIcon name="share" /> Share</button></article>)}</div>
  </dialog>;
}
