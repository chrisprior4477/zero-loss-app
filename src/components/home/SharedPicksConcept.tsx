"use client";

import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, type PointerEvent, type RefObject, useRef } from "react";
import { sampleCrewPeople, type SampleCrewName } from "@/lib/crew/sample-preview";
import styles from "./SharedPicksConcept.module.css";

const samplePicks = {
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
  Ari: [
    { title: "Nike Court Shot Shoes", retailer: "Dick’s Sporting Goods", image: "/catalog/nike-court-shot-side-cutout.png", slug: "nike-court-shot-shoes", note: "A fresh pair" },
    { title: "Dunkin’ $25 Gift Card", retailer: "Dunkin’", image: "/catalog/dunkin-25-gift-card.svg", slug: "dunkin-25-gift-card", note: "Coffee with friends" },
  ],
  Leo: [
    { title: "PlayStation 5 Slim", retailer: "Best Buy", image: "/dollar-choice-gaming.png", slug: "playstation-5-slim", note: "Game night" },
    { title: 'Samsung 50" M70H Mini LED TV', retailer: "Best Buy", image: "/catalog/samsung-m70h-tv-real.png", slug: "samsung-m70h-tv", note: "Movie night" },
  ],
  Claire: [
    { title: "HomeGoods $75 Gift Card", retailer: "HomeGoods", image: "/catalog/homegoods-75-gift-card.svg", slug: "homegoods-75-gift-card", note: "A little home refresh" },
    { title: "Dyson V8 Cordless Vacuum", retailer: "Lowe’s", image: "/catalog/dyson-v8-diagonal-real.png", slug: "dyson-v8-cordless-vacuum", note: "Home upgrade" },
  ],
  Marcus: [
    { title: "PlayStation 5 Slim", retailer: "Best Buy", image: "/dollar-choice-gaming.png", slug: "playstation-5-slim", note: "Family game night" },
    { title: "$100 Best Buy Gift Card", retailer: "Best Buy", image: "/catalog/best-buy-100-gift-card.svg", slug: "best-buy-100-gift-card", note: "Tech finds" },
  ],
  Mateo: [
    { title: "Nike Court Shot Shoes", retailer: "Dick’s Sporting Goods", image: "/catalog/nike-court-shot-side-cutout.png", slug: "nike-court-shot-shoes", note: "New kicks" },
    { title: "Dunkin’ $25 Gift Card", retailer: "Dunkin’", image: "/catalog/dunkin-25-gift-card.svg", slug: "dunkin-25-gift-card", note: "Morning coffee" },
  ],
  Nora: [
    { title: "Baby’s Essentials Bundle", retailer: "Walmart", image: "/catalog/babys-essentials-bundle-angled-real.png", slug: "babys-essentials-bundle", note: "Family essentials" },
    { title: "HomeGoods $75 Gift Card", retailer: "HomeGoods", image: "/catalog/homegoods-75-gift-card.svg", slug: "homegoods-75-gift-card", note: "For the house" },
  ],
  Samir: [
    { title: "$150 Lowe’s Appliance Gift Card", retailer: "Lowe’s", image: "/catalog/lowes-150-gift-card.svg", slug: "lowes-150-gift-card", note: "Weekend project" },
    { title: "Dyson V8 Cordless Vacuum", retailer: "Lowe’s", image: "/catalog/dyson-v8-diagonal-real.png", slug: "dyson-v8-cordless-vacuum", note: "Home upgrade" },
  ],
  Jules: [
    { title: "$25 Netflix Gift Card", retailer: "Netflix", image: "/catalog/netflix-25-gift-card.svg", slug: "netflix-25-gift-card", note: "A movie night" },
    { title: 'Samsung 50" M70H Mini LED TV', retailer: "Best Buy", image: "/catalog/samsung-m70h-tv-real.png", slug: "samsung-m70h-tv", note: "Living-room wishlist" },
  ],
  Tessa: [
    { title: "HomeGoods $75 Gift Card", retailer: "HomeGoods", image: "/catalog/homegoods-75-gift-card.svg", slug: "homegoods-75-gift-card", note: "Something cozy" },
    { title: "Dunkin’ $25 Gift Card", retailer: "Dunkin’", image: "/catalog/dunkin-25-gift-card.svg", slug: "dunkin-25-gift-card", note: "Coffee date" },
  ],
  Andre: [
    { title: "PlayStation 5 Slim", retailer: "Best Buy", image: "/dollar-choice-gaming.png", slug: "playstation-5-slim", note: "New games" },
    { title: "Nike Court Shot Shoes", retailer: "Dick’s Sporting Goods", image: "/catalog/nike-court-shot-side-cutout.png", slug: "nike-court-shot-shoes", note: "Everyday style" },
  ],
  Sofia: [
    { title: "Baby’s Essentials Bundle", retailer: "Walmart", image: "/catalog/babys-essentials-bundle-angled-real.png", slug: "babys-essentials-bundle", note: "Family favorites" },
    { title: "$100 Best Buy Gift Card", retailer: "Best Buy", image: "/catalog/best-buy-100-gift-card.svg", slug: "best-buy-100-gift-card", note: "A new gadget" },
  ],
  Owen: [
    { title: "$150 Lowe’s Appliance Gift Card", retailer: "Lowe’s", image: "/catalog/lowes-150-gift-card.svg", slug: "lowes-150-gift-card", note: "Home project" },
    { title: "$25 Netflix Gift Card", retailer: "Netflix", image: "/catalog/netflix-25-gift-card.svg", slug: "netflix-25-gift-card", note: "Weekend unwind" },
  ],
} satisfies Record<SampleCrewName, { title: string; retailer: string; image: string; slug: string; note: string }[]>;

export type CrewActivityPick = { title: string; retailer: string; image: string; slug: string; note?: string };

export function SharedPicksConcept({ person, onClose, picks, avatarUrl, loading = false, connectedOutline = false, accountMode = false, accent = "green", panelRef }: {
  person: string;
  onClose: () => void;
  picks?: CrewActivityPick[];
  avatarUrl?: string | null;
  loading?: boolean;
  connectedOutline?: boolean;
  accountMode?: boolean;
  accent?: "green" | "orange";
  panelRef?: RefObject<HTMLElement | null>;
}) {
  const sample = person in samplePicks && !picks;
  const visiblePicks: CrewActivityPick[] = picks ?? (sample ? samplePicks[person as SampleCrewName] : []);
  const sampleAvatar = sample ? sampleCrewPeople.find((item) => item.name === person)?.photo : null;
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, x: 0, scrollLeft: 0 });

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !railRef.current) return;
    drag.current = { active: true, moved: false, x: event.clientX, scrollLeft: railRef.current.scrollLeft };
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!drag.current.active || !rail) return;
    const distance = event.clientX - drag.current.x;
    if (Math.abs(distance) <= 5 && !drag.current.moved) return;
    drag.current.moved = true;
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
  function moveRail(direction: -1 | 1) {
    const rail = railRef.current;
    const card = rail?.firstElementChild;
    if (!rail || !(card instanceof HTMLElement)) return;
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <section ref={panelRef} className={`${styles.panel} ${connectedOutline ? styles.connectedOutline : ""} ${accountMode ? styles.accountMode : ""} ${accent === "orange" ? styles.orange : ""}`} aria-label={`${person}'s shared activity`}>
    <div className={styles.header}>
      <div className={styles.personHeading}>
        {avatarUrl || sampleAvatar ? <span className={styles.avatar}><Image src={(avatarUrl || sampleAvatar)!} alt="" fill sizes="48px" className={styles.avatarImage} unoptimized={Boolean(avatarUrl)} /></span> : <span className={styles.initial}>{person.slice(0, 1).toUpperCase()}</span>}
        <div><span className={styles.eyebrow}>YOUR CREW · SHARED ACTIVITY</span><h3>{person}’s shared activity</h3><p>Things {person} chose to share with their Crew.</p>{accountMode ? <span className={styles.viewingBadge}>Viewing {person}&apos;s picks</span> : null}</div>
      </div>
      <button type="button" onClick={onClose} className={styles.close} aria-label={`Close ${person}'s shared activity`}>×<span> Close</span></button>
    </div>
    {visiblePicks.length ? <>
      <div ref={railRef} className={styles.rail} aria-label={`${person}'s shared items`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={() => { drag.current.active = false; drag.current.moved = false; if (railRef.current) { railRef.current.style.scrollBehavior = ""; railRef.current.style.scrollSnapType = ""; } }} onClickCapture={preventDraggedClick} onDragStart={(event) => event.preventDefault()}>
        {visiblePicks.map((pick, index) => <Link href={`/items/${pick.slug}`} key={`${pick.slug}-${index}`} className={styles.pickCard} draggable={false}>
          <span className={styles.productArt}><Image src={pick.image} alt="" fill draggable={false} sizes="(max-width: 650px) 165px, 200px" className={styles.productImage} /></span>
          <span className={styles.pickCopy}><small>{pick.retailer}</small><strong>{pick.title}</strong>{pick.note ? <em>{pick.note}</em> : null}<span className={styles.viewLink}>View product →</span></span>
        </Link>)}
      </div>
      <div className={styles.railFooter}><span>Swipe to explore · {visiblePicks.length} {sample ? "sample " : ""}{visiblePicks.length === 1 ? "item" : "items"}</span><div><button type="button" aria-label="Previous shared item" onClick={() => moveRail(-1)}>‹</button><button type="button" aria-label="Next shared item" onClick={() => moveRail(1)}>›</button></div></div>
    </> : <p className={styles.empty} role={loading ? "status" : undefined}>{loading ? "Loading shared activity…" : "No activity shared with Crew yet."}</p>}
    {sample ? <p className={styles.disclosure}>Illustrative picks from a fictional profile. No invitation or notification was sent. Real Crew activity requires approval and an explicit sharing choice for each entry.</p> : null}
  </section>;
}
