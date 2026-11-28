"use client";

import popupStyles from "@/components/layout/responsive-popup.module.css";
import { CategoryRows, DirectAlertChoice, ResultPreview, noticeName } from "./HeaderUpdateCard";
import type { AccountNotification } from "@/lib/account/notifications";
import card from "./result-card.module.css";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNotifications } from "./NotificationProvider";
import { NotificationBanner, previewMessages } from "./NotificationBanner";
import { headerCategories, headerCategory, headerCounts, isResultCategory, resultTypes, headerDestinations, notificationMessages, notificationDestination, type HeaderCategory } from "@/lib/account/header-notifications";
import { containDialogTab } from "@/components/account/dialog-keyboard";
import { useDialogBack } from "@/components/account/useDialogBack";
import styles from "./notifications.module.css";
type Panel = { kind: "result"; item?: AccountNotification } | { kind: "remaining" } | { kind: "list"; category: HeaderCategory };

export function HeaderNotifications({ children }: { children: ReactNode }) {
  const value = useNotifications();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const markAllTrigger = useRef<HTMLButtonElement>(null);
  const markAllFailed = useRef(false);
  const keyboardOpened = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedReads, setFailedReads] = useState<string[]>([]);
  const retryControl = useRef<HTMLButtonElement>(null);
  const [retryingRead, setRetryingRead] = useState(false);
  async function retryRead() {
    if (!value || !failedReads.length || retryingRead) return;
    setRetryingRead(true);
    const retried = failedReads;
    const notice = retryControl.current?.parentElement;
    try {
      await value.markRead(retried);
      const restoreFocus = notice?.contains(document.activeElement) || document.activeElement === document.body;
      setFailedReads(current => current.filter(id => !retried.includes(id)));
      if (restoreFocus) requestAnimationFrame(() => {
        if (document.activeElement !== document.body) return;
        const destination = retryControl.current ?? trigger.current ?? document.querySelector<HTMLElement>('[aria-label="Open account menu"]');
        destination?.focus({ preventScroll: true });
      });
    } catch { /* Keep the original failed reads available for another attempt. */ }
    finally { setRetryingRead(false); }
  }
  useEffect(() => {
    if (busy || !markAllFailed.current) return;
    markAllFailed.current = false;
    const element = dialog.current;
    const button = markAllTrigger.current;
    if (!value?.open || !element || !button) return;
    if (!element.contains(document.activeElement) || document.activeElement === element) button.focus({ preventScroll: true });
    if (document.activeElement === button) {
      element.querySelector<HTMLElement>("[data-header-read-error]")?.scrollIntoView?.({ block: "nearest" });
      button.scrollIntoView?.({ block: "nearest" });
    }
  }, [busy, value?.open]);
  const [view, setView] = useState<Panel>({ kind: "result" });
  const remembered = useRef<AccountNotification | null>(null);
  const [quiet, setQuiet] = useState<{ ids: Set<string>; revision?: number }>({ ids: new Set() });
  const [bannerCategory, setBannerCategory] = useState<HeaderCategory | null>(null);
  const warmed = useRef(new Map<string, number>());
  const endUpdatesHistory = useDialogBack(Boolean(value?.open), () => { keyboardOpened.current = true; value?.setOpen(false); }, false, false, false, "header-updates", () => {
    keyboardOpened.current = true;
    value?.setOpen(true);
  });
  function closeUpdates() { endUpdatesHistory(); value?.setOpen(false); }
  useEffect(() => {
    const restoreCategory = (event: Event) => {
      const matched = headerCategories.find(item => item.key === (event as CustomEvent<unknown>).detail);
      if (matched) setView(remembered.current && headerCategory(remembered.current) === matched.key ? { kind: "result", item: remembered.current } : { kind: "list", category: matched.key });
    };
    window.addEventListener("zero-loss-restore-update-category", restoreCategory);
    return () => window.removeEventListener("zero-loss-restore-update-category", restoreCategory);
  }, []);
  const prefetch = useCallback((href: string, category?: HeaderCategory) => {
    if (!href.startsWith("/account/entries")) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || connection?.effectiveType?.includes("2g")) return;
    const destination = notificationDestination(href, category);
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
    return () => {
      element.close();
      document.body.style.overflow = before;
      if (keyboardOpened.current) {
        const destination = opener?.isConnected ? opener : document.querySelector<HTMLElement>('[aria-label="Open account menu"]');
        destination?.focus({ preventScroll: true });
      } else opener?.blur();
    };
  }, [value?.open]);
  const unread = value?.unread ?? [];
  const all = value?.notifications ?? unread;
  const counts = headerCounts(unread);
  const alertCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  async function act(ids: string[], href?: string, category?: HeaderCategory) {
    if (!value || busy) return;
    if (!href) setBusy(true);
    setError("");
    // Navigation must not wait for the read receipt or a second page render.
    if (href) {
      const hadDialogStep = value.open;
      value.setOpen(false);
      const destination = notificationDestination(href, category);
      if (hadDialogStep) router.replace(destination);
      else router.push(destination);
    }
    try {
      if (ids.length) await value.markRead(ids);
      if (!href) closeUpdates();
    } catch {
      if (href) setFailedReads(previous => [...new Set([...previous, ...ids])]);
      else {
        markAllFailed.current = true;
        setError("We couldn’t mark all updates as read. Try again.");
      }
    }
    finally { if (!href) setBusy(false); }
  }
  const active = Boolean(value?.enabled && alertCount);
  const fresh = unread.filter(item => quiet.revision !== value?.bannerRevision || !quiet.ids.has(item.id));
  const messages = notificationMessages(value?.preferencesPreviewActive ? unread : fresh);
  const bannerVisible = active && messages.length > 0 && (!value?.bannerHidden || value.preferencesPreviewActive);
  const previewing = Boolean(value?.enabled && value.preferencesPreviewActive && !alertCount);
  const currentBanner = bannerVisible ? messages.find(message => message.category === bannerCategory) ?? messages[0] : undefined;

  function showRecord(item: AccountNotification) {
    const category = headerCategory(item);
    if (!category) return;
    remembered.current = item;
    void act(unread.some(n => n.id === item.id) ? [item.id] : [], item.href, category);
  }
  function choose(category: HeaderCategory) {
    if (category === "saved") { void act([], "/account/favorites"); return; }
    const records = recordsFor(category);
    if (records.length === 1) { showRecord(records[0]); return; }
    if (!records.length) { void act([], categoryHref(category), category); return; }
    if (view.kind === "result" && view.item) remembered.current = view.item;
    setView({ kind: "list", category });
    if (list.current) list.current.scrollTop = 0;
  }
  function categoryHref(category: HeaderCategory) {
    if (category === "shared") {
      const shared = all.filter(n => headerCategory(n) === "shared");
      return shared.some(n => n.crewRequestId) ? shared.every(n => n.crewRequestId) ? "/account/crew?tab=requests" : "/account/notifications?filter=crew#notification-tickets-filters" : "/account/favorites?tab=shared";
    }
    if (category === "support") return "/support#case-list";
    if (category === "saved") return "/account/favorites";
    return headerDestinations[category];
  }
  function recordsFor(category: HeaderCategory) {
    const seen = new Set<string>();
    return [...unread, ...all].filter(item => {
      if (headerCategory(item) !== category || seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }
  function openAlert() {
    if (!value) return;
    const targetCategory = currentBanner?.category;
    const candidates = targetCategory ? (value.preferencesPreviewActive ? unread : fresh).filter(n => headerCategory(n) === targetCategory) : unread.filter(n => headerCategory(n));
    const item = candidates[0];
    if (!item) return;
    setQuiet({ ids: new Set(unread.map(n => n.id)), revision: value.bannerRevision });
    const category = headerCategory(item)!;
    if (!currentBanner && alertCount > 1) {
      setView({ kind: "remaining" });
    } else if (isResultCategory(category) && value.directSetting?.(resultTypes[category].pref)) {
      showRecord(item);
      return;
    } else {
      remembered.current = item;
      setView({ kind: "result", item });
      void value.markRead([item.id]).catch(() => setFailedReads(previous => [...new Set([...previous, item.id])]));
    }
    value.setOpen(true);
  }
  const fallback = unread.find(n => headerCategory(n)) ?? all.find(n => headerCategory(n));
  const selectedId = view.kind === "result" ? view.item?.id : undefined;
  const item = view.kind === "result" ? all.find(n => n.id === selectedId && headerCategory(n)) ?? fallback : undefined;
  const resultCategory = item ? headerCategory(item) : null;
  const current = view.kind === "list" ? view.category : resultCategory;
  const color = headerCategories.find(c => c.key === current)?.color ?? "blue";
  const heading = view.kind === "remaining" ? "Unread updates" : view.kind === "list" ? headerCategories.find(c => c.key === current)!.label :
    resultCategory === "support" ? item!.title : isResultCategory(resultCategory) ? resultTypes[resultCategory].headline : resultCategory === "shared" ? "Shared with You" : "Your updates";
  const preloadKey = [item?.href, ...unread.filter(n => headerCategory(n)).slice(0, 2).map(n => n.href)].filter(Boolean).join("\n");
  useEffect(() => {
    if (!active || !preloadKey) return;
    const timer = window.setTimeout(() => preloadKey.split("\n").forEach(href => prefetch(href)), value?.open ? 0 : 500);
    return () => window.clearTimeout(timer);
  }, [active, preloadKey, prefetch, value?.open]);
  const failedReadFeedback = failedReads.length > 0 ? <>
    <span role="alert">Your alert could not be marked as read. It is still available in updates.</span>
    <button ref={retryControl} type="button" disabled={retryingRead} onClick={() => void retryRead()}>{retryingRead ? "Retrying…" : "Retry marking as read"}</button>
    <button type="button" aria-label="Dismiss notification message" onClick={() => setFailedReads([])}>×</button>
  </> : null;
  return <>
    <div className={styles.metrics} data-header-metrics>
      <div className={styles.balances} inert={bannerVisible || previewing ? true : undefined} aria-hidden={bannerVisible || previewing ? true : undefined}>{children}</div>
      {previewing ? <div className={styles.samplePreview} role="img" aria-label="Sample notification banner preview. These examples are not account alerts."><NotificationBanner style={value!.style} speed={value?.speed} displaySeconds={value?.displaySeconds} messages={previewMessages} /></div> : null}
      {active ? <button ref={trigger} type="button" className={styles.trigger} data-banner-hidden={!bannerVisible || undefined} aria-label={`${currentBanner ? `${currentBanner.label} ${currentBanner.count > 99 ? "99+" : currentBanner.count}. ` : ""}${alertCount} unread updates. Open notifications`} aria-haspopup="dialog" aria-expanded={value?.open} onPointerDown={() => { keyboardOpened.current = false; }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") keyboardOpened.current = true; }} onClick={openAlert}>
        {bannerVisible ? <NotificationBanner style={value!.style} speed={value?.speed} displaySeconds={value?.displaySeconds} messages={messages} paused={value?.open} onCategoryChange={setBannerCategory} /> : <span className={card.remainingCount}>{alertCount > 99 ? "99+" : alertCount}</span>}
      </button> : null}
    </div>
    <dialog ref={dialog} className={`${styles.dialog} ${popupStyles.dialog} ${card.panel}`} data-popup-style={value?.popupStyle ?? "rounded"} aria-labelledby="header-updates-title" onCancel={closeUpdates} onKeyDown={containDialogTab} onClick={e => { if (e.target === e.currentTarget) closeUpdates(); }}>
      <div className={card.content} ref={list} data-color={color}>
        <div className={card.heading}><h2 id="header-updates-title">{heading}</h2><button type="button" aria-label="Close updates" onClick={closeUpdates}>×</button></div>
        {item && resultCategory && resultCategory !== "saved" && <ResultPreview item={item} category={resultCategory} onOpen={() => showRecord(item)} />}
        {view.kind === "list" ? <>
          {recordsFor(view.category).map(n => <button type="button" className={card.record} key={n.id} onClick={() => showRecord(n)}>
            <strong>{noticeName(n)}</strong><small>{unread.some(u => u.id === n.id) ? "Unread · " : ""}{n.meta}</small></button>)}
          <button className={card.slim} type="button" onClick={() => void act([], categoryHref(view.category), view.category)}>View all →</button>
        </> : <>
          {view.kind !== "remaining" && <div className={card.groupTitle}><h3>Your updates</h3><span>{alertCount} unread</span></div>}
          <CategoryRows all={all} unread={unread} counts={counts} supportEnabled={value?.supportEnabled !== false} choose={choose} pendingOnly={view.kind === "remaining" && alertCount > 0} />
        </>}
        {isResultCategory(current) && <DirectAlertChoice key={current} category={current} />}
        {failedReadFeedback && value?.open ? <div className={card.error}>{failedReadFeedback}</div> : null}
        {error ? <p role="alert" data-header-read-error className={card.error}>{error}</p> : null}
        <div className={card.footer}>
          {view.kind === "list" && <button className={card.slim} type="button" onClick={() => setView({ kind: "result", item: remembered.current ?? undefined })}>← Back</button>}
          <Link className={card.slim} href="/account/notifications#notifications-intro" replace onNavigate={() => value?.setOpen(false)}>All notifications</Link>
          {view.kind !== "list" && <button className={card.slim} ref={markAllTrigger} disabled={busy || !unread.length} type="button" onClick={() => void act(unread.map(n => n.id))}>{busy ? "Saving…" : "Mark all as read"}</button>}
        </div>
      </div>
    </dialog>
    {failedReadFeedback && !value?.open ? <div className={`${styles.readNotice} ${popupStyles.notice} ${popupStyles.errorNotice}`}>{failedReadFeedback}</div> : null}
    {error && !failedReads.length && !value?.open ? <div className={`${styles.readNotice} ${popupStyles.notice} ${popupStyles.errorNotice}`} role="alert"><span>{error}</span><button type="button" onClick={() => value?.setOpen(true)}>Open updates</button><button type="button" aria-label="Dismiss notification message" onClick={() => setError("")}>×</button></div> : null}
  </>;
}
export function ReturnToUpdates() {
  const search = useSearchParams();
  const value = useNotifications();
  if (search.get("fromUpdates") !== "1" || !value) return null;
  const category = search.get("updateCategory");
  const definition = headerCategories.find(c => c.key === category);
  return <div className={card.returnTools} data-color={definition?.color}>
    {definition && <strong className={card.detailLabel}>{definition.label}</strong>}
    {isResultCategory(category) && <DirectAlertChoice key={category} category={category} />}
    <div className={card.footer}><button className={card.slim} type="button" onClick={() => {
    if (category) window.dispatchEvent(new CustomEvent("zero-loss-restore-update-category", { detail: category }));
    value.setOpen(true);
  }}>← Back to updates</button><Link className={card.slim} href="/account/notifications#notifications-intro">All notifications</Link></div></div>;
}
