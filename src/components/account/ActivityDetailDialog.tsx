"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { activityPresentation, type ActivityDestination, type ActivityFilter, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { AccountIcon } from "./AccountIcon";
import styles from "./showroom.module.css";

export function ActivityDetailDialog({ item, destination, filter = "all" }: {
  item: ActivityItem;
  destination: ActivityDestination;
  filter?: ActivityFilter;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const presentation = activityPresentation(item);
  // The return destination is a fixed application route, never user-provided URL text.
  const returnHref = destination === "/account/entries" && filter !== "all" ? `${destination}?filter=${filter}` : destination;
  const close = () => router.replace(returnHref, { scroll: false });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    // Native modal supplies the top layer, background inertness and focus trap.
    dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
      else Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-activity-slug]")).find(link => link.dataset.activitySlug === item.slug)?.focus();
    };
  }, [item.slug]);

  const disabledAction = item.status === "completion" ? "Complete purchase" : item.status === "active" ? "Entry participation" : presentation.action;
  const introduction = item.status === "completion"
    ? "Review the exact-product option created by this outcome. You decide whether to take the next step."
    : item.status === "prize"
      ? "Your winning outcome is ready. Follow its fulfillment path whenever you are ready."
      : item.status === "active"
        ? "Your entry is still in play. Its result will appear here as soon as the outcome is available."
        : "This activity is complete. Its outcome remains here as part of your Zero Loss history.";
  return <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    }}
    className={styles.detailDialog} data-status={item.status}>
    <header className={styles.detailHeader}>
      <div><p className={styles.detailEyebrow}>MY ZERO LOSS</p><p className={styles.detailHeaderLabel}>{item.status === "completion" ? "Purchase option" : item.status === "prize" ? "Winning outcome" : item.status === "active" ? "Entry details" : "Activity history"}</p></div>
      <button ref={closeRef} type="button" onClick={close} aria-label="Close activity details" className={styles.detailClose}>×</button>
    </header>
    <div role="region" aria-label="Product details" tabIndex={0} className={styles.detailBody}>
      <section className={styles.detailHero}>
        <div className={styles.detailStage}><Image src={item.image} alt={item.title} fill draggable={false} sizes="(max-width: 700px) 88vw, 420px" className={styles.detailImage} /></div>
        <div className={styles.detailSummary}>
          <p className={styles.detailRetailer}>{item.retailer}</p>
          <h2 id={titleId} className={styles.detailTitle}>{item.title}</h2>
          <p className={styles.detailStatus}><AccountIcon name={item.status} />{presentation.label}</p>
          <p className={styles.detailIntroduction}>{introduction}</p>
        </div>
      </section>

      {item.status === "completion" ? <>
        <section className={styles.detailPanel}>
          <p className={styles.panelEyebrow}>YOUR NEXT STEP</p>
          <h3>Complete this product’s purchase</h3>
          <dl className={styles.purchaseMath}>
            {[["Product price", formatUsdFromCents(item.priceCents)], ["Already applied", formatUsdFromCents(item.paidCents)], ["Remaining", formatUsdFromCents(item.remainingCents)]].map(([label, value], index) => <div key={label}><dt>{label}</dt><dd data-emphasis={index === 2}>{value}</dd></div>)}
          </dl>
          <p className={styles.detailCopy}>An optional purchase of this exact originating product. No payment is due unless you choose to complete it.</p>
          <p className={styles.detailMeta}><strong>Availability:</strong> {item.availability}</p>
          <p className={styles.detailFinePrint}>Not wallet cash, transferable credit or a retailer-wide alternative.</p>
        </section>
      </> : item.status === "prize" ? <>
        <section className={styles.detailPanel}>
          <p className={styles.panelEyebrow}>REWARD READY</p>
          <div className={styles.rewardValue}><span>{item.rewardKind === "digital" ? "Digital reward" : "Physical prize"}</span><strong>{formatUsdFromCents(item.priceCents)}</strong><small>{item.retailer}</small></div>
          <p className={styles.detailCopy}>{item.rewardKind === "digital" ? "This digital reward is ready in My Rewards." : "This physical-prize outcome will continue through Orders & Fulfillment."}</p>
        </section>
      </> : item.status === "active" ? <>
        <section className={styles.detailPanel}>
          <p className={styles.panelEyebrow}>IN PLAY</p>
          <h3>Your entry is still open</h3>
          <p className={styles.detailCopy}>When an outcome is available, it will appear with this product.</p>
          <dl className={styles.entryFacts}><div><dt>Entry amount</dt><dd>{formatUsdFromCents(item.paidCents)}</dd></div><div><dt>Current status</dt><dd>Still open</dd></div></dl>
        </section>
      </> : <section className={styles.detailPanel}><p className={styles.panelEyebrow}>COMPLETED</p><h3>Activity complete</h3><p className={styles.detailCopy}>Completed activity details. No additional fulfillment action is enabled in this checkpoint.</p></section>}

      <div className={styles.detailFooter}>
        <button disabled type="button">{disabledAction} — not enabled</button>
        <p>This action is not available yet.</p>
      </div>
    </div>
  </dialog>;
}
