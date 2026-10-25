"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNotifications } from "./NotificationProvider";
import { NotificationBanner, previewMessages } from "./NotificationBanner";
import { groupedActivityUpdates, headerCategories, headerCategory, headerCategoryIds, headerCounts, headerDestinations, notificationMessages, notificationDestination, type HeaderCategory } from "@/lib/account/header-notifications";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import styles from "./notifications.module.css";
export function HeaderNotifications({ children }: { children: ReactNode }) {
  const value = useNotifications();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const keyboardOpened = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<HeaderCategory | null>(null);
  const [bannerCategory, setBannerCategory] = useState<HeaderCategory | null>(null);
  const warmed = useRef(new Map<string, number>());
  const prefetch = useCallback((href: string) => {
    if (!href.startsWith("/account/entries")) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || connection?.effectiveType?.includes("2g")) return;
    const destination = notificationDestination(href);
    if (Date.now() - (warmed.current.get(destination) ?? 0) < 30000) return;
    warmed.current.set(destination, Date.now());
    // This Next version requires FULL to warm authenticated dynamic page data.
    router.prefetch(destination, { kind: PrefetchKind.FULL, onInvalidate: () => { warmed.current.delete(destination); } });
  }, [router]);
  useEffect(() => {
    const element = dialog.current;
    const opener = trigger.current;
    if (!element || !value?.open) return;
    element.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = before; if (keyboardOpened.current) opener?.focus({ preventScroll: true }); else opener?.blur(); };
  }, [value?.open]);
  const unread = value?.unread ?? [];
  const all = value?.notifications ?? unread;
  const categories = headerCategories.filter(c => c.key !== "support" || value?.supportEnabled !== false);
  const counts = headerCounts(unread);
  const messages = notificationMessages(unread);
  const alertCount = messages.reduce((sum, m) => sum + m.count, 0);
  async function act(ids: string[], href?: string) {
    if (!value || busy) return;
    if (!href) setBusy(true);
    setError("");
    // Navigation must not wait for the read receipt or a second page render.
    if (href) { value.setOpen(false); router.push(notificationDestination(href)); }
    try {
      if (ids.length) await value.markRead(ids);
      if (!href) value.setOpen(false);
    } catch { setError("Your alert could not be marked as read. It is still available in updates."); }
    finally { if (!href) setBusy(false); }
  }
  function choose(category: HeaderCategory, acknowledge = false) {
    if (category === "saved") { void act([], "/account/favorites"); return; }
    setSelected(category);
    if (list.current) list.current.scrollTop = 0;
    if (acknowledge && value && (category === "wins" || category === "options" || category === "entries")) {
      const ids = headerCategoryIds(unread, category);
      setError("");
      if (ids.length) void value.markRead(ids).catch(() => setError("Your alert could not be marked as read. It is still available in updates."));
    }
  }
  const active = Boolean(value?.enabled && alertCount);
  const previewing = Boolean(value?.enabled && value.preferencesPreviewActive && !alertCount);
  const current = (selected && categories.some(c => c.key === selected) ? selected : null) ?? categories.find(c => counts[c.key] > 0)?.key ?? "wins";
  const categoryInfo = headerCategories.find(c => c.key === current)!;
  const activityCategory = current === "wins" || current === "options" || current === "entries" ? current : null;
  // Reading a category clears its badge, never the cards the member is viewing.
  const groups = activityCategory ? groupedActivityUpdates(all, all, activityCategory) : [];
  const items = unread.filter(n => headerCategory(n) === current);
  const actions = { wins: "View my wins", options: "View purchase options", entries: "See my entries" };
  const preloadKey = (value?.open && activityCategory
    ? [headerDestinations[activityCategory], ...groups.slice(0, 3).map(group => group.href)]
    : (["wins", "options"] as const).flatMap(category => groupedActivityUpdates(all, unread, category).slice(0, 1).map(group => group.href))).join("\n");
  useEffect(() => {
    if (!active || !preloadKey) return;
    const timer = window.setTimeout(() => preloadKey.split("\n").forEach(prefetch), value?.open ? 0 : 500);
    return () => window.clearTimeout(timer);
  }, [active, preloadKey, prefetch, value?.open]);
  return <>
    <div className={styles.metrics} data-header-metrics>
      <div className={styles.balances} inert={active || previewing ? true : undefined} aria-hidden={active || previewing ? true : undefined}>{children}</div>
      {previewing ? <div className={styles.samplePreview} role="img" aria-label="Sample notification banner preview. These examples are not account alerts."><NotificationBanner style={value!.style} speed={value?.speed} displaySeconds={value?.displaySeconds} messages={previewMessages} /></div> : null}
      {active ? <button ref={trigger} type="button" className={styles.trigger} aria-label={`${alertCount} unread updates. Open notifications`} aria-haspopup="dialog" aria-expanded={value?.open} onPointerDown={() => { keyboardOpened.current = false; }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") keyboardOpened.current = true; }} onClick={() => { if (bannerCategory) choose(bannerCategory); value?.setOpen(true); }}>
        {!value?.bannerHidden ? <NotificationBanner style={value!.style} speed={value?.speed} displaySeconds={value?.displaySeconds} messages={messages} paused={value?.open} onCategoryChange={setBannerCategory} /> : <span className={styles.dot} />}
      </button> : null}
    </div>
    <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog}`} data-popup-style={value?.popupStyle ?? "rounded"} aria-labelledby="header-updates-title" onCancel={() => value?.setOpen(false)} onKeyDown={containDialogTab} onClick={e => { if (e.target === e.currentTarget) value?.setOpen(false); }}>
      <div className={styles.dialogHeading}><h2 id="header-updates-title">Your updates</h2><button type="button" aria-label="Close updates" onClick={() => value?.setOpen(false)}>×</button></div>
      <nav className={styles.categories} data-count={categories.length} aria-label="Update categories">
        {categories.map(c => <button key={c.key} type="button" data-color={c.color} aria-pressed={current === c.key} aria-controls="header-update-sections" onClick={() => choose(c.key, true)}>{c.label}{counts[c.key] > 0 ? <span>{counts[c.key]}</span> : null}</button>)}
      </nav>
      <div ref={list} className={styles.items} id="header-update-sections">
        <section className={styles.section} aria-label={categoryInfo.label}>
          <div className={styles.sectionHeading}><h3>{categoryInfo.label}</h3>{activityCategory ? <button type="button" disabled={busy} onClick={() => void act(headerCategoryIds(unread, activityCategory), headerDestinations[activityCategory])}>View all →</button> : current === "shared" ? <button type="button" onClick={() => void act([], "/account/favorites?tab=shared")}>View all →</button> : null}</div>
          {activityCategory ? (groups.length ? groups.map(group => <button key={group.slug} type="button" disabled={busy} className={styles.entry} data-color={categoryInfo.color} onPointerEnter={() => prefetch(group.href)} onFocus={() => prefetch(group.href)} onClick={() => void act(headerCategoryIds(unread, activityCategory), group.href)}>
              {group.image ? <Image src={group.image} alt="" width={44} height={44} unoptimized /> : null}
              <span><strong>{group.title}</strong><b>{actions[activityCategory]} →</b></span><span className={styles.ticketCount} aria-label={`${group.count} ${activityCategory === "entries" ? "tickets" : activityCategory === "wins" ? "wins" : "purchase options"}`}>{group.count}</span>
            </button>) : <p className={styles.empty}>Nothing here yet. View all to see your activity.</p>) : items.length ? items.map(n => <button type="button" key={n.id} disabled={busy} onClick={() => void act([n.id], n.href)} className={styles.entry} data-color={categoryInfo.color}>
              {n.image ? <Image src={n.image} alt="" width={44} height={44} unoptimized /> : <span className={styles.itemIcon} aria-hidden="true">{current === "support" ? "?" : "↗"}</span>}
              <span><strong>{n.title}</strong><b>{n.action} →</b></span>
            </button>) : <p className={styles.empty}>No unread {current === "support" ? "support updates" : "shared picks"}. {current === "support" ? <Link href="/support#case-list" onClick={() => value?.setOpen(false)}>View my support cases →</Link> : null}</p>}
        </section>
      </div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <div className={styles.footer}>
        {unread.length ? <button disabled={busy} type="button" onClick={() => void act(unread.map(n => n.id))}>{busy ? "Saving…" : "Mark all as read"}</button> : null}
        <Link href="/account/notifications#notifications-intro" onClick={() => value?.setOpen(false)}>All notifications</Link>
        {active ? <button type="button" onClick={() => { value?.setBannerHidden(!value.bannerHidden); value?.setOpen(false); }}>{value?.bannerHidden ? "Show notification banner" : "Show tickets & balance"}</button> : null}
      </div>
    </dialog>
    {error && !value?.open ? <div className={`${styles.readNotice} ${popupStyles.notice} ${popupStyles.errorNotice}`} role="alert"><span>{error}</span><button type="button" onClick={() => value?.setOpen(true)}>Open updates</button><button type="button" aria-label="Dismiss notification message" onClick={() => setError("")}>×</button></div> : null}
  </>;
}
export function ReturnToUpdates() {
  const search = useSearchParams();
  const value = useNotifications();
  if (search.get("fromUpdates") !== "1" || !value) return null;
  return <div className={styles.return}><button type="button" onClick={() => value.setOpen(true)}>← Back to updates</button></div>;
}
