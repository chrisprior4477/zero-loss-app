"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MenuLayout } from "@/lib/navigation/menu-layout";
import { ResponsiveSiteHeader } from "@/components/layout/ResponsiveSiteHeader";
import { HeaderAccountMetrics } from "@/components/layout/HeaderAccountMetrics";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import styles from "./menu-layout-picker.module.css";

export type MenuPreviewAccount = { count: number | null; balance: string | null; avatarUrl: string | null; showPhoto: boolean };

/** A local try-it area: shared menu controls, but destinations stay inside this preview. */
export function MenuLayoutPreview({ account }: { layout: MenuLayout; account: MenuPreviewAccount }) {
  const [playing, setPlaying] = useState(true);
  const [replay, setReplay] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [querySeed, setQuerySeed] = useState("");
  const [destination, setDestination] = useState("Home");
  const [accountOpen, setAccountOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ scale: 1, height: 369 });

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const width = viewport.getBoundingClientRect().width;
      if (width <= 0) return;
      const scale = width / 390;
      setDimensions({ scale, height: canvas.offsetHeight * scale });
    });
    observer.observe(viewport); observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    // Reduced-motion customers can still type, tap and submit the preview themselves.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const open = window.setTimeout(() => setExpanded(true), 550);
    const type = window.setTimeout(() => setQuerySeed("Coffee"), 1250);
    const close = window.setTimeout(() => { setExpanded(false); setQuerySeed(""); setPlaying(false); }, 2900);
    return () => { clearTimeout(open); clearTimeout(type); clearTimeout(close); };
  }, [playing, replay]);

  const activity = { isPreview: false, activity: [], activeCount: account.count, source: "stored" as const };
  function showDestination(title: string) { setDestination(title); setExpanded(false); setAccountOpen(false); }
  function navigatePreview(href: string, label: string) {
    const target = new URL(href, "https://preview.invalid");
    showDestination(target.pathname === "/" ? "Home" : target.pathname === "/browse" ? label.trim() || "All rewards" : target.pathname === "/account/entries" ? "My Activity" : target.pathname === "/account/wallet" ? "Playable Wallet" : label.trim());
  }

  return <div className={styles.previewPanel}>
    <p className={styles.tryHint}>Try it here—tap Search, type, and press Go. You’ll stay on this page.</p>
    <div ref={viewportRef} className={styles.demo} style={{ height: dimensions.height }} role="group" aria-label="Interactive menu preview">
      <div ref={canvasRef} className={styles.demoCanvas} style={{ transform: `scale(${dimensions.scale})` }}
        onPointerDownCapture={() => setPlaying(false)} onFocusCapture={() => setPlaying(false)}
        onClickCapture={event => {
          const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
          if (!link) return;
          event.preventDefault(); event.stopPropagation();
          navigatePreview(link.getAttribute("href")!, link.getAttribute("aria-label") ?? link.textContent ?? "Home");
        }}>
        <ResponsiveSiteHeader
          preview={{ expanded, query: querySeed, onExpandedChange: setExpanded, onSearch: query => showDestination(query ? `Search results for “${query}”` : "All rewards") }}
          logo={<Link href="/" aria-label="ZeroLoss home"><Image src="/zeroloss-logo.svg" alt="" width={174} height={32} className="h-5 w-auto" /></Link>}
          metrics={<HeaderAccountMetrics isSignedIn liveBalance={account.balance} activityState={activity} />}
          accountMenu={<AccountDrawer isSignedIn displayName="" email={null} avatarUrl={account.avatarUrl} showPhotoInMenu={account.showPhoto} balanceLabel={account.balance} activityState={activity} previewExpanded={accountOpen} onPreviewOpen={() => setAccountOpen(value => !value)} />}
          endingSoonItems={[]} hiddenSlugs={[]}
        />
        {accountOpen ? <div className={styles.demoAccount} aria-label="Preview account menu">
          <div><strong>Your account</strong><button type="button" aria-label="Close preview account menu" onClick={() => setAccountOpen(false)}>×</button></div>
          {["My Activity", "Gift Cards & Rewards", "Your Profile"].map(title => <button type="button" key={title} onClick={() => showDestination(title)}>{title}</button>)}
        </div> : null}
        <div className={styles.previewBackdrop}>
          <div className={styles.demoPage} aria-hidden="true">
            <div className={styles.demoBreadcrumb}>⌂ Home {destination !== "Home" ? `› ${destination}` : ""}</div>
            {destination === "Home" ? <div className={styles.demoHero}>
              <Image src="/mobile-hero-zero-loss-coin-transparent.png" alt="" width={250} height={220} />
              <h3>Real shots.<br />Real wins.<br /><span>Zero loss.</span></h3>
            </div> : <div className={styles.demoDestination}><small>ZERO LOSS MARKETPLACE</small><h3>{destination}</h3><p>Choose a product to see its entry details and current availability.</p></div>}
            <div className={styles.demoProducts}><h4>Ending Soon</h4><Image src="/catalog/best-buy-100-gift-card.svg" alt="" width={120} height={80} /><span>$100 Best Buy Gift Card</span></div>
          </div>
        </div>
      </div>
    </div>
    <div className={styles.demoCaption}><span>Interactive preview · phone or narrow window</span><button type="button" onClick={() => { setExpanded(false); setQuerySeed(""); setPlaying(true); setReplay(value => value + 1); }}>↻ Replay animation</button></div>
    <p className={styles.previewStatus} role="status">Preview: {destination}. Menu actions here won’t leave Profile.</p>
  </div>;
}
