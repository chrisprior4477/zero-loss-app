"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { activityPresentation, type ActivityDestination, type ActivityFilter, type ActivityItem } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";

export function ActivityDetailDialog({ item, isPreview, destination, filter = "all" }: {
  item: ActivityItem;
  isPreview: boolean;
  destination: ActivityDestination;
  filter?: ActivityFilter;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const style = activityPresentation(item);
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

  const disabledAction = item.status === "completion" ? "Complete purchase" : item.status === "active" ? "Entry participation" : style.action;
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
    className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-l border-cyan-300/25 bg-[#031b35] p-0 text-white shadow-2xl backdrop:bg-[#000b1d]/75 open:flex sm:max-w-[520px] sm:rounded-l-3xl">
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
      <p className="text-xs font-black uppercase tracking-widest text-cyan-300">{item.status === "completion" ? "Purchase option" : item.status === "prize" ? "Your reward" : "Entry details"}</p>
      <button ref={closeRef} type="button" onClick={close} aria-label="Close activity details" className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/60 text-2xl text-cyan-300 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
    </header>
    <div role="region" aria-label="Product details" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-cyan-300 focus-visible:-outline-offset-2 sm:p-7">
      {isPreview ? <p className="mb-5 rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-xs leading-5 text-[#b5cce4]"><strong className="text-cyan-300">Interactive MVP Preview</strong> · Sample details, read only.</p> : null}
      <div className={`relative mx-auto h-44 w-full overflow-hidden rounded-2xl ${style.background}`}><Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 90vw, 460px" className="object-contain p-5" /></div>
      <p className="mt-5 text-sm font-bold text-[#b5cce4]">{item.retailer}</p>
      <h2 id={titleId} className="mt-1 break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl">{item.title}</h2>
      <p className={`mt-3 text-xs font-black uppercase tracking-widest ${style.color}`}>{style.label}</p>

      {item.status === "completion" ? <>
        <h3 className="mt-6 text-lg font-bold">Complete this product’s purchase</h3>
        <dl className="mt-4 grid grid-cols-3 gap-3 rounded-2xl border border-white/10 bg-[#0b304d] p-4">
          {[["Product price", formatUsdFromCents(item.priceCents)], ["Already applied", formatUsdFromCents(item.paidCents)], ["Remaining", formatUsdFromCents(item.remainingCents)]].map(([label, value], index) => <div key={label}><dt className="text-[11px] leading-4 text-[#b5cce4]">{label}</dt><dd className={`mt-2 text-xl font-black tabular-nums ${index === 2 ? "text-[#ff8a45]" : "text-white"}`}>{value}</dd></div>)}
        </dl>
        <p className="mt-4 text-sm leading-6 text-[#b5cce4]">An optional purchase of this exact originating product. No payment is due unless you choose to complete it.</p>
        <p className="mt-3 text-xs leading-5 text-[#b5cce4]"><strong className="text-white">Availability:</strong> {item.availability}</p>
        <p className="mt-3 text-xs leading-5 text-[#9bb3ce]">Not wallet cash, transferable credit or a retailer-wide alternative.</p>
      </> : item.status === "prize" ? <>
        <div className="mt-6 rounded-2xl border border-[#31ff83]/20 bg-[#0a3c36] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#b5cce4]">{item.rewardKind === "digital" ? "Digital gift-card reward" : "Physical prize"}</p>
          <p className="mt-2 text-3xl font-black text-[#31ff83]">{formatUsdFromCents(item.priceCents)}</p>
          <p className="mt-1 text-sm text-white">{item.retailer}</p>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#b5cce4]">{item.rewardKind === "digital" ? "This illustrates the digital gift-card reward associated with the pictured product. No gift card or redeemable barcode has been issued." : "This illustrates a physical-prize outcome. No prize claim or delivery request has been created."}</p>
      </> : item.status === "active" ? <>
        <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-[#0b304d] p-5"><h3 className="text-lg font-bold">Your entry is still open</h3><p className="mt-2 text-sm leading-6 text-[#b5cce4]">When an outcome is available, it will appear with this product.</p><p className="mt-3 text-sm text-[#b5cce4]">{isPreview ? "Illustrative entry amount" : "Entry amount"}: <strong className="text-white">{formatUsdFromCents(item.paidCents)}</strong></p></div>
        {isPreview ? <p className="mt-4 text-xs leading-5 text-[#9bb3ce]">This is a sample open entry, not a purchased or stored entry. No closing time or selection result is being invented.</p> : null}
      </> : <p className="mt-6 text-sm leading-6 text-[#b5cce4]">Completed activity details. No additional fulfillment action is enabled in this checkpoint.</p>}

      <div className="mt-6 border-t border-white/10 pt-5">
        <button disabled type="button" className="min-h-12 w-full cursor-not-allowed rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-bold text-[#9bb3ce]">{disabledAction} — not enabled</button>
        <p className="mt-3 text-xs leading-5 text-[#9bb3ce]">Preview only. Funding, entry purchases, outcome creation and reward delivery remain disabled.</p>
      </div>
    </div>
  </dialog>;
}
