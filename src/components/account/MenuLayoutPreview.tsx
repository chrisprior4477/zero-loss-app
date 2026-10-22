"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MenuLayout } from "@/lib/navigation/menu-layout";
import { ResponsiveSiteHeader } from "@/components/layout/ResponsiveSiteHeader";
import { HeaderAccountMetrics } from "@/components/layout/HeaderAccountMetrics";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { DesktopCategoryNav } from "@/components/layout/DesktopCategoryNav";
import menuStyles from "@/components/layout/site-menu.module.css";
import styles from "./menu-layout-picker.module.css";
import type { MenuPreviewSearchResults } from "@/lib/navigation/search-examples";

export type MenuPreviewAccount = { count: number | null; balance: string | null; avatarUrl: string | null; showPhoto: boolean };

/** A local try-it area: shared menu controls, but destinations stay inside this preview. */
export function MenuLayoutPreview({ layout, account, searchResults = {} }: { layout: MenuLayout; account: MenuPreviewAccount; searchResults?: MenuPreviewSearchResults }) {
  const [playing, setPlaying] = useState(true);
  const [replay, setReplay] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [querySeed, setQuerySeed] = useState("");
  const [destination, setDestination] = useState("Home");
  const [accountOpen, setAccountOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [searchVersion, setSearchVersion] = useState(0);
  const dragRef = useRef<{ id: number; y: number; top: number } | null>(null);
  const [dimensions, setDimensions] = useState({ scale: 1, height: 232 });
  const matches = searchQuery === null ? null : searchResults[searchQuery.toLowerCase()] ?? [];
  useLayoutEffect(() => {
    const page = pageRef.current, results = resultsRef.current;
    if (searchQuery === null || !page || !results) return;
    page.scrollTop += (results.getBoundingClientRect().top - page.getBoundingClientRect().top) / dimensions.scale;
  }, [searchQuery, searchVersion, dimensions.scale]);

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
    // Six short demonstrations add 15 seconds without slowing the real menu down.
    const timers: number[] = [];
    for (let cycle = 0; cycle < 6; cycle++) {
      const start = cycle * 3000;
      timers.push(window.setTimeout(() => setExpanded(true), start + 550));
      timers.push(window.setTimeout(() => setQuerySeed("Coffee"), start + 1250));
      timers.push(window.setTimeout(() => {
        setExpanded(false); setQuerySeed("");
        if (cycle === 5) setPlaying(false);
      }, start + 2900));
    }
    return () => timers.forEach(clearTimeout);
  }, [playing, replay]);

  const activity = { isPreview: false, activity: [], activeCount: account.count, source: "stored" as const };
  function showDestination(title: string) { setSearchQuery(null); setDestination(title); setExpanded(false); setAccountOpen(false); if (pageRef.current) pageRef.current.scrollTop = 0; }
  function navigatePreview(href: string, label: string) {
    const target = new URL(href, "https://preview.invalid");
    if (target.pathname === "/browse" && (target.searchParams.get("sort") === "ending-soon" || target.searchParams.get("category") === "ending-soon" || !target.search)) {
      const endingSoon = target.searchParams.get("sort") === "ending-soon" || target.searchParams.get("category") === "ending-soon";
      showDestination(endingSoon ? "Ending Soon" : "Browse");
      setSearchQuery(endingSoon ? "@ending-soon" : "@browse");
      setSearchVersion(value => value + 1);
      return;
    }
    showDestination(target.pathname === "/" ? "Home" : target.pathname === "/browse" ? label.trim() || "All rewards" : target.pathname === "/account/entries" ? "My Activity" : target.pathname === "/account/wallet" ? "Playable Wallet" : label.trim());
  }

  return <div className={styles.previewPanel}>
    <p className={styles.tryHint}>Try the menu, then swipe or drag the gray page up and down to see what stays. The gray area is just for viewing.</p>
    <div ref={viewportRef} className={styles.demo} style={{ height: dimensions.height }} role="group" aria-label="Interactive menu preview">
      <div ref={canvasRef} className={styles.demoCanvas} style={{ transform: `scale(${dimensions.scale})` }}
        onPointerDownCapture={() => setPlaying(false)} onFocusCapture={() => setPlaying(false)}
        onClickCapture={event => {
          if ((event.target as Element).closest("[inert]")) { event.preventDefault(); event.stopPropagation(); return; }
          const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
          if (!link) return;
          event.preventDefault(); event.stopPropagation();
          navigatePreview(link.getAttribute("href")!, link.getAttribute("aria-label") ?? link.textContent ?? "Home");
        }}>
        <ResponsiveSiteHeader
          preview={{ expanded, query: querySeed, pageCategoriesInPreviewBody: true, onExpandedChange: open => { setPlaying(false); setExpanded(open); }, onSearch: query => { showDestination(query ? `Search results for “${query}”` : "All rewards"); if (query) { setSearchQuery(query); setSearchVersion(value => value + 1); } } }}
          logo={<Link href="/" aria-label="ZeroLoss home"><Image src="/zeroloss-logo.svg" alt="" width={174} height={32} className="h-5 w-auto" /></Link>}
          metrics={<HeaderAccountMetrics isSignedIn liveBalance={account.balance} activityState={activity} />}
          accountMenu={<AccountDrawer isSignedIn displayName="" email={null} avatarUrl={account.avatarUrl} showPhotoInMenu={account.showPhoto} balanceLabel={account.balance} activityState={activity} previewExpanded={accountOpen} onPreviewOpen={() => setAccountOpen(value => !value)} />}
          endingSoonItems={[]} hiddenSlugs={[]}
        />
        {accountOpen ? <div className={styles.demoAccount} aria-label="Preview account menu">
          <div><strong>Your account</strong><button type="button" aria-label="Close preview account menu" onClick={() => setAccountOpen(false)}>×</button></div>
          {["My Activity", "Gift Cards & Rewards", "Your Profile"].map(title => <button type="button" key={title} onClick={() => showDestination(title)}>{title}</button>)}
        </div> : null}
        <div ref={pageRef} className={styles.previewBackdrop} role="region" aria-label="Scrollable page preview" tabIndex={0}
          onPointerDown={event => {
            if (event.pointerType !== "mouse" || event.button !== 0) return;
            dragRef.current = { id: event.pointerId, y: event.clientY, top: event.currentTarget.scrollTop };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const drag = dragRef.current;
            if (drag?.id !== event.pointerId) return;
            event.currentTarget.scrollTop = drag.top + (drag.y - event.clientY) / dimensions.scale;
          }}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onLostPointerCapture={() => { dragRef.current = null; }}>
          <div className={styles.demoPage} aria-hidden="true" inert>
            {layout !== "classic" ? <div className={menuStyles.pageCategories} data-menu-preview="true" data-preview-page-categories>
              <DesktopCategoryNav endingSoonItems={[]} resolvedSlugs={[]} preview showHome={layout !== "home-ending-search"} />
            </div> : null}
            <div className={styles.demoBreadcrumb}>⌂ Home {destination !== "Home" ? `› ${destination}` : ""}</div>
            {destination === "Home" ? <div className={styles.demoHero}>
              <Image src="/mobile-hero-zero-loss-coin-transparent.png" alt="" width={250} height={220} />
              <h3>Real shots.<br />Real wins.<br /><span>Zero loss.</span></h3>
            </div> : <div className={styles.demoDestination}><small>ZERO LOSS MARKETPLACE</small><h3>{destination}</h3><p>Choose a product to see its entry details and current availability.</p></div>}
            {matches ? <div ref={resultsRef} className={`${styles.demoProducts} ${styles.demoSearchResults}`}>
              <h4>{matches.length} {matches.length === 1 ? "product" : "products"} shown</h4>
              {matches.length ? matches.map(product => <div key={product.title} className={styles.demoProduct}><Image src={product.image} alt="" width={220} height={140} /><strong>{product.title}</strong></div>) : <p>No sample results for this search. Try TV, baby stuff, Publix, coffee, or sneakers.</p>}
            </div> : <div className={styles.demoProducts}><h4>Ending Soon</h4>
              <div className={styles.demoProduct}><Image src="/catalog/best-buy-100-gift-card.svg" alt="" width={220} height={140} /><strong>$100 Best Buy Gift Card</strong><span>View reward</span></div>
              <h4>Everyday Items</h4>
              <div className={styles.demoProduct}><Image src="/catalog/homegoods-75-gift-card.svg" alt="" width={220} height={140} /><strong>$75 HomeGoods Gift Card</strong><span>View reward</span></div>
            </div>}
          </div>
        </div>
      </div>
    </div>
    <div className={styles.demoCaption}><span>Interactive preview · phone or narrow window</span><button className={styles.replay} type="button" onClick={() => { setExpanded(false); setQuerySeed(""); setPlaying(true); setReplay(value => value + 1); }}>Replay Animation</button></div>
    <p className={styles.previewStatus} role="status">Preview: {destination}. Menu actions here won’t leave Profile.</p>
  </div>;
}
