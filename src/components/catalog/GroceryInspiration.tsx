"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { groceryThemes, groceryThemeImage, type GroceryTheme } from "@/lib/catalog/grocery-themes";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import styles from "./grocery-inspiration.module.css";

export type GroceryInspirationOffer = { slug: string; title: string; retailer: string; value: number; entryPrice: number; remaining: number; href: string };
type Layout = "1" | "2" | "3";
const layouts = [{ id: "1", label: "Two rows" }, { id: "2", label: "Tonight’s spotlight" }, { id: "3", label: "Pick your mood" }] as const;

function Rail({ children, label, twoRows = false, compact = false }: { children: ReactNode; label: string; twoRows?: boolean; compact?: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef({ x: 0, left: 0, down: false, moved: false });
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => {
      const start = element.scrollLeft < 2;
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
      setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end });
    };
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    return () => { element.removeEventListener("scroll", update); observer?.disconnect(); };
  }, []);
  function move(direction: number) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * .86, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return <div className={styles.railWrap}>
    <div ref={rail} role="region" aria-label={label} tabIndex={0} className={`${styles.rail} ${twoRows ? styles.twoRows : ""} ${compact ? styles.compactRail : ""}`}
      onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "ArrowRight" || event.key === "ArrowLeft")) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}
      onPointerDown={event => { if (event.pointerType === "mouse" && event.button === 0) drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, down: true, moved: false }; }}
      onPointerMove={event => {
        if (!drag.current.down) return;
        const delta = event.clientX - drag.current.x;
        if (Math.abs(delta) > 8) { drag.current.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
        if (drag.current.moved) event.currentTarget.scrollLeft = drag.current.left - delta;
      }}
      onPointerUp={() => { drag.current.down = false; }} onPointerCancel={() => { drag.current.down = false; }} onPointerLeave={() => { if (!drag.current.moved) drag.current.down = false; }}
      onClickCapture={event => { if (drag.current.moved) { event.preventDefault(); event.stopPropagation(); drag.current.moved = false; } }}>
      {children}
    </div>
    <div className={styles.railFooter}><span>Swipe or drag for more ideas <span aria-hidden="true">↔</span></span><div className={styles.arrows}>
      <button type="button" aria-label={`Previous ${label}`} disabled={edges.start} onClick={() => move(-1)}>←</button>
      <button type="button" aria-label={`Next ${label}`} disabled={edges.end} onClick={() => move(1)}>→</button>
    </div></div>
  </div>;
}

function ThemeCard({ theme, onChoose, selected = false, thumbnail = false }: { theme: GroceryTheme; onChoose: () => void; selected?: boolean; thumbnail?: boolean }) {
  return <button type="button" className={`${styles.themeCard} ${thumbnail ? styles.thumbnail : ""}`} aria-label={thumbnail ? `Show ${theme.title}` : `Explore ${theme.title}`} aria-pressed={thumbnail ? selected : undefined} aria-haspopup={thumbnail ? undefined : "dialog"} onClick={onChoose}>
    <span className={styles.themePhoto}><Image src={groceryThemeImage(theme.id)} alt="" fill sizes="(max-width: 640px) 45vw, 280px" draggable={false} className={styles.foodImage} /></span>
    <span className={styles.themeText}><strong>{theme.title}</strong>{!thumbnail ? <small>{theme.note}</small> : null}</span>
    {!thumbnail ? <span aria-hidden="true" className={styles.cardArrow}>↗</span> : null}
  </button>;
}

export function GroceryInspiration({ layout, offers, browseHref }: { layout: Layout; offers: GroceryInspirationOffer[]; browseHref: string }) {
  const [spotlight, setSpotlight] = useState<GroceryTheme>(groceryThemes[0]);
  const [selected, setSelected] = useState<GroceryTheme | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; opener.current?.focus({ preventScroll: true }); };
  }, [selected]);
  function choose(theme: GroceryTheme) { opener.current = document.activeElement as HTMLElement; setSelected(theme); }
  function layoutHref(id: string) {
    const url = new URL(browseHref, "https://zeroloss.local");
    url.searchParams.set("inspiration", id);
    return `${url.pathname}${url.search}#search-results`;
  }
  return <>
    <div className={styles.previewControls}><span>Compare layouts</span><nav aria-label="Grocery preview layouts">{layouts.map(item => <Link key={item.id} href={layoutHref(item.id)} scroll={false} aria-current={layout === item.id ? "page" : undefined}>{item.id}. {item.label}</Link>)}</nav></div>
    <section aria-labelledby="grocery-inspiration-heading" className={`${styles.panel} ${layout === "2" ? styles.spotlightPanel : ""} ${layout === "3" ? styles.moodPanel : ""}`}>
      <header className={styles.panelHeader}><div><p className={styles.eyebrow}>A little inspiration for your next grocery run</p><h2 id="grocery-inspiration-heading">{layout === "2" ? "What sounds good?" : layout === "3" ? "Follow your appetite." : "What’s good tonight?"}</h2><p>Good ideas for your next grocery run.</p></div><span className={styles.ideaCount}>10 ideas</span></header>
      {layout === "1" ? <Rail label="Grocery ideas" twoRows>{groceryThemes.map(theme => <ThemeCard key={theme.id} theme={theme} onChoose={() => choose(theme)} />)}</Rail> : null}
      {layout === "2" ? <>
        <div className={styles.spotlight}>
          <button type="button" className={styles.spotlightPhoto} aria-label={`Explore ${spotlight.title}`} aria-haspopup="dialog" onClick={() => choose(spotlight)}><Image src={groceryThemeImage(spotlight.id)} alt={`${spotlight.title} groceries and meal inspiration`} fill sizes="(max-width: 640px) 90vw, 600px" className={styles.foodImage} /></button>
          <div className={styles.spotlightCopy}><span className={styles.eyebrow}>Tonight’s spotlight</span><h3>{spotlight.title}</h3><p>{spotlight.note}</p><span className={styles.ingredients}>{spotlight.ingredients}</span><button type="button" className={styles.primary} onClick={() => choose(spotlight)}>Make it {spotlight.title} <span aria-hidden="true">→</span></button></div>
        </div>
        <Rail label="More inspiration" compact>{groceryThemes.map(theme => <ThemeCard key={theme.id} theme={theme} thumbnail selected={spotlight.id === theme.id} onChoose={() => setSpotlight(theme)} />)}</Rail>
      </> : null}
      {layout === "3" ? <div className={styles.shelves}>{["Easy favorites", "Make a night of it"].map((mood, index) => <div key={mood} className={styles.shelf}><h3>{index === 0 ? "Keep it easy" : "Make a little occasion of it"}<span>{index === 0 ? "Everyday ideas, anything but boring" : "A good reason to gather around"}</span></h3><Rail label={index === 0 ? "Easy grocery ideas" : "Occasion grocery ideas"}>{groceryThemes.filter(theme => theme.mood === mood).map(theme => <ThemeCard key={theme.id} theme={theme} onChoose={() => choose(theme)} />)}</Rail></div>)}</div> : null}
      <footer className={styles.panelFooter}><span>Meal inspiration. The reward is a grocery gift card.</span><a href="#more-groceries">See all grocery offers ↓</a></footer>
    </section>
    {selected ? <dialog ref={dialog} className={styles.dialog} aria-labelledby="grocery-theme-title" onCancel={() => setSelected(null)} onKeyDown={containDialogTab} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <div className={styles.dialogBody}><button type="button" className={styles.close} aria-label="Close grocery idea" onClick={() => setSelected(null)}>×</button>
        <div className={styles.dialogPhoto}><Image src={groceryThemeImage(selected.id)} alt="" fill sizes="(max-width: 640px) 100vw, 620px" className={styles.foodImage} /></div>
        <div className={styles.dialogCopy}><span className={styles.eyebrow}>Your next grocery run, reimagined</span><h2 id="grocery-theme-title">{selected.title}</h2><p>{selected.ingredients}</p><h3>Make it happen with a grocery gift card</h3>
          <div className={styles.offerList}>{offers.length ? offers.map(offer => <Link key={offer.slug} href={offer.href}><span><strong>{offer.title}</strong><small>${offer.entryPrice.toFixed(2)} per entry · {offer.remaining.toLocaleString()} left</small></span><span aria-hidden="true">→</span></Link>) : <p>No open grocery gift-card offers match right now. Browse the other grocery rewards below.</p>}</div>
          <p className={styles.disclaimer}>You choose what to buy at the retailer. Pictures show inspiration, not a food bundle or a guaranteed $100 shopping list.</p>
          <button type="button" className={styles.back} onClick={() => setSelected(null)}>Keep exploring ideas</button>
        </div>
      </div>
    </dialog> : null}
  </>;
}
