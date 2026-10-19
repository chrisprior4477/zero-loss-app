"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { menuLayouts, type MenuLayout } from "@/lib/navigation/menu-layout";
import { saveMenuLayout } from "@/lib/account/menu-layout-action";
import { useMenuLayout } from "@/components/layout/MenuLayoutProvider";
import { ResponsiveSiteHeader } from "@/components/layout/ResponsiveSiteHeader";
import { HeaderAccountMetrics } from "@/components/layout/HeaderAccountMetrics";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import styles from "./menu-layout-picker.module.css";

type PreviewAccount = { count: number | null; balance: string | null; avatarUrl: string | null; showPhoto: boolean };
const emptyPreview: PreviewAccount = { count: 0, balance: "$0.00", avatarUrl: null, showPhoto: false };
function MenuAnimation({ layout, account }: { layout: MenuLayout; account: PreviewAccount }) {
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<"closed" | "open" | "typed">("closed");
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const element = previewRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => { const width = element.getBoundingClientRect().width; if (width > 0) setScale(width / 390); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing) return;
    const open = window.setTimeout(() => setPhase("open"), 60);
    const type = window.setTimeout(() => setPhase("typed"), 1100);
    const close = window.setTimeout(() => { setPhase("closed"); setPlaying(false); }, 2600);
    return () => { clearTimeout(open); clearTimeout(type); clearTimeout(close); };
  }, [playing]);
  const expanded = phase !== "closed";
  const activity = { isPreview: false, activity: [], activeCount: account.count, source: "stored" as const };
  return <div>
    <div ref={previewRef} className={styles.demo} style={{ height: 205 * scale }} aria-hidden="true" inert>
      <div className={styles.demoCanvas} style={{ transform: `scale(${scale})` }}>
        <ResponsiveSiteHeader
          preview={{ expanded, query: phase === "typed" ? "Coffee" : "" }}
          logo={<Image src="/zeroloss-logo.svg" alt="" width={174} height={32} className="h-5 w-auto" />}
          metrics={<HeaderAccountMetrics isSignedIn liveBalance={account.balance} activityState={activity} />}
          accountMenu={<AccountDrawer isSignedIn displayName="" email={null} avatarUrl={account.avatarUrl} showPhotoInMenu={account.showPhoto} balanceLabel={account.balance} activityState={activity} />}
          endingSoonItems={[]} hiddenSlugs={[]}
        />
        <div className={styles.demoPage}><span /><span /><span /></div>
        </div>
    </div>
    <div className={styles.demoCaption}><span>Preview · phone or narrow window</span>{layout !== "classic" ? <button type="button" disabled={playing} onClick={() => setPlaying(true)}>{playing ? "Playing…" : "▶ Play search preview"}</button> : <span>Always open</span>}</div>
  </div>;
}

export function MenuLayoutPicker({ previewAccount = emptyPreview }: { previewAccount?: PreviewAccount }) {
  const { layout, savedLayout, preview, keep, cancel } = useMenuLayout();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const current = menuLayouts.find(option => option.id === layout)!;
  const changed = layout !== savedLayout;

  function save() {
    const chosen = layout;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveMenuLayout(chosen);
        if (!result.ok) { setMessage({ text: result.message, error: true }); return; }
        keep(chosen);
        setMessage({ text: "Your menu choice is saved.", error: false });
      } catch { setMessage({ text: "Your menu choice could not be saved. Please try again.", error: true }); }
    });
  }

  return <section id="personalize-menu" className={styles.ticket} aria-labelledby="personalize-menu-heading">
    <details className={styles.disclosure}>
      <summary><span><span className={styles.eyebrow}>MAKE IT YOURS</span><h2 id="personalize-menu-heading">Personalize your top menu</h2><span className={styles.summaryText}>Choose how your menu and search look.</span><span className={styles.current}>Current style: {menuLayouts.find(option => option.id === savedLayout)!.name}</span></span><span className={styles.chevron} aria-hidden="true">⌄</span></summary>
      <div className={styles.content}>
        <p>Tap a style to try it on the menu above. Preview each style before you save.</p>
        <fieldset disabled={pending} className={styles.options}>
          <legend className="sr-only">Choose your top menu style</legend>
          {menuLayouts.map((option, index) => <label key={option.id} className={styles.option} data-selected={option.id === layout}>
            <input type="radio" name="menu-layout" aria-label={`${index + 1}. ${option.name}`} value={option.id} checked={option.id === layout} onChange={() => { preview(option.id); setMessage(null); }} />
            <span className={styles.number}>{index + 1}</span><span><strong>{option.name}</strong><small>{option.rows}</small></span>
          </label>)}
        </fieldset>
        <MenuAnimation key={layout} layout={layout} account={previewAccount} />
        <p className={styles.description}>{current.description}</p>
        <div className={styles.actions}>
          <button type="button" disabled={pending || !changed} onClick={save}>{pending ? "Saving…" : changed ? "Keep this layout" : "Your saved layout"}</button>
          {changed ? <button type="button" disabled={pending} onClick={() => { cancel(); setMessage(null); }}>Cancel preview</button> : null}
        </div>
        <p className={styles.status} role={message?.error ? "alert" : "status"} data-error={message?.error}>{message?.text ?? (changed ? "You’re trying this style. Keep it when you’re ready." : "You can come back and change this anytime.")}</p>
      </div>
    </details>
  </section>;
}
