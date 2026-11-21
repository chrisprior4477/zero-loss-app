"use client";

import Image from "next/image";
import Link from "next/link";
import { validNotice, type NotificationFilter } from "@/lib/account/notification-return";
import { createPortal } from "react-dom";
import { type CSSProperties, type PointerEvent, useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FulfillmentRecord, FulfillmentFilter } from "@/lib/account/fulfillment";
import { walletRewardHref } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon } from "./AccountIcon";
import styles from "./order-ticket-gallery.module.css";
import { useAccountLocale, useAccountTimeZone } from "./TimeZoneProvider";
import { containDialogTab, restoreDialogTrigger } from "./dialog-keyboard";
import { useDialogBack } from "./useDialogBack";
import { RepeatPurchaseStamp } from "./RepeatPurchaseStamp";
import type { PurchaseStamp } from "@/lib/account/repeat-purchase";

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
  if (order.rewardStatus === "redeemed" && order.status === "fulfilled") return { label: "Already used", tone: "complete", action: "View used card", message: "This gift card has already been used. Its saved record remains available for reference." };
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

function displayDate(value: string, timeZone: string, locale: string) {
  return Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(value)) : "Unavailable";
}

function orderDateLabel(order: FulfillmentRecord) {
  return order.orderNumber ? "Checkout date" : order.entryId && order.source === "winner" ? "Entry date" : "Recorded date";
}

function supportDate(value: string, timeZone: string, locale: string) {
  if (!Number.isFinite(Date.parse(value))) return "Unavailable";
  return new Intl.DateTimeFormat(locale, { timeZone, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

/** Support gets the full saved references, never the redeemable gift-card code. */
export function orderSupportSummary(order: FulfillmentRecord, timeZone = "America/New_York", locale = "en-US") {
  return [
    "Zero Loss — order and reward details", order.title, `Retailer: ${order.retailer}`,
    `Source: ${order.source === "winner" ? "You won" : order.source === "purchase" ? "Purchased" : "Reward"}`,
    `Status: ${orderPresentation(order).label}`, `Gift-card value: ${formatUsdFromCents(order.faceValueCents)}`,
    order.source !== "winner" ? `Paid at checkout: ${order.amountPaidCents === null ? "Unavailable" : formatUsdFromCents(order.amountPaidCents)}` : null,
    order.orderNumber ? `Order number: ${order.orderNumber}` : null,
    `Reward reference: ${order.rewardId}`, order.entryId ? `Entry reference: ${order.entryId}` : null,
    `${orderDateLabel(order)}: ${supportDate(order.createdAt, timeZone, locale)}`,
    Number.isFinite(Date.parse(order.createdAt)) ? `Recorded timestamp: ${order.createdAt}` : null,
    order.claimedAt ? `Claimed on: ${supportDate(order.claimedAt, timeZone, locale)}` : null,
    order.rewardStatus === "redeemed" && order.status !== "fulfilled" ? "Gift card: Used" : null, orderPresentation(order).message,
  ].filter(Boolean).join("\n");
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
}

function OrderDetails({ order, anchor, onClose, filter, phone, alertContext }: { alertContext: string; filter: FulfillmentFilter; order: FulfillmentRecord; anchor: HTMLButtonElement; onClose: () => void; phone: boolean }) {
  const closeDetails = onClose;
  const dismissDetails = useEffectEvent(onClose);
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [copyStatus, setCopyStatus] = useState("");
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const latestCopy = useRef(0);
  const detail = orderPresentation(order);

  useLayoutEffect(() => {
    if (phone) return;
    const element = panel.current;
    const layer = element?.parentElement;
    const card = anchor.closest<HTMLElement>("article");
    const gallery = card?.closest<HTMLElement>(`.${styles.galleryBody}`);
    function position() {
      if (!element || !layer || !gallery || !card) return;
      const cardBox = card.getBoundingClientRect(), galleryBox = gallery.getBoundingClientRect();
      layer.style.setProperty("--gallery-top", `${galleryBox.top}px`);
      layer.style.setProperty("--gallery-left", `${galleryBox.left}px`);
      layer.style.setProperty("--gallery-width", `${galleryBox.width}px`);
      layer.style.setProperty("--gallery-height", `${galleryBox.height}px`);
      const left = Math.max(0, Math.min(cardBox.left - galleryBox.left, gallery.clientWidth - element.offsetWidth));
      const preferredTop = cardBox.bottom - element.offsetHeight;
      const headerBottom = document.querySelector("header.sticky")?.getBoundingClientRect().bottom ?? 0;
      const visibleTop = Math.max(0, headerBottom) + 8;
      const visibleBottom = Math.max(visibleTop, window.innerHeight - 8 - element.offsetHeight);
      const top = Math.max(visibleTop, Math.min(preferredTop, visibleBottom)) - galleryBox.top;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    }
    position();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (element) observer?.observe(element);
    if (gallery) observer?.observe(gallery);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, { passive: true });
    return () => { observer?.disconnect(); window.removeEventListener("resize", position); window.removeEventListener("scroll", position); };
  }, [anchor, phone]);

  useLayoutEffect(() => {
    close.current?.focus({ preventScroll: true });
    return () => { if (anchor.isConnected) anchor.focus({ preventScroll: true }); };
  }, [anchor]);

  useLayoutEffect(() => {
    if (!phone) return;
    const root = document.documentElement;
    const { overflow, scrollbarGutter } = root.style;
    if (root.clientWidth < window.innerWidth && root.clientWidth > 0) root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = overflow;
      root.style.scrollbarGutter = scrollbarGutter;
    };
  }, [phone]);

  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      dismissDetails();
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, []);

  async function copy(value: string) {
    const attempt = ++latestCopy.current;
    try {
      await navigator.clipboard.writeText(value);
      if (attempt !== latestCopy.current) return;
      setManualCopy(null);
      setCopyStatus("Copied. Ready to paste into Support.");
    } catch {
      if (attempt !== latestCopy.current) return;
      setManualCopy(value);
      setCopyStatus("Copy the selected text below.");
    }
  }

  const timeZone = useAccountTimeZone();
  const locale = useAccountLocale();
  const references = [
    { label: order.orderNumber ? "Order number" : "Reward reference", value: order.orderNumber ?? order.rewardId },
    ...(order.entryId ? [{ label: "Entry reference", value: order.entryId }] : []),
  ];
  return createPortal(<div className={phone ? styles.mobileDetailsLayer : styles.detailsLayer} onClick={event => { if (event.target === event.currentTarget) closeDetails(); }}>
    <section ref={panel} className={styles.detailsPanel} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={containDialogTab}>
      <div className={styles.detailsHeading}><h2 id={titleId}>{order.source === "winner" ? "Reward details" : "Order details"}</h2><button ref={close} className={styles.close} type="button" onClick={closeDetails} aria-label="Close details">×</button></div>
      <p className={styles.detailsProduct}>{order.title} · {order.retailer}</p>
      {detail.tone !== "reward" ? <p className={styles.detailsNotice}>{detail.message}{order.rewardStatus === "redeemed" && order.status !== "fulfilled" ? " The gift card was already used." : ""}</p> : null}
      <dl className={styles.references}>
        {references.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value.length > 8 ? <><span aria-hidden="true" title={value}>Ending {value.slice(-8).toUpperCase()}</span><span className="sr-only">{value}</span></> : <span>{value}</span>}<button type="button" onClick={() => copy(value)} aria-label={`Copy ${label.toLowerCase()}`}><CopyIcon /></button></dd></div>)}
        <div><dt>{orderDateLabel(order)}</dt><dd>{Number.isFinite(Date.parse(order.createdAt)) ? <time dateTime={order.createdAt}>{displayDate(order.createdAt, timeZone, locale)}</time> : "Unavailable"}</dd></div>
      </dl>
      <dl className={styles.detailsAmounts}>
        <div><dt>Gift-card value</dt><dd>{formatUsdFromCents(order.faceValueCents)}</dd></div>
        {order.source !== "winner" ? <div><dt>Paid at checkout</dt><dd>{order.amountPaidCents === null ? "Unavailable" : formatUsdFromCents(order.amountPaidCents)}</dd></div> : null}
      </dl>
      <Link className={styles.reportSupport} href={order.orderNumber ? `/account/orders?order=${encodeURIComponent(order.orderNumber)}&support=report&details=1${alertContext}${filter === "all" ? "" : `&filter=${filter}`}` : `/support?rewardId=${encodeURIComponent(order.rewardId)}&from=order&details=1${alertContext.replace(/^&from=notifications/, "")}${filter === "all" ? "" : `&orderFilter=${filter}`}#report-problem`}>Report a problem to Support<AccountIcon name="arrow" /></Link>
      <button className={styles.copySupport} type="button" onClick={() => copy(orderSupportSummary(order, timeZone, locale))}><CopyIcon />Copy for Support</button>
      <p role="status" className={styles.copyStatus}>{copyStatus}</p>
      {manualCopy !== null ? <textarea className={styles.manualCopy} aria-label="Details to copy" value={manualCopy} readOnly ref={element => {
        if (!element) return;
        element.focus({ preventScroll: true });
        element.select();
        element.scrollIntoView?.({ block: "nearest" });
      }} /> : null}
    </section>
  </div>, document.body);
}

export function OrderTicketGallery({ orders, purchaseStamps, filter = "all", fromNotification = false, alerts, notice, exactSelection = false, initialDetailsId, initialAnchorId }: { orders: FulfillmentRecord[]; purchaseStamps?: Record<string, PurchaseStamp>; filter?: FulfillmentFilter; fromNotification?: boolean; alerts?: NotificationFilter; notice?: string; exactSelection?: boolean; initialDetailsId?: string; initialAnchorId?: string }) {
  const phone = useSyncExternalStore(subscribePhone, isPhone, serverPhone);
  const [pageAnchor, setPageAnchor] = useState<string | null>(initialDetailsId ?? initialAnchorId ?? null);
  const [opened, setOpened] = useState<{ id: string; anchor: HTMLButtonElement } | null>(null);
  const [view, setView] = useState<TicketView | null>(null);
  const size = phone ? 2 : 6;
  const lastPage = Math.max(0, Math.ceil(orders.length / size) - 1);
  // Keep the same record in view when the number of cards per page changes.
  const seenRewards = new Set<string>();
  const ticketIds = orders.map(order => {
    const id = seenRewards.has(order.rewardId) && order.orderNumber ? `${order.rewardId}-${order.orderNumber}` : order.rewardId;
    seenRewards.add(order.rewardId);
    return id;
  });
  const anchorIndex = ticketIds.indexOf(opened?.id ?? pageAnchor ?? "");
  const currentPage = Math.floor(Math.max(0, anchorIndex) / size);
  const start = currentPage * size;
  const end = Math.min(start + size, orders.length);
  const range = start + 1 === end ? String(end) : `${start + 1}–${end}`;
  const columns = phone ? 1 : 2;
  const currentView = view?.size === size ? view : null;
  const previousPage = currentView?.previous ?? currentPage - 1;
  const nextPage = currentView?.next ?? currentPage + 1;
  const alertContext = fromNotification ? `${alerts ? `&alerts=${alerts}` : ""}${validNotice(notice) ? `&notice=${encodeURIComponent(notice)}` : ""}` : "";
  const hasPrevious = previousPage >= 0;
  const hasNext = nextPage <= lastPage;
  const selected = opened && anchorIndex >= 0 ? orders[anchorIndex] : null;
  const galleryId = useId();
  const gallery = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<TicketDrag | null>(null);
  const suppressTicketClick = useRef(false);
  const detailsOrigin = useRef<HTMLButtonElement | null>(null);
  const pagingFocus = useRef<string | null>(null);
  const railPosition = useRef<{ step: number; fraction: number } | null>(null);
  const canPage = !selected && lastPage > 0;
  const endDetailsHistory = useDialogBack(Boolean(selected), closeDetails);

  function rememberPage(anchor: string | null, openId: string | null = opened?.id ?? null, position?: number) {
    if (window.location.pathname !== "/account/orders") return;
    const step = rail.current && pageOffset(rail.current, 1);
    // Keep Next's router fields intact. This belongs to this history entry only.
    window.history.replaceState({ ...window.history.state, zeroLossOrderTickets: {
      href: window.location.href, anchor, openId, scrollY: window.scrollY,
      size, position: position ?? (rail.current && step ? rail.current.scrollLeft / step : undefined),
    } }, "");
  }
  const rememberOpenedOrder = useEffectEvent(() => {
    if (opened) rememberPage(opened.id, opened.id);
  });
  useLayoutEffect(() => { rememberOpenedOrder(); }, [opened]);

  useLayoutEffect(() => {
    let frame = 0;
    function restorePage(event?: Event) {
      if (event?.type === "popstate" && detailsOrigin.current?.isConnected && window.location.pathname === "/account/orders") return;
      const saved = window.history.state?.zeroLossOrderTickets;
      const hasSaved = saved?.href === window.location.href && ticketIds.includes(saved.anchor)
        && Number.isFinite(saved.scrollY) && saved.scrollY >= 0;
      const anchorId = hasSaved ? saved.anchor : initialDetailsId ?? initialAnchorId;
      if (!anchorId || !ticketIds.includes(anchorId)) return;
      const href = window.location.href;
      setPageAnchor(anchorId);
      setOpened(null);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.location.href !== href) return;
        if (rail.current) {
          const index = ticketIds.indexOf(anchorId);
          const pageSize = isPhone() ? 2 : 6;
          const step = pageOffset(rail.current, 1);
          const anchorPage = Math.floor(index / pageSize);
          const position = hasSaved && saved.size === pageSize && Number.isFinite(saved.position) && step > 0
            ? Math.min(Math.max(0, saved.position), Math.ceil(orders.length / pageSize) - 1) : null;
          rail.current.scrollLeft = position !== null && Math.abs(anchorPage - position) < 1
            ? position * step : pageOffset(rail.current, anchorPage);
        }
        if (hasSaved) window.scrollTo({ top: saved.scrollY, behavior: "instant" });
        // The page containing this ticket has now rendered. Recover only a
        // details button for a record still present in the authorized list.
        const ticket = Array.from(gallery.current?.querySelectorAll<HTMLElement>("[data-order-ticket]") ?? [])
          .find(element => element.id === `reward-${anchorId}`);
        if (hasSaved ? saved.openId !== anchorId : !initialDetailsId) {
          if (initialAnchorId === anchorId) {
            const action = ticket?.querySelector<HTMLAnchorElement>("[data-order-reward-action]");
            action?.focus({ preventScroll: true });
            action?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
          }
          return;
        }
        const anchor = ticket?.querySelector<HTMLButtonElement>("[data-order-details]");
        if (anchor) {
          if (!hasSaved) rememberPage(anchorId, null);
          detailsOrigin.current = anchor;
          setOpened({ id: anchorId, anchor });
        }
      });
    }
    restorePage();
    window.addEventListener("popstate", restorePage);
    window.addEventListener("pageshow", restorePage);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("popstate", restorePage); window.removeEventListener("pageshow", restorePage); };
  // The saved position is read from the current history entry each visit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAnchorId, initialDetailsId, orders]);

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

  function changePage(page: number, byKeyboard = false) {
    const anchor = ticketIds[page * size];
    const track = rail.current;
    if (!anchor || !track) return;
    setPageAnchor(anchor);
    rememberPage(anchor, null, page);
    const left = pageOffset(track, page);
    if (byKeyboard) {
      pagingFocus.current = anchor;
      track.scrollLeft = left;
      syncView(track);
      return;
    }
    if (track.scrollTo && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) track.scrollTo({ left, behavior: "smooth" });
    else track.scrollLeft = left;
  }

  useLayoutEffect(() => {
    if (!pagingFocus.current) return;
    const card = document.getElementById("reward-" + pagingFocus.current);
    const firstAction = card?.querySelector<HTMLButtonElement>("[data-order-details]");
    if (!firstAction || card?.inert) return;
    pagingFocus.current = null;
    firstAction.focus({ preventScroll: true });
    firstAction.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [currentPage, view]);

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
    const anchor = ticketIds[index];
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
    detailsOrigin.current = anchor;
    setPageAnchor(id);
    setOpened({ id, anchor });
    rememberPage(id, null);
  }

  function closeDetails() {
    const anchor = opened?.anchor;
    endDetailsHistory();
    setOpened(null);
    if (anchor) requestAnimationFrame(() => {
      if (detailsOrigin.current !== anchor) return;
      detailsOrigin.current = null;
      restoreDialogTrigger(anchor.isConnected ? anchor : Array.from(gallery.current?.querySelectorAll<HTMLElement>("[data-order-details]") ?? [])[0], true);
    });
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
          const stamp = order.orderNumber ? purchaseStamps?.[order.rewardId] : undefined;
          const purchaseStamp = stamp && stamp.orderNumber === order.orderNumber ? stamp : undefined;
          const href = walletRewardHref({ slug: order.rewardSlug, rewardId: order.rewardId }) + `&via=${fromNotification ? "order-notification" : exactSelection ? "order-selection" : "orders"}${alertContext}`
            + (filter === "all" ? "" : `&orderFilter=${filter}`);
          const position = index % size;
          const page = Math.floor(index / size);
          const column = page * columns + position % columns;
          const visible = currentView ? column >= currentView.first && column <= currentView.last : page === currentPage;
          const ticketId = ticketIds[orders.indexOf(order)];
          return <article key={ticketId} id={`reward-${ticketId}`} className={styles.card} data-order-ticket data-tone={detail.tone}
            inert={!visible} aria-hidden={!visible || undefined}
            style={{ gridColumn: column + 1, gridRow: Math.floor(position / columns) + 1 }}>
            <Link href={href} className={styles.art} tabIndex={-1} aria-label={`View ${order.title} reward ending ${order.rewardId.slice(-8).toUpperCase()}`}><Image src={order.image} alt="" fill sizes="(max-width: 700px) 64px, 200px" /></Link>
            <div className={styles.copy}><p className={styles.retailer}>{order.retailer}</p><h3><Link href={href} tabIndex={-1} title={order.title}>{order.title}</Link></h3><div className={styles.statuses}><span className={styles.source} data-source={order.source}><AccountIcon name={order.source === "winner" ? "prize" : "orders"} />{order.source === "winner" ? "You won" : order.source === "purchase" ? "Purchased" : "Reward"}</span><span className={styles.status}>{detail.label}</span></div></div>
            <dl className={styles.money} data-repeat-purchase={Boolean(purchaseStamp)}>
              <div><dt>Gift-card value</dt><dd>{formatUsdFromCents(order.faceValueCents)}</dd></div>
              {order.source !== "winner" ? <div><dt>Paid at checkout</dt><dd>{order.amountPaidCents === null ? "Unavailable" : formatUsdFromCents(order.amountPaidCents)}</dd></div> : null}
              {purchaseStamp ? <div className={styles.purchaseStamp}><dt className="sr-only">Purchase reference</dt><dd><RepeatPurchaseStamp {...purchaseStamp} /></dd></div> : null}
            </dl>
            <span className="sr-only" id={`order-reference-${ticketId}`}>{order.title}, reference ending {order.rewardId.slice(-8).toUpperCase()}</span>
            <div className={styles.actions}><button type="button" data-order-details className={styles.detailsButton} aria-haspopup="dialog" aria-expanded={opened?.id === ticketId} onClick={event => openDetails(ticketId, event.currentTarget)}>{order.source === "winner" ? "Reward details" : "Order details"}</button><Link href={href} data-order-reward-action aria-describedby={`order-reference-${ticketId}`} className={styles.open}>{detail.action}<AccountIcon name="arrow" /></Link></div>
          </article>;
        })}
      </div>
      {hasPrevious ? <button type="button" className={styles.peekButton} data-direction="previous" aria-label="Show previous order tickets" aria-controls={galleryId} disabled={Boolean(selected)} onClick={() => changePage(previousPage)} /> : null}
      {hasNext ? <button type="button" className={styles.peekButton} data-direction="next" aria-label="Show next order tickets" aria-controls={galleryId} disabled={Boolean(selected)} onClick={() => changePage(nextPage)} /> : null}
      </div>
      {selected && opened ? <OrderDetails alertContext={fromNotification ? `&from=notifications${alertContext}` : ""} key={opened.id} order={selected} filter={filter} phone={phone} anchor={opened.anchor} onClose={closeDetails} /> : null}
    </div>
    <nav className={styles.paging} aria-label="Order tickets"><span role="status">{range} of {orders.length}</span><div><button type="button" aria-label="Previous tickets" aria-controls={galleryId} disabled={Boolean(selected)} aria-disabled={!hasPrevious || undefined} onClick={event => { if (hasPrevious) changePage(previousPage, event.detail === 0); }}><AccountIcon name="chevron" /></button><button type="button" aria-label="Next tickets" aria-controls={galleryId} disabled={Boolean(selected)} aria-disabled={!hasNext || undefined} onClick={event => { if (hasNext) changePage(nextPage, event.detail === 0); }}><AccountIcon name="chevron" /></button></div></nav>
  </div>;
}
