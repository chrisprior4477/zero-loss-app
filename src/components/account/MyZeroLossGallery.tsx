"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { activityHref, type ActivityFilter, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon } from "./AccountIcon";
import styles from "./my-activity.module.css";
import type { ActivityOfferMetrics } from "@/lib/account/activity-progress";
import { availabilityStatus } from "@/lib/catalog/availability";
import { ClearAllEntriesButton } from "./ClearAllEntriesButton";
import { RECENT_ENTRY_STORAGE_KEY } from "@/lib/entries/request";

const labels = { active: "Still open", prize: "You won", completion: "Purchase option", completed: "Completed" };
type GalleryGroup = { key: string; entries: ActivityItem[] };

function groupGalleryEntries(items: ActivityItem[]): GalleryGroup[] {
  const groups: GalleryGroup[] = [];
  const openGroups = new Map<string, GalleryGroup>();
  for (const item of items) {
    // Only combine open entries for the same prize. Outcomes and purchase options
    // can differ per entry and must keep their own tickets.
    const key = item.status === "active" && item.entryId ? `active:${item.slug}` : `entry:${item.entryId ?? item.slug}:${groups.length}`;
    const existing = item.status === "active" && item.entryId ? openGroups.get(key) : undefined;
    if (existing) existing.entries.push(item);
    else {
      const group = { key, entries: [item] };
      groups.push(group);
      if (item.status === "active" && item.entryId) openGroups.set(key, group);
    }
  }
  return groups;
}

function action(item: ActivityItem) {
  if (item.status === "prize") return item.rewardKind === "digital" ? "Open reward" : "Claim prize";
  if (item.completionOptionStatus === "declined") return "Review declined";
  return { active: "See My Entry", completion: "Review option", completed: "View details" }[item.status];
}

export function MyZeroLossGallery({ items, filter, metricsBySlug, canClearDemoEntries = false, viewedEntryId }: { items: ActivityItem[]; filter: ActivityFilter; metricsBySlug: Record<string, ActivityOfferMetrics>; canClearDemoEntries?: boolean; viewedEntryId?: string }) {
  const groups = groupGalleryEntries(items);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, pointerId: -1, startScrollLeft: 0, startX: 0 });
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState({ start: 0, end: groups.length - 1, previous: false, next: false });
  const [recentEntry, setRecentEntry] = useState<{ slug: string; entryId: string | null } | null>(null);
  const [viewedEntry, setViewedEntry] = useState<string | null>(null);
  const galleryId = useId();

  function move(direction: number) {
    const element = track.current;
    const card = element?.firstElementChild as HTMLElement | null;
    if (element && card) {
      const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
      element.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    }
  }

  const syncSwipe = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const cards = Array.from(element.children) as HTMLElement[];
    const bounds = element.getBoundingClientRect();
    const visible = cards.map((card, index) => ({ bounds: card.getBoundingClientRect(), index })).filter(({ bounds: card }) => Math.min(card.right, bounds.right) - Math.max(card.left, bounds.left) >= card.width * .5);
    setView({ start: visible[0]?.index ?? 0, end: visible.at(-1)?.index ?? groups.length - 1, previous: element.scrollLeft > 2, next: element.scrollWidth - element.clientWidth - element.scrollLeft > 2 });
  }, [groups.length]);

  useEffect(() => {
    if (!viewedEntryId || !items.some(item => item.entryId === viewedEntryId)) return;
    const frame = requestAnimationFrame(() => {
      const card = Array.from(track.current?.querySelectorAll<HTMLElement>("[data-activity-entry-ids]") ?? [])
        .find(element => element.dataset.activityEntryIds?.split(" ").includes(viewedEntryId));
      card?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
      setViewedEntry(viewedEntryId);
    });
    const timer = window.setTimeout(() => setViewedEntry(null), 15000);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [items, viewedEntryId]);

  useEffect(() => {
    const frame = requestAnimationFrame(syncSwipe);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncSwipe);
    if (track.current) observer?.observe(track.current);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [syncSwipe]);

  useEffect(() => {
    try {
      const value = JSON.parse(sessionStorage.getItem(RECENT_ENTRY_STORAGE_KEY) ?? "null");
      if (!value || typeof value.slug !== "string" || !Number.isFinite(value.at)
        || Date.now() - value.at > 30_000) {
        sessionStorage.removeItem(RECENT_ENTRY_STORAGE_KEY);
        return;
      }
      const match = items.find(item => item.slug === value.slug && (!value.entryId || item.entryId === value.entryId));
      if (!match) return;
      sessionStorage.removeItem(RECENT_ENTRY_STORAGE_KEY);
      const frame = requestAnimationFrame(() => {
        const card = Array.from(track.current?.querySelectorAll<HTMLElement>("[data-activity-slug]") ?? [])
          .find(element => element.dataset.activitySlug === match.slug);
        card?.scrollIntoView?.({ block: "nearest", inline: "center", behavior: "smooth" });
        setRecentEntry({ slug: match.slug, entryId: match.entryId ?? null });
      });
      const timer = window.setTimeout(() => setRecentEntry(null), 15_000);
      return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
    } catch { /* Recent-entry emphasis is transient presentation only. */ }
  }, [items]);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current.moved = false;
    if (event.target instanceof Element && event.target.closest("[data-activity-click]")) return;
    const element = track.current;
    if (!element) return;
    drag.current = { active: true, moved: false, pointerId: event.pointerId, startScrollLeft: element.scrollLeft, startX: event.clientX };
  }

  function continueDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const element = track.current;
    const gesture = drag.current;
    if (!element || !gesture.active || gesture.pointerId !== event.pointerId) return;
    const distance = event.clientX - gesture.startX;
    if (Math.abs(distance) > 4 && !gesture.moved) {
      gesture.moved = true;
      // Disable snapping before the first scrollLeft write, not after React rerenders.
      element.style.scrollSnapType = "none";
      element.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
    if (!gesture.moved) return;
    event.preventDefault();
    element.scrollLeft = gesture.startScrollLeft - distance;
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const element = track.current;
    const gesture = drag.current;
    if (!gesture.active || gesture.pointerId !== event.pointerId) return;
    gesture.active = false;
    if (element?.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (element) element.style.scrollSnapType = "";
    const distance = event.clientX - gesture.startX;
    if (element && event.type === "pointerup" && gesture.moved && Math.abs(distance) > 48) {
      const card = element.firstElementChild as HTMLElement | null;
      const step = card ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(element).columnGap) || 0) : 0;
      if (step > 0) {
        const columns = Math.max(1, Math.round(Math.abs(distance) / step));
        const target = (Math.round(gesture.startScrollLeft / step) - Math.sign(distance) * columns) * step;
        element.scrollTo({ left: target, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      }
    }
    setDragging(false);
    syncSwipe();
  }

  function preventDraggedLink(event: ReactMouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  function onlyOpenFromAction(event: ReactMouseEvent<HTMLAnchorElement>) {
    // The rest of the white ticket is a drag surface, not a navigation target.
    // Keyboard and assistive-technology activation still open the focused link.
    if (event.detail === 0 || (event.target instanceof Element && event.target.closest("[data-activity-click]"))) return;
    event.preventDefault();
  }

  return <div className={styles.galleryShell}>
    <div
      id={galleryId}
      ref={track}
      data-activity-gallery
      data-dragging={dragging}
      className={styles.gallery}
      onClickCapture={preventDraggedLink}
      onDragStart={event => event.preventDefault()}
      onPointerCancel={endDrag}
      onPointerDown={beginDrag}
      onPointerMove={continueDrag}
      onPointerUp={endDrag}
      onScroll={syncSwipe}
      role="region"
      aria-label="Your products"
      data-desktop-rows={Math.min(3, Math.ceil(groups.length / 2))}
      data-stacked-rows={Math.min(2, groups.length)}
      data-multiple={groups.length > 1 ? "true" : undefined}
      data-overflowing={groups.length > 6 ? "true" : undefined}
      data-stacked-overflowing={groups.length > 2 ? "true" : undefined}
    >
      {groups.map((group, index) => {
        const selectedId = (group.entries.some(entry => entry.entryId === viewedEntryId) ? viewedEntryId : undefined)
          ?? (group.entries.some(entry => entry.entryId === recentEntry?.entryId) ? recentEntry?.entryId : undefined);
        const selectedIndex = Math.max(0, group.entries.findIndex(entry => entry.entryId === selectedId));
        const item = group.entries[selectedIndex];
        const multipleEntries = group.entries.length > 1;
        const enteredCents = item.status === "active"
          ? group.entries.reduce((total, entry) => total + entry.paidCents, 0)
          : item.paidCents;
        const featured = item.status === "prize" && index === 0;
        const offerMetrics = item.status === "active" ? metricsBySlug[item.slug] : undefined;
        const isRecent = recentEntry?.slug === item.slug && (!recentEntry.entryId || recentEntry.entryId === item.entryId);
        const offerStatus = offerMetrics ? availabilityStatus(offerMetrics.capacity, offerMetrics.sold) : undefined;
        const desktopColumn = Math.floor(index / 6) * 2 + (index % 2) + 1;
        const desktopRow = Math.floor((index % 6) / 2) + 1;
        const stackedColumn = Math.floor(index / 2) + 1;
        const stackedRow = index % 2 + 1;
        const placement = {
          "--desktop-column": desktopColumn,
          "--desktop-row": desktopRow,
          "--stacked-column": stackedColumn,
          "--stacked-row": stackedRow,
        } as CSSProperties;
        return <div key={group.key} className={styles.galleryItem} style={placement}>
          <Link href={activityHref(item, "/account/entries", filter)} aria-label={item.status === "active" ? `See My ${group.entries.length} ${group.entries.length === 1 ? "Entry" : "Entries"} for ${item.title}` : undefined} draggable={false} onClickCapture={onlyOpenFromAction} data-activity-slug={item.slug} data-activity-entry-id={item.entryId ?? undefined} data-activity-entry-ids={group.entries.map(entry => entry.entryId).filter(Boolean).join(" ")} data-status={item.status} data-featured={featured ? "true" : undefined} data-has-progress={offerMetrics !== undefined ? "true" : undefined} data-entry-group={multipleEntries ? "true" : undefined} className={styles.productCard}>
            <div className={styles.cardInner}>
              <p className={styles.retailer}>{item.retailer}</p>
              <h2 className={styles.productTitle}>{item.title}</h2>
              <span className={styles.status}><AccountIcon name={item.completionOptionStatus === "declined" ? "completion" : item.status} />{item.completionOptionStatus === "declined" ? "Declined" : offerStatus?.remaining === 0 ? "Awaiting result" : labels[item.status]}</span>
              <div className={styles.productStage} data-activity-click>
                <Image src={item.image} alt="" fill draggable={false} sizes="(max-width: 639px) 44vw, (max-width: 1099px) 40vw, 310px" className={styles.productImage} />
                {viewedEntry === item.entryId || isRecent ? <span className={styles.newEntryLabel} aria-label={viewedEntry === item.entryId ? "This is the entry you were viewing" : "Your new entry"}><span className={styles.newEntryLong}>{viewedEntry === item.entryId ? "This is the entry you were viewing" : "Your new entry"}</span><span className={styles.newEntryShort}>{viewedEntry === item.entryId ? "Viewing" : "New"}</span></span> : null}
              </div>
              <div className={styles.cardFoot}>
                <div className={styles.noteStack}><p className={styles.productNote}>{item.status === "completion"
                  ? `${formatUsdFromCents(item.remainingCents)} remaining · ${formatUsdFromCents(item.paidCents)} applied`
                  : item.status === "active" ? <><span><strong>{formatUsdFromCents(enteredCents)}</strong> entered</span><span>{offerStatus ? (offerStatus.remaining === 0 ? "Pool full" : <><strong>{offerStatus.remaining.toLocaleString("en-US")}</strong> tickets left<span className={styles.forPrize}> for prize</span></>) : "Still in play"}</span></>
                  : item.status === "prize" ? (item.rewardKind === "digital" ? "Your digital reward is ready." : "Your prize is ready to claim.") : item.completionOptionStatus === "declined" ? "Revive before the original deadline." : "Your completed activity."}</p></div>
                <span className={styles.cardAction} data-activity-click>{item.status === "active"
                  ? <><span>See My</span><span className={styles.entryActionTicket} aria-hidden="true">{group.entries.length}</span><span className={styles.srOnly}>{group.entries.length}</span><span>{group.entries.length === 1 ? "Entry" : "Entries"}</span></>
                  : <>{action(item)}<AccountIcon name="arrow" /></>}</span>
              </div>
            </div>
            {item.status !== "active" ? <span className={styles.cardChevron} data-activity-click aria-hidden="true" /> : null}
            {offerMetrics ? <span className={styles.offerProgress} role="progressbar" aria-label={`${item.title} offer filled`} aria-valuenow={offerMetrics.percentFilled} aria-valuemin={0} aria-valuemax={100} style={{ "--offer-progress": `${offerMetrics.percentFilled}%`, "--offer-progress-color": offerStatus?.color } as CSSProperties}><span>{offerMetrics.percentFilled}%</span></span> : null}
          </Link>
          {featured && groups.length > 1 ? <p className={styles.mobileRestLabel}>Everything else</p> : null}
        </div>;
      })}
    </div>
    {(groups.length > 1 || canClearDemoEntries) && <div className={styles.galleryControls}>
      <p className={styles.galleryHint}>{view.previous || view.next ? "Swipe or use the arrows to explore." : "Every choice. Your next step, all in one place."}</p>
      <div className={styles.galleryActions}>
      {canClearDemoEntries ? <ClearAllEntriesButton /> : null}
      {groups.length > 1 ? <div className={styles.carouselButtons}>
        <button type="button" onClick={() => move(-1)} disabled={!view.previous} aria-controls={galleryId} aria-label="Previous product" className={styles.arrowButton}><AccountIcon name="chevron" className={styles.previousIcon} /></button>
        <span className={styles.position} aria-live="polite" aria-atomic="true">{view.start === view.end ? view.start + 1 : `${view.start + 1}–${view.end + 1}`} / {groups.length}</span>
        <button type="button" onClick={() => move(1)} disabled={!view.next} aria-controls={galleryId} aria-label="Next product" className={styles.arrowButton}><AccountIcon name="chevron" /></button>
      </div> : null}
      </div>
    </div>}
  </div>;
}
