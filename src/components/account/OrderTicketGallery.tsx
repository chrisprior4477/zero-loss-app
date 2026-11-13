"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type PointerEvent, useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FulfillmentRecord } from "@/lib/account/fulfillment";
import { walletRewardHref } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon } from "./AccountIcon";
import styles from "./order-ticket-gallery.module.css";
import { useAccountTimeZone } from "./TimeZoneProvider";
import { containDialogTab } from "./dialog-keyboard";

function subscribePhone(change: () => void) {
  const query = window.matchMedia?.("(max-width: 700px)");
  query?.addEventListener("change", change);
  return () => query?.removeEventListener("change", change);
}
const isPhone = () => window.matchMedia?.("(max-width: 700px)")?.matches ?? false;
const serverPhone = () => false;

type TicketDrag = { pointerId: number; x: number; y: number; left: number; horizontal: boolean };
type TicketView = { size: number; first: number; last: number; previous: number; next: number };

function pageOffset(rail: HTMLDivElement, page: number) {
  const first = rail.querySelector<HTMLElement>('[data-order-page="0"]');
  const target = rail.querySelector<HTMLElement>(`[data-order-page="${page}"]`);
  return first && target ? target.offsetLeft - first.offsetLeft : 0;
}

function orderPresentation(order: FulfillmentRecord) {
  if (order.rewardStatus === "redeemed") return { label: "Already used", tone: "complete", action: "View used card", message: "This gift card has already been used. Its saved record remains available for reference." };
  switch (order.status) {
    case "fulfilled": return order.source === "winner" && !order.claimedAt
      ? { label: "Ready to claim", tone: "reward", action: "View winning reward", message: "Your winning reward is ready. Open it to review and claim it." }
      : { label: "Card issued", tone: "reward", action: "Open gift card", message: "Your retailer gift card is ready to open in your reward wallet." };
    case "exception": return { label: "Action needed", tone: "action", action: "View reward status", message: "The gift-card provider needs attention. Your entitlement remains recorded while support resolves it." };
    case "cancelled": return { label: "Cancelled", tone: "complete", action: "View reward status", message: "This fulfillment record was cancelled and remains in your account history." };
    case "expired": return { label: "Expired", tone: "complete", action: "View reward status", message: "The reward claim period has expired. Open the saved reward for its status and support options." };
    case "corrected": return { label: "Order corrected", tone: "complete", action: "View reward status", message: "A correction is recorded for this order. Contact support if you need more information." };
    default: return { label: order.status === "payment_confirmed" ? "Payment confirmed" : "Issuance pending", tone: "action", action: "View reward status", message: "Your reward is recorded. Gift-card issuance is in progress." };
  }
}

function displayDate(value: string, timeZone: string) {
  return Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(value)) : "Unavailable";
}

/** Support gets the full saved references, never the redeemable gift-card code. */
export function orderSupportSummary(order: FulfillmentRecord) {
  return [
    "Zero Loss — order and reward details", order.title, `Retailer: ${order.retailer}`,
    `Source: ${order.source === "winner" ? "You won" : order.source === "purchase" ? "Purchased" : "Reward"}`,
    `Status: ${orderPresentation(order).label}`, `Gift-card value: ${formatUsdFromCents(order.faceValueCents)}`,
    order.source !== "winner" ? `Paid at checkout: ${order.amountPaidCents === null ? "Unavailable" : formatUsdFromCents(order.amountPaidCents)}` : null,
    order.orderNumber ? `Order number: ${order.orderNumber}` : null,
    `Reward reference: ${order.rewardId}`, order.entryId ? `Entry reference: ${order.entryId}` : null,
    `${order.orderNumber ? "Checkout" : "Entry"} date: ${order.createdAt || "Unavailable"}`,
    order.claimedAt ? `Claimed on: ${order.claimedAt}` : null, orderPresentation(order).message,
  ].filter(Boolean).join("\n");
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
}

function OrderDetails({ order, anchor, onClose }: { order: FulfillmentRecord; anchor: HTMLButtonElement; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [copyStatus, setCopyStatus] = useState("");
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const detail = orderPresentation(order);

  useEffect(() => {
    const element = panel.current;
    const gallery = element?.parentElement;
    const card = anchor.closest<HTMLElement>("article");
    function position() {
      if (!element || !gallery || !card) return;
      const cardBox = card.getBoundingClientRect(), galleryBox = gallery.getBoundingClientRect();
      const left = Math.max(0, Math.min(cardBox.left - galleryBox.left, gallery.clientWidth - element.offsetWidth));
      const top = isPhone() ? 0 : Math.max(0, Math.min(cardBox.bottom - galleryBox.top - element.offsetHeight, gallery.clientHeight - element.offsetHeight));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      // Rotation also changes document height and browser scroll anchoring.
      // Keep the open details below the sticky header in either orientation.
      if (element.offsetHeight) {
        const box = element.getBoundingClientRect();
        const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
        const visibleTop = Math.max(0, headerBottom) + 8;
        if (box.top < visibleTop || box.bottom > window.innerHeight - 8) {
          window.scrollTo({ top: Math.max(0, window.scrollY + box.top - visibleTop), behavior: "instant" });
        }
      }
    }
    position();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (element) observer?.observe(element);
    if (gallery) observer?.observe(gallery);
    window.addEventListener("resize", position);
    close.current?.focus({ preventScroll: true });
    return () => { observer?.disconnect(); window.removeEventListener("resize", position); if (anchor.isConnected) anchor.focus({ preventScroll: true }); };
  }, [anchor]);

  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [onClose]);

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopyStatus("Copied. Ready to paste into Support."); }
    catch { setManualCopy(value); setCopyStatus("Copy the selected text below."); }
  }

  const timeZone = useAccountTimeZone();
  const references = [
    { label: order.orderNumber ? "Order number" : "Reward reference", value: order.orderNumber ?? order.rewardId },
    ...(order.entryId ? [{ label: "Entry reference", value: order.entryId }] : []),
  ];
  return <div className={styles.detailsLayer} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} className={styles.detailsPanel} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={containDialogTab}>
      <header className={styles.detailsHeading}><h2 id={titleId}>{order.source === "winner" ? "Reward details" : "Order details"}</h2><button ref={close} className={styles.close} type="button" onClick={onClose} aria-label="Close details">×</button></header>
      <p className={styles.detailsProduct}>{order.title} · {order.retailer}</p>
      {detail.tone !== "reward" ? <p className={styles.detailsNotice}>{detail.message}</p> : null}
      <dl className={styles.references}>
        {references.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd><span title={value}>{value.slice(-8).toUpperCase()}</span><button type="button" onClick={() => copy(value)} aria-label={`Copy ${label.toLowerCase()}`}><CopyIcon /></button></dd></div>)}
        <div><dt>{order.orderNumber ? "Checkout date" : "Entry date"}</dt><dd>{Number.isFinite(Date.parse(order.createdAt)) ? <time dateTime={order.createdAt}>{displayDate(order.createdAt, timeZone)}</time> : "Unavailable"}</dd></div>
      </dl>
      <Link className={styles.reportSupport} href={order.orderNumber ? `/account/orders?order=${encodeURIComponent(order.orderNumber)}&support=report` : `/support?rewardId=${encodeURIComponent(order.rewardId)}#report-problem`}>Report a problem to Support<AccountIcon name="arrow" /></Link>
      <button className={styles.copySupport} type="button" onClick={() => copy(orderSupportSummary(order))}><CopyIcon />Copy for Support</button>
      <p role="status" className={styles.copyStatus}>{copyStatus}</p>
      {manualCopy !== null ? <textarea className={styles.manualCopy} aria-label="Details to copy" value={manualCopy} readOnly ref={element => { element?.select(); }} /> : null}
    </section>
  </div>;
}

export function OrderTicketGallery({ orders }: { orders: FulfillmentRecord[] }) {
  const phone = useSyncExternalStore(subscribePhone, isPhone, serverPhone);
  const [pageAnchor, setPageAnchor] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ id: string; anchor: HTMLButtonElement } | null>(null);
  const [view, setView] = useState<TicketView | null>(null);
  const size = phone ? 2 : 6;
  const lastPage = Math.max(0, Math.ceil(orders.length / size) - 1);
  // Keep the same record in view when the number of cards per page changes.
  const anchorIndex = orders.findIndex(order => order.rewardId === (opened?.id ?? pageAnchor));
  const currentPage = Math.floor(Math.max(0, anchorIndex) / size);
  const start = currentPage * size;
  const columns = phone ? 1 : 2;
  const currentView = view?.size === size ? view : null;
  const previousPage = currentView?.previous ?? currentPage - 1;
  const nextPage = currentView?.next ?? currentPage + 1;
  const hasPrevious = previousPage >= 0;
  const hasNext = nextPage <= lastPage;
  const selected = opened && anchorIndex >= 0 ? orders[anchorIndex] : null;
  const galleryId = useId();
  const gallery = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<TicketDrag | null>(null);
  const suppressTicketClick = useRef(false);
  const railPosition = useRef<{ step: number; fraction: number } | null>(null);
  const canPage = !selected && lastPage > 0;

  function rememberPage(anchor: string | null, openId: string | null = opened?.id ?? null, position?: number) {
    if (window.location.pathname !== "/account/orders") return;
    const step = rail.current && pageOffset(rail.current, 1);
    // Keep Next's router fields intact. This belongs to this history entry only.
    window.history.replaceState({ ...window.history.state, zeroLossOrderTickets: {
      href: window.location.href, anchor, openId, scrollY: window.scrollY,
      size, position: position ?? (rail.current && step ? rail.current.scrollLeft / step : undefined),
    } }, "");
  }

  useLayoutEffect(() => {
    let frame = 0;
    function restorePage() {
      const saved = window.history.state?.zeroLossOrderTickets;
      if (!saved || saved.href !== window.location.href || !orders.some(order => order.rewardId === saved.anchor)
        || !Number.isFinite(saved.scrollY) || saved.scrollY < 0) return;
      setPageAnchor(saved.anchor);
      setOpened(null);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.location.href !== saved.href) return;
        if (rail.current) {
          const index = orders.findIndex(order => order.rewardId === saved.anchor);
          const pageSize = isPhone() ? 2 : 6;
          const step = pageOffset(rail.current, 1);
          rail.current.scrollLeft = saved.size === pageSize && Number.isFinite(saved.position) && step > 0
            ? Math.min(Math.max(0, saved.position), Math.ceil(orders.length / pageSize) - 1) * step
            : pageOffset(rail.current, Math.floor(index / pageSize));
        }
        window.scrollTo({ top: saved.scrollY, behavior: "instant" });
        // The page containing this ticket has now rendered. Recover only a
        // details button for a record still present in the authorized list.
        if (typeof saved.openId !== "string" || saved.openId !== saved.anchor) return;
        const ticket = Array.from(gallery.current?.querySelectorAll<HTMLElement>("[data-order-ticket]") ?? [])
          .find(element => element.id === `reward-${saved.openId}`);
        const anchor = ticket?.querySelector<HTMLButtonElement>("[data-order-details]");
        if (anchor) setOpened({ id: saved.openId, anchor });
      });
    }
    restorePage();
    window.addEventListener("popstate", restorePage);
    window.addEventListener("pageshow", restorePage);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("popstate", restorePage); window.removeEventListener("pageshow", restorePage); };
  }, [orders]);

  const alignPage = useEffectEvent(() => {
    const track = rail.current;
    if (!track) return;
    drag.current = null;
    delete track.dataset.dragging;
    track.scrollLeft = pageOffset(track, currentPage);
    const step = pageOffset(track, 1);
    railPosition.current = step ? { step, fraction: track.scrollLeft / step } : null;
  });

  useLayoutEffect(() => {
    alignPage();
  }, [size]);

  const resizeRail = useEffectEvent(() => {
    const track = rail.current;
    if (!track) return;
    const step = pageOffset(track, 1);
    const saved = railPosition.current;
    if (saved && step && saved.step !== step) track.scrollLeft = saved.fraction * step;
    syncView(track);
  });

  useEffect(() => {
    const track = rail.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => resizeRail());
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  function changePage(page: number) {
    const anchor = orders[page * size]?.rewardId;
    const track = rail.current;
    if (!anchor || !track) return;
    setPageAnchor(anchor);
    rememberPage(anchor, null, page);
    const left = pageOffset(track, page);
    if (track.scrollTo && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) track.scrollTo({ left, behavior: "smooth" });
    else track.scrollLeft = left;
  }

  function syncView(track: HTMLDivElement) {
    const step = pageOffset(track, 1);
    if (step <= 0 || !track.clientWidth) return;
    const position = track.scrollLeft / step;
    railPosition.current = { step, fraction: position };
    const tolerance = 2 / step;
    // Ignore the narrow ticket peeks at each edge when deciding which controls to expose.
    const first = Math.floor((position + tolerance) * columns);
    const last = Math.ceil((position + 1 - tolerance) * columns) - 1;
    const previous = Math.ceil(position - tolerance) - 1;
    const next = Math.floor(position + tolerance) + 1;
    setView(value => value?.size === size && value.first === first && value.last === last && value.previous === previous && value.next === next
      ? value : { size, first, last, previous, next });
  }

  function rememberScroll(track: HTMLDivElement) {
    const step = pageOffset(track, 1);
    if (step <= 0 || selected || drag.current?.horizontal) return;
    const index = Math.min(lastPage, Math.max(0, Math.round(track.scrollLeft / step))) * size;
    const anchor = orders[index]?.rewardId;
    if (!anchor) return;
    setPageAnchor(anchor);
    rememberPage(anchor, null);
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!canPage || !event.isPrimary || event.button !== 0) return;
    // Touch and trackpad scrolling use the browser's native momentum.
    if (event.pointerType === "touch") return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, horizontal: false };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const distance = event.clientX - gesture.x;
    const vertical = Math.abs(event.clientY - gesture.y);
    if (!gesture.horizontal) {
      if (Math.max(Math.abs(distance), vertical) < 8) return;
      if (vertical >= Math.abs(distance)) { drag.current = null; return; }
      gesture.horizontal = true;
      event.currentTarget.dataset.dragging = "true";
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = gesture.left - distance;
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    drag.current = null;
    if (!gesture.horizontal) return;
    delete event.currentTarget.dataset.dragging;
    suppressTicketClick.current = true;
    rememberScroll(event.currentTarget);
  }

  function openDetails(id: string, anchor: HTMLButtonElement) {
    setPageAnchor(id);
    setOpened({ id, anchor });
    rememberPage(id, id);
  }

  function closeDetails() {
    setOpened(null);
    rememberPage(opened?.id ?? pageAnchor, null);
  }

  return <div ref={gallery} className={styles.gallery} data-order-gallery onPointerDownCapture={() => { suppressTicketClick.current = false; }} onClickCapture={event => {
    if (suppressTicketClick.current && event.detail > 0) {
      suppressTicketClick.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest("a[href]")) return;
    const ticket = target.closest("[data-order-ticket]");
    rememberPage(ticket?.id.replace(/^reward-/, "") ?? opened?.id ?? pageAnchor);
  }}>
    <div className={styles.galleryBody}>
      <div className={styles.ticketWindow}>
      <div ref={rail} id={galleryId} className={styles.rail} data-swipeable={canPage} data-multiple={lastPage > 0}
        style={{ "--ticket-columns": columns, "--ticket-rows": Math.min(size / columns, Math.ceil(orders.length / columns)) } as CSSProperties}
        inert={Boolean(selected)}
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag}
        onLostPointerCapture={event => { if (event.target === event.currentTarget) finishDrag(event); }}
        onPointerLeave={event => { if (!drag.current?.horizontal) finishDrag(event); }}
        onDragStart={event => { if (canPage) event.preventDefault(); }}
        onScroll={event => syncView(event.currentTarget)}
        onScrollEnd={event => rememberScroll(event.currentTarget)}>
        {Array.from({ length: lastPage + 1 }, (_, page) => <span key={page} data-order-page={page} className={styles.pageMarker} aria-hidden="true" style={{ gridColumn: `${page * columns + 1} / span ${columns}` }} />)}
        {orders.map((order, index) => {
          const detail = orderPresentation(order);
          const href = walletRewardHref({ slug: order.rewardSlug, rewardId: order.rewardId });
          const position = index % size;
          const page = Math.floor(index / size);
          const column = page * columns + position % columns;
          const visible = currentView ? column >= currentView.first && column <= currentView.last : page === currentPage;
          return <article key={order.rewardId} id={`reward-${order.rewardId}`} className={styles.card} data-order-ticket data-tone={detail.tone}
            inert={!visible} aria-hidden={!visible || undefined}
            style={{ gridColumn: column + 1, gridRow: Math.floor(position / columns) + 1 }}>
            <Link href={href} className={styles.art} aria-label={`View ${order.title} reward`}><Image src={order.image} alt="" fill sizes="(max-width: 700px) 64px, 200px" /></Link>
            <div className={styles.copy}><p className={styles.retailer}>{order.retailer}</p><h3><Link href={href} title={order.title}>{order.title}</Link></h3><div className={styles.statuses}><span className={styles.source} data-source={order.source}><AccountIcon name={order.source === "winner" ? "prize" : "orders"} />{order.source === "winner" ? "You won" : order.source === "purchase" ? "Purchased" : "Reward"}</span><span className={styles.status}>{detail.label}</span></div></div>
            <dl className={styles.money}><div><dt>Gift-card value</dt><dd>{formatUsdFromCents(order.faceValueCents)}</dd></div>{order.source !== "winner" ? <div><dt>Paid at checkout</dt><dd>{order.amountPaidCents === null ? "Unavailable" : formatUsdFromCents(order.amountPaidCents)}</dd></div> : null}</dl>
            <div className={styles.actions}><button type="button" data-order-details className={styles.detailsButton} aria-haspopup="dialog" aria-expanded={selected?.rewardId === order.rewardId} onClick={event => openDetails(order.rewardId, event.currentTarget)}>{order.source === "winner" ? "Reward details" : "Order details"}</button><Link href={href} className={styles.open}>{detail.action}<AccountIcon name="arrow" /></Link></div>
          </article>;
        })}
      </div>
      {hasPrevious ? <button type="button" className={styles.peekButton} data-direction="previous" aria-label="Show previous order tickets" aria-controls={galleryId} disabled={Boolean(selected)} onClick={() => changePage(previousPage)} /> : null}
      {hasNext ? <button type="button" className={styles.peekButton} data-direction="next" aria-label="Show next order tickets" aria-controls={galleryId} disabled={Boolean(selected)} onClick={() => changePage(nextPage)} /> : null}
      </div>
      {selected && opened ? <OrderDetails key={selected.rewardId} order={selected} anchor={opened.anchor} onClose={closeDetails} /> : null}
    </div>
    <nav className={styles.paging} aria-label="Order tickets"><span role="status">{start + 1}–{Math.min(start + size, orders.length)} of {orders.length}</span><div><button type="button" aria-label="Previous tickets" aria-controls={galleryId} disabled={!hasPrevious || Boolean(selected)} onClick={() => changePage(previousPage)}><AccountIcon name="chevron" /></button><button type="button" aria-label="Next tickets" aria-controls={galleryId} disabled={!hasNext || Boolean(selected)} onClick={() => changePage(nextPage)}><AccountIcon name="chevron" /></button></div></nav>
  </div>;
}
