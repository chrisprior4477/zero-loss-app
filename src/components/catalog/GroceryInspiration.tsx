"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { groceryThemes, groceryThemeImage, type GroceryTheme } from "@/lib/catalog/grocery-themes";
import { useCrewCarousel } from "@/components/account/useCrewCarousel";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import styles from "./grocery-inspiration.module.css";

export type GroceryInspirationOffer = { slug: string; title: string; entryPrice: number; remaining: number; href: string };

function GroceryRail({ children, label }: { children: ReactNode; label: string }) {
  const { rail, move, ...gestures } = useCrewCarousel();
  return <div className={styles.railWindow}>
    <div ref={rail} role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0} className={styles.rail} {...gestures}
      onDragStart={event => event.preventDefault()}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
          event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1);
        }
      }}>
      {children}
    </div>
  </div>;
}

function ThemeCard({ theme, onChoose }: { theme: GroceryTheme; onChoose: () => void }) {
  return <button type="button" className={styles.themeCard} aria-label={`Explore ${theme.title}`} aria-haspopup="dialog" onClick={onChoose}>
    <span className={styles.themePhoto}><Image src={groceryThemeImage(theme.id)} alt="" fill sizes="(max-width: 640px) 45vw, 280px" draggable={false} className={styles.foodImage} /></span>
    <span className={styles.themeText}><strong>{theme.title}</strong></span>
    <span aria-hidden="true" className={styles.cardArrow}>↗</span>
  </button>;
}

export function GroceryInspiration({ offers }: { offers: GroceryInspirationOffer[] }) {
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
  return <>
    <section id="grocery-inspiration" aria-labelledby="grocery-inspiration-heading" className={styles.panel}>
      <header className={styles.panelHeader}>
        <p className={styles.eyebrow}>A little inspiration for your next grocery run</p>
        <h2 id="grocery-inspiration-heading">Follow your appetite.</h2>
      </header>
      <div className={styles.shelves}>{["Easy favorites", "Make a night of it"].map((mood, index) => <div key={mood} className={styles.shelf}>
        <h3>{index === 0 ? "Keep it easy" : "Make a little occasion of it"}</h3>
        <GroceryRail label={index === 0 ? "Easy grocery ideas" : "Occasion grocery ideas"}>{groceryThemes.filter(theme => theme.mood === mood).map(theme => <ThemeCard key={theme.id} theme={theme} onChoose={() => choose(theme)} />)}</GroceryRail>
      </div>)}</div>
    </section>
    {selected ? <dialog ref={dialog} className={styles.dialog} aria-labelledby="grocery-theme-title" onCancel={() => setSelected(null)} onKeyDown={containDialogTab} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }}>
      <div className={styles.dialogBody}>
        <button type="button" className={styles.close} aria-label="Close grocery idea" onClick={() => setSelected(null)}>×</button>
        <div className={styles.dialogPhoto}><Image src={groceryThemeImage(selected.id)} alt="" fill sizes="(max-width: 640px) 100vw, 560px" className={styles.foodImage} /></div>
        <div className={styles.dialogCopy}>
          <span className={styles.eyebrow}>Your next grocery run, reimagined</span>
          <h2 id="grocery-theme-title">{selected.title}</h2><p>{selected.ingredients}</p>
          <h3>Make it happen with a grocery gift card</h3>
          <div className={styles.offerList}>{offers.length ? offers.map(offer => <Link key={offer.slug} href={offer.href}>
            <span><strong>{offer.title}</strong><small>${offer.entryPrice.toFixed(2)} per entry · {offer.remaining.toLocaleString()} left</small></span><span aria-hidden="true">→</span>
          </Link>) : <p>No open grocery gift-card offers match right now. Browse the other grocery rewards below.</p>}</div>
          <p className={styles.disclaimer}>Choose your groceries at the retailer. Pictures are inspiration; the reward is a gift card.</p>
          <button type="button" className={styles.back} onClick={() => setSelected(null)}>Keep exploring ideas</button>
        </div>
      </div>
    </dialog> : null}
  </>;
}
