"use client";

import Image from "next/image";
import Link from "next/link";
import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { activityHref, type ActivityFilter, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon } from "./AccountIcon";
import styles from "./showroom.module.css";

const labels = { active: "Still open", prize: "You won", completion: "Purchase option", completed: "Completed" };
function action(item: ActivityItem) {
  if (item.status === "prize") return item.rewardKind === "digital" ? "Open reward" : "Claim prize";
  return { active: "Track entry", completion: "Review option", completed: "View details" }[item.status];
}

export function MyZeroLossGallery({ items, filter }: { items: ActivityItem[]; filter: ActivityFilter }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, pointerId: -1, startScrollLeft: 0, startX: 0 });
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState({ start: 0, end: items.length - 1, previous: false, next: false });
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
    setView({ start: visible[0]?.index ?? 0, end: visible.at(-1)?.index ?? items.length - 1, previous: element.scrollLeft > 2, next: element.scrollWidth - element.clientWidth - element.scrollLeft > 2 });
  }, [items.length]);

  useEffect(() => {
    const frame = requestAnimationFrame(syncSwipe);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncSwipe);
    if (track.current) observer?.observe(track.current);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [syncSwipe]);

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (window.matchMedia?.("(max-width: 940px)").matches) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
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
      element.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
    if (!gesture.moved) return;
    event.preventDefault();
    element.scrollLeft = gesture.startScrollLeft - distance;
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const element = track.current;
    if (!drag.current.active || drag.current.pointerId !== event.pointerId) return;
    drag.current.active = false;
    if (element?.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    setDragging(false);
    syncSwipe();
  }

  function preventDraggedLink(event: ReactMouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
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
    >
      {items.map((item, index) => {
        const featured = item.status === "prize" && index === 0;
        return <div key={item.slug} className={styles.galleryItem}>
          <Link href={activityHref(item, "/account/entries", filter)} data-activity-slug={item.slug} data-status={item.status} data-featured={featured ? "true" : undefined} className={styles.productCard}>
            <div className={styles.cardInner}>
              <p className={styles.retailer}>{item.retailer}</p>
              <h2 className={styles.productTitle}>{item.title}</h2>
              <span className={styles.status}><AccountIcon name={item.status} />{labels[item.status]}</span>
              <div className={styles.productStage}>
                <Image src={item.image} alt="" fill draggable={false} sizes="(max-width: 639px) 44vw, (max-width: 1099px) 40vw, 310px" className={styles.productImage} />
              </div>
              <div className={styles.cardFoot}>
                <p className={styles.productNote}>{item.status === "completion"
                  ? `${formatUsdFromCents(item.remainingCents)} remaining · ${formatUsdFromCents(item.paidCents)} applied`
                  : item.status === "active" ? `${formatUsdFromCents(item.paidCents)} entered · Still in play`
                  : item.status === "prize" ? (item.rewardKind === "digital" ? "Your digital reward is ready." : "Your prize is ready to claim.") : "Your completed activity."}</p>
                <span className={styles.cardAction}>{action(item)}<AccountIcon name="arrow" /></span>
              </div>
            </div>
          </Link>
          {featured && items.length > 1 ? <p className={styles.mobileRestLabel}>Everything else</p> : null}
        </div>;
      })}
    </div>
    {items.length > 1 && <div className={styles.galleryControls}>
      <p className={styles.galleryHint}>{view.previous || view.next ? "Swipe or use the arrows to explore." : "Every choice. Your next step, all in one place."}</p>
      <div className={styles.carouselButtons}>
        <button type="button" onClick={() => move(-1)} disabled={!view.previous} aria-controls={galleryId} aria-label="Previous product" className={styles.arrowButton}><AccountIcon name="chevron" className={styles.previousIcon} /></button>
        <span className={styles.position} aria-live="polite" aria-atomic="true">{view.start === view.end ? view.start + 1 : `${view.start + 1}–${view.end + 1}`} / {items.length}</span>
        <button type="button" onClick={() => move(1)} disabled={!view.next} aria-controls={galleryId} aria-label="Next product" className={styles.arrowButton}><AccountIcon name="chevron" /></button>
      </div>
    </div>}
  </div>;
}
