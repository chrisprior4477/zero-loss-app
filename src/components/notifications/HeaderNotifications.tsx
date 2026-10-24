"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNotifications } from "./NotificationProvider";
import { NotificationBanner } from "./NotificationBanner";
import { groupedActivityUpdates, headerCategories, headerCategory, headerCategoryIds, headerCounts, headerDestinations, notificationMessages, notificationDestination, type HeaderCategory } from "@/lib/account/header-notifications";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import styles from "./notifications.module.css";
export function HeaderNotifications({ children }: { children: ReactNode }) {
  const value = useNotifications();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<HeaderCategory | null>(null);
  const [bannerCategory, setBannerCategory] = useState<HeaderCategory | null>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = trigger.current;
    if (!element || !value?.open) return;
    element.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = before; opener?.focus({ preventScroll: true }); };
  }, [value?.open]);
  const unread = value?.unread ?? [];
  const all = value?.notifications ?? unread;
  const counts = headerCounts(unread);
  const messages = notificationMessages(unread);
  const alertCount = messages.filter(m => m.label !== "See open entries").reduce((sum, m) => sum + m.count, 0);
  async function act(ids: string[], href?: string) {
    if (!value || busy) return;
    setBusy(true); setError("");
    try {
      if (ids.length) await value.markRead(ids);
      value.setOpen(false);
      if (href) router.push(notificationDestination(href));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function choose(category: HeaderCategory) {
    setSelected(category);
    if (list.current) list.current.scrollTop = 0;
  }
  const active = Boolean(value?.enabled && alertCount);
  const current = selected ?? headerCategories.find(c => counts[c.key] > 0)?.key ?? "wins";
  const categoryInfo = headerCategories.find(c => c.key === current)!;
  const activityCategory = current === "wins" || current === "options" || current === "entries" ? current : null;
  const groups = activityCategory ? groupedActivityUpdates(all, unread, activityCategory) : [];
  const items = unread.filter(n => headerCategory(n) === current);
  const actions = { wins: "View my wins", options: "View purchase options", entries: "See my entries" };
  return <>
    <div className={styles.metrics} data-header-metrics>
      <div className={styles.balances} inert={active ? true : undefined} aria-hidden={active ? true : undefined}>{children}</div>
      {active ? <button ref={trigger} type="button" className={styles.trigger} aria-label={`${alertCount} unread updates. Open notifications`} aria-haspopup="dialog" aria-expanded={value?.open} onClick={() => { if (bannerCategory) choose(bannerCategory); value?.setOpen(true); }}>
        {!value?.bannerHidden ? <NotificationBanner style={value!.style} speed={value?.speed} messages={messages} paused={value?.open} onCategoryChange={setBannerCategory} /> : <span className={styles.dot} />}
      </button> : null}
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="header-updates-title" onCancel={() => value?.setOpen(false)} onKeyDown={containDialogTab} onClick={e => { if (e.target === e.currentTarget) value?.setOpen(false); }}>
      <div className={styles.dialogHeading}><h2 id="header-updates-title">Your updates</h2><button type="button" aria-label="Close updates" onClick={() => value?.setOpen(false)}>×</button></div>
      <nav className={styles.categories} aria-label="Update categories">
        {headerCategories.map(c => <button key={c.key} type="button" data-color={c.color} aria-pressed={current === c.key} aria-controls="header-update-sections" onClick={() => choose(c.key)}>{c.label}{counts[c.key] > 0 ? <span>{counts[c.key]}</span> : null}</button>)}
      </nav>
      <div ref={list} className={styles.items} id="header-update-sections">
        <section className={styles.section} aria-label={categoryInfo.label}>
          <div className={styles.sectionHeading}><h3>{categoryInfo.label}</h3>{activityCategory ? <button type="button" disabled={busy} onClick={() => void act(headerCategoryIds(unread, activityCategory), headerDestinations[activityCategory])}>View all →</button> : null}</div>
          {activityCategory ? (groups.length ? groups.map(group => <button key={group.slug} type="button" disabled={busy} className={styles.entry} data-color={categoryInfo.color} onClick={() => void act(headerCategoryIds(unread, activityCategory), group.href)}>
              {group.image ? <Image src={group.image} alt="" width={44} height={44} unoptimized /> : null}
              <span><strong>{group.title}</strong><b>{actions[activityCategory]} →</b></span><span className={styles.ticketCount} aria-label={`${group.count} ${activityCategory === "entries" ? "tickets" : activityCategory === "wins" ? "wins" : "purchase options"}`}>{group.count}</span>
            </button>) : <p className={styles.empty}>No unread alerts here. View all to see your activity, or use Restore banner in your profile to bring current alerts back.</p>) : items.length ? items.map(n => <button type="button" key={n.id} disabled={busy} onClick={() => void act([n.id], n.href)} className={styles.entry} data-color={categoryInfo.color}>
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
  </>;
}
export function ReturnToUpdates() {
  const search = useSearchParams();
  const value = useNotifications();
  if (search.get("fromUpdates") !== "1" || !value) return null;
  return <div className={styles.return}><button type="button" onClick={() => value.setOpen(true)}>← Back to updates</button></div>;
}
