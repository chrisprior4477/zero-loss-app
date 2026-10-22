"use client";

import Link from "next/link";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useMenuLayout } from "./MenuLayoutProvider";
import { useMobileLogoSize } from "./MobileLogoSizeProvider";
import { useMenuViewport } from "./useMenuViewport";
import { DesktopHeaderSearch, DesktopHeaderSearchFallback } from "./DesktopHeaderSearch";
import { DesktopCategoryNav } from "./DesktopCategoryNav";
import { HomeIcon } from "./HomeIcon";
import { showsShoppingCategories, type MenuLayout } from "@/lib/navigation/menu-layout";
import styles from "./site-menu.module.css";

type Props = {
  logo: ReactNode;
  metrics: ReactNode;
  accountMenu: ReactNode;
  endingSoonItems: { title: string; href: string; remaining: number }[];
  hiddenSlugs: string[];
  preview?: { layout?: MenuLayout; expanded: boolean; query: string; pageCategoriesInPreviewBody?: boolean; onExpandedChange?: (open: boolean) => void; onSearch?: (query: string) => void };
};

export function ResponsiveSiteHeader({ logo, metrics, accountMenu, endingSoonItems, hiddenSlugs, preview }: Props) {
  const menu = useMenuLayout();
  const viewport = useMenuViewport();
  const layout = preview ? (preview.layout ?? menu.layout) : menu.layouts[viewport ?? "mobile"];
  const { size: logoSize } = useMobileLogoSize();
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [searchSession, setSearchSession] = useState({ layout, pathname, open: false });
  const expanded = preview ? preview.expanded : searchSession.layout === layout && searchSession.pathname === pathname && searchSession.open;
  const singleRow = layout === "search-down" || layout === "search-down-browse" || layout === "search-over";
  const setSearchOpen = (open: boolean) => {
    if (preview) preview.onExpandedChange?.(open);
    else setSearchSession({ layout, pathname, open });
  };
  const closeSearch = () => setSearchOpen(false);
  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.querySelector<HTMLInputElement>("input")?.focus());
  };

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header || preview) return;
    const measure = () => {
      const headerHeight = header.getBoundingClientRect().height;
      // Equal desktop gutters keep search centered even when balance/count widths change.
      const sideWidth = Math.max(logoRef.current?.getBoundingClientRect().width ?? 0, accountRef.current?.getBoundingClientRect().width ?? 0);
      document.documentElement.style.setProperty("--site-header-height", `${headerHeight}px`);
      header.style.setProperty("--desktop-header-side-width", `${sideWidth}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    if (logoRef.current) observer.observe(logoRef.current);
    if (accountRef.current) observer.observe(accountRef.current);
    return () => observer.disconnect();
  }, [layout, expanded, preview]);

  useEffect(() => {
    if (!expanded || layout === "classic") return;
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || searchRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      if (preview) preview.onExpandedChange?.(false);
      else setSearchSession({ layout, pathname, open: false });
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [expanded, layout, pathname, preview]);

  const categories = <DesktopCategoryNav endingSoonItems={endingSoonItems} resolvedSlugs={hiddenSlugs} preview={Boolean(preview)} />;
  const searchProps = {
    inputId: preview ? "preview-mobile-header-search" : "mobile-header-search",
    active: layout === "classic" ? undefined : expanded,
    onActivate: () => setSearchOpen(true),
    onSubmitted: closeSearch,
    onDismiss: layout !== "classic" && expanded ? () => {
      closeSearch();
      if (singleRow) toggleRef.current?.focus();
      else searchRef.current?.querySelector<HTMLInputElement>("input")?.blur();
    } : undefined,
  };

  return <>
    <header ref={headerRef} data-menu-layout={layout} data-menu-viewport={viewport ?? undefined} data-search-open={expanded} data-menu-preview={preview ? "true" : undefined} style={{ "--mobile-logo-scale": 1 + logoSize / 100 } as CSSProperties} className={`${preview ? "" : "sticky"} ${styles.header}`}>
      <div className={styles.topRow}>
        <div ref={logoRef} className={styles.logo}>{logo}</div>
        <button ref={toggleRef} type="button" className={styles.searchToggle} aria-label="Open search" aria-expanded={expanded} aria-controls={preview ? "preview-menu-search" : "mobile-menu-search"} onClick={openSearch}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6" /></svg>
        </button>
        {!preview ? <div className={styles.desktopSearch}><Suspense fallback={<DesktopHeaderSearchFallback />}><DesktopHeaderSearch /></Suspense></div> : null}
        <div ref={accountRef} className={styles.accountControls}>{metrics}{accountMenu}</div>
      </div>
      <div id={preview ? "preview-menu-search" : "mobile-menu-search"} ref={searchRef} className={styles.mobileSearchRow}>
        <div className={styles.shortcuts} aria-hidden={expanded || undefined} inert={expanded || undefined}>
          {layout === "home-ending-search" ? <Link href="/" aria-label="Home" className={styles.home}><HomeIcon className="h-5 w-5" /></Link> : null}
          <Link href="/browse?sort=ending-soon#search-results" className={styles.endingSoon}>Ending Soon</Link>
        </div>
        <div className={styles.mobileSearch}>{preview ? <DesktopHeaderSearchFallback key={preview.query} {...searchProps} initialQuery={preview.query} navigate={href => preview.onSearch?.(new URL(href, "https://preview.invalid").searchParams.get("q") ?? "")} /> : <Suspense fallback={<DesktopHeaderSearchFallback {...searchProps} />}><DesktopHeaderSearch {...searchProps} /></Suspense>}</div>
        {layout === "search-down-browse" ? <div className={styles.pushDownActions} aria-label="Search shopping shortcuts" inert={!expanded} aria-hidden={!expanded}>
          <Link href="/browse?sort=ending-soon#search-results" className={styles.endingSoon} onClick={closeSearch}>Ending Soon</Link>
          <Link href="/browse#retailer-categories-heading" className={styles.browse} onClick={closeSearch}>Browse</Link>
        </div> : null}
      </div>
      <div className={styles.stickyCategories}>{categories}</div>
      <div aria-hidden="true" className={styles.brandRule} />
    </header>
    {layout !== "classic" && !preview?.pageCategoriesInPreviewBody && (preview || showsShoppingCategories(pathname)) ? <div className={styles.pageCategories} data-menu-viewport={viewport ?? undefined} data-shopping-category-row={preview ? undefined : true} data-menu-preview={preview ? "true" : undefined}>
      <DesktopCategoryNav endingSoonItems={endingSoonItems} resolvedSlugs={hiddenSlugs} preview={Boolean(preview)} showHome={layout !== "home-ending-search"} />
    </div> : null}
  </>;
}
