"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNotifications } from "./NotificationProvider";
import { NotificationBanner } from "./NotificationBanner";
import { groupedOpenEntries, headerCategories, headerCategory, headerCategoryIds, headerCounts, headerDestinations, notificationMessages, notificationDestination, type HeaderCategory } from "@/lib/account/header-notifications";
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
  const [hidden, setHidden] = useState(false);
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
  const groups = groupedOpenEntries(all, unread);
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
  const priorities: HeaderCategory[] = ["wins", "options", "shared", "support", "purchases", "entries"];
  const order = selected ? [selected, ...priorities.filter(c => c !== selected)] : priorities;
  const labels = { wins: "You won", options: "Purchase options", purchases: "Purchases", entries: "Open entries", support: "Support", shared: "Shared picks" };
  const actions = { wins: "View my wins", options: "View purchase options", purchases: "View my purchases", entries: "View open entries" };
  const details = { wins: "Prizes ready to view", options: "Available in My Activity", purchases: "Your completed purchases and outcomes" };
  return <>
    <div className={styles.metrics} data-header-metrics>
      <div className={styles.balances} inert={active ? true : undefined} aria-hidden={active ? true : undefined}>{children}</div>
      {active ? <button ref={trigger} type="button" className={styles.trigger} aria-label={`${alertCount} unread updates. Open notifications`} aria-haspopup="dialog" aria-expanded={value?.open} onClick={() => { if (bannerCategory) choose(bannerCategory); value?.setOpen(true); }}>
        {!hidden ? <NotificationBanner style={value!.style} speed={value?.speed} messages={messages} paused={value?.open} onCategoryChange={setBannerCategory} /> : <span className={styles.dot} />}
      </button> : null}
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="header-updates-title" onCancel={() => value?.setOpen(false)} onKeyDown={containDialogTab} onClick={e => { if (e.target === e.currentTarget) value?.setOpen(false); }}>
      <div className={styles.dialogHeading}><h2 id="header-updates-title">Your updates</h2><button type="button" aria-label="Close updates" onClick={() => value?.setOpen(false)}>×</button></div>
      <nav className={styles.categories} aria-label="Update categories">
        {headerCategories.map(c => <button key={c.key} type="button" data-color={c.color} aria-pressed={selected === c.key} aria-controls="header-update-sections" onClick={() => choose(c.key)}>{c.label}{counts[c.key] > 0 ? <span>{counts[c.key]}</span> : null}</button>)}
      </nav>
      <div ref={list} className={styles.items} id="header-update-sections">
        {order.map(category => {
          const items = unread.filter(n => headerCategory(n) === category);
          const chosen = selected === category;
          if (!items.length && !chosen) return null;
          const color = headerCategories.find(c => c.key === category)!.color;
          if (category === "wins" || category === "options" || category === "purchases") return <section key={category} className={styles.section} aria-label={labels[category]}>
            <button type="button" disabled={busy} className={styles.summary} data-color={color} onClick={() => void act(headerCategoryIds(unread, category), headerDestinations[category])}>
              <span><strong>{labels[category]}</strong><small>{counts[category] ? details[category] : "No new alerts. You can still view your activity."}</small><b>{actions[category]} →</b></span>
              {counts[category] ? <span className={styles.summaryCount}>{counts[category]}</span> : null}
            </button>
          </section>;
          if (category === "entries") return <section key={category} className={styles.section} aria-label="Open entries">
            <div className={styles.sectionHeading}><h3>Open entries</h3><button type="button" disabled={busy} onClick={() => void act(headerCategoryIds(unread, "entries"), headerDestinations.entries)}>View all →</button></div>
            {groups.length ? groups.map(group => <button key={group.slug} type="button" disabled={busy} className={styles.entry} onClick={() => void act(headerCategoryIds(unread, "entries"), group.href)}>
              {group.image ? <Image src={group.image} alt="" width={44} height={44} unoptimized /> : null}
              <span><strong>{group.title}</strong><b>See my entries →</b></span><span className={styles.ticketCount} aria-label={`${group.count} tickets`}>{group.count}</span>
            </button>) : <p className={styles.empty}>No new entry alerts. Your tickets are in My Activity.</p>}
          </section>;
          // Support and shared picks start compact; choosing them brings the
          // individual conversations/items to the top, without a fixed hierarchy.
          return <section key={category} className={styles.section} aria-label={labels[category]}>
            {chosen ? <><h3 className={styles.listHeading}>{labels[category]}</h3>{items.length ? items.map(n => <button type="button" key={n.id} disabled={busy} onClick={() => void act([n.id], n.href)} className={styles.item} data-color={color}><strong>{n.title}</strong><small>{n.body}</small><b>{n.action} →</b></button>) : <p className={styles.empty}>No new {category === "support" ? "support updates" : "shared picks"}. {category === "support" ? <Link href="/support#case-list" onClick={() => value?.setOpen(false)}>View my support cases →</Link> : null}</p>}</> : <button type="button" className={styles.summary} data-color={color} onClick={() => choose(category)}><span><strong>{labels[category]}</strong><b>{category === "support" ? "View conversations" : "View shared picks"} →</b></span><span className={styles.summaryCount}>{counts[category]}</span></button>}
          </section>;
        })}
        {!unread.some(n => headerCategory(n)) && !selected ? <p className={styles.empty}>You’re all caught up. Choose a category above to view your activity.</p> : null}
      </div>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <div className={styles.footer}>
        {unread.length ? <button disabled={busy} type="button" onClick={() => void act(unread.map(n => n.id))}>{busy ? "Saving…" : "Mark all as read"}</button> : null}
        <Link href="/account/notifications#notifications-intro" onClick={() => value?.setOpen(false)}>All notifications</Link>
        {active ? <button type="button" onClick={() => { setHidden(!hidden); value?.setOpen(false); }}>{hidden ? "Show notification banner" : "Show tickets & balance"}</button> : null}
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
