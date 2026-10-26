"use client";
import { orderSupportHref } from "@/lib/support/order-context";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { FulfillmentRecord } from "@/lib/account/fulfillment";
import { walletRewardHref } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon } from "./AccountIcon";
import styles from "./order-ticket-gallery.module.css";

function subscribePhone(change: () => void) {
  const query = window.matchMedia?.("(max-width: 700px)");
  query?.addEventListener("change", change);
  return () => query?.removeEventListener("change", change);
}
const isPhone = () => window.matchMedia?.("(max-width: 700px)")?.matches ?? false;
const serverPhone = () => false;

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

function displayDate(value: string) {
  return Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "Unavailable";
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
    }
    position();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    if (element) observer?.observe(element);
    if (gallery) observer?.observe(gallery);
    close.current?.focus({ preventScroll: true });
    return () => { observer?.disconnect(); if (anchor.isConnected) anchor.focus({ preventScroll: true }); };
  }, [anchor]);

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopyStatus("Copied. Ready to paste into Support."); }
    catch { setManualCopy(value); setCopyStatus("Copy the selected text below."); }
  }

  const references = [
    { label: order.orderNumber ? "Order number" : "Reward reference", value: order.orderNumber ?? order.rewardId },
    ...(order.entryId ? [{ label: "Entry reference", value: order.entryId }] : []),
  ];
  return <div className={styles.detailsLayer} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panel} className={styles.detailsPanel} role="dialog" aria-modal="false" aria-labelledby={titleId} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}>
      <header className={styles.detailsHeading}><h2 id={titleId}>{order.source === "winner" ? "Reward details" : "Order details"}</h2><button ref={close} className={styles.close} type="button" onClick={onClose} aria-label="Close details">×</button></header>
      <p className={styles.detailsProduct}>{order.title} · {order.retailer}</p>
      {detail.tone !== "reward" ? <p className={styles.detailsNotice}>{detail.message}</p> : null}
      <dl className={styles.references}>
        {references.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd><span title={value}>{value.slice(-8).toUpperCase()}</span><button type="button" onClick={() => copy(value)} aria-label={`Copy ${label.toLowerCase()}`}><CopyIcon /></button></dd></div>)}
        <div><dt>{order.orderNumber ? "Checkout date" : "Entry date"}</dt><dd>{Number.isFinite(Date.parse(order.createdAt)) ? <time dateTime={order.createdAt}>{displayDate(order.createdAt)}</time> : "Unavailable"}</dd></div>
      </dl>
      <Link className={styles.copySupport} href={orderSupportHref(order.rewardId)}>Get help with this order →</Link>
      <button className={styles.copySupport} type="button" onClick={() => copy(orderSupportSummary(order))}><CopyIcon />Copy for Support</button>
      <p role="status" className={styles.copyStatus}>{copyStatus}</p>
      {manualCopy !== null ? <textarea className={styles.manualCopy} aria-label="Details to copy" value={manualCopy} readOnly ref={element => { element?.select(); }} /> : null}
    </section>
  </div>;
}

export function OrderTicketGallery({ orders }: { orders: FulfillmentRecord[] }) {
  const phone = useSyncExternalStore(subscribePhone, isPhone, serverPhone);
  const [page, setPage] = useState(0);
  const [opened, setOpened] = useState<{ id: string; anchor: HTMLButtonElement } | null>(null);
  const size = phone ? 2 : 6;
  const lastPage = Math.max(0, Math.ceil(orders.length / size) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * size;
  const shown = orders.slice(start, start + size);
  const selected = opened ? shown.find(order => order.rewardId === opened.id) : null;
  const galleryId = useId();

  return <div className={styles.gallery} data-order-gallery>
    <div className={styles.galleryBody}>
      <div className={styles.grid} id={galleryId} inert={Boolean(selected)}>
        {shown.map(order => {
          const detail = orderPresentation(order);
          const href = walletRewardHref({ slug: order.rewardSlug, rewardId: order.rewardId });
          return <article key={order.rewardId} id={`reward-${order.rewardId}`} className={styles.card} data-order-ticket data-tone={detail.tone}>
            <Link href={href} className={styles.art} aria-label={`View ${order.title} reward`}><Image src={order.image} alt="" fill sizes="(max-width: 700px) 64px, 200px" /></Link>
            <div className={styles.copy}><p className={styles.retailer}>{order.retailer}</p><h3><Link href={href} title={order.title}>{order.title}</Link></h3><div className={styles.statuses}><span className={styles.source} data-source={order.source}><AccountIcon name={order.source === "winner" ? "prize" : "orders"} />{order.source === "winner" ? "You won" : order.source === "purchase" ? "Purchased" : "Reward"}</span><span className={styles.status}>{detail.label}</span></div></div>
            <dl className={styles.money}><div><dt>Gift-card value</dt><dd>{formatUsdFromCents(order.faceValueCents)}</dd></div>{order.source !== "winner" ? <div><dt>Paid at checkout</dt><dd>{order.amountPaidCents === null ? "Unavailable" : formatUsdFromCents(order.amountPaidCents)}</dd></div> : null}</dl>
            <div className={styles.actions}><button type="button" className={styles.detailsButton} aria-haspopup="dialog" aria-expanded={selected?.rewardId === order.rewardId} onClick={event => setOpened({ id: order.rewardId, anchor: event.currentTarget })}>{order.source === "winner" ? "Reward details" : "Order details"}</button><Link href={href} className={styles.open}>{detail.action}<AccountIcon name="arrow" /></Link></div>
          </article>;
        })}
      </div>
      {selected && opened ? <OrderDetails key={selected.rewardId} order={selected} anchor={opened.anchor} onClose={() => setOpened(null)} /> : null}
    </div>
    <nav className={styles.paging} aria-label="Order tickets"><span role="status">{start + 1}–{Math.min(start + size, orders.length)} of {orders.length}</span><div><button type="button" aria-label="Previous tickets" aria-controls={galleryId} disabled={currentPage === 0 || Boolean(selected)} onClick={() => setPage(currentPage - 1)}><AccountIcon name="chevron" /></button><button type="button" aria-label="Next tickets" aria-controls={galleryId} disabled={currentPage === lastPage || Boolean(selected)} onClick={() => setPage(currentPage + 1)}><AccountIcon name="chevron" /></button></div></nav>
  </div>;
}
