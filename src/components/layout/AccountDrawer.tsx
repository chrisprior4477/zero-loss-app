"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOutAction } from "@/lib/auth/actions";
import { investorDemoAccount } from "@/lib/demo/account-drawer";
import { accountHref, accountModeFromPath } from "@/lib/account/mode";

type AccountDrawerProps = { isSignedIn: boolean; displayName: string; avatarUrl: string | null };

const primaryLinks = [
  ["My Entries", "entries", String(investorDemoAccount.activeEntries)],
  ["Orders & Fulfillment", "orders", String(investorDemoAccount.orderCount)],
  ["Wallet & Transactions", "wallet", ""],
  ["Notifications", "notifications", String(investorDemoAccount.notificationCount)],
  ["Account & Security", "security", ""],
] as const;

const secondaryLinks = [
  ["How Zero Loss Works", "/how-it-works"],
  ["Official Rules & Free Entry (Draft)", "/account/preview/official-rules"],
  ["Fairness & Verification", "/about"],
  ["Responsible Use", "/responsible-participation"],
  ["Help & FAQ", "/faq"],
  ["Contact Support", "/contact"],
  ["Privacy Policy", "/privacy"],
  ["Terms of Service", "/terms"],
] as const;

function DrawerLink({ label, href, badge, onNavigate }: { label: string; href: string; badge?: string; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-[14px] font-semibold text-white/88 transition-colors hover:bg-white/7 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
      <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cyan-200/25 text-[13px] text-cyan-100">›</span>
      <span className="min-w-0 flex-1">{label}</span>
      {badge && <span className="grid min-w-8 place-items-center rounded-full bg-[#123d64] px-2 py-1 text-[11px] font-bold text-cyan-100">{badge}</span>}
    </Link>
  );
}

function DrawerAvatar({ avatar, initials, size }: { avatar: string | null; initials: string; size: "small" | "large" }) {
  const dimension = size === "small" ? "h-9 w-9" : "h-11 w-11";
  return avatar ? (
    <span className={`relative ${dimension} shrink-0 overflow-hidden rounded-full border-2 border-cyan-300/50`}>
      <Image src={avatar} alt="" fill unoptimized className="object-cover" />
    </span>
  ) : (
    <span aria-hidden="true" className={`grid ${dimension} shrink-0 place-items-center rounded-full border border-cyan-300/40 bg-[#07533f] text-[11px] font-black text-[#72ff9f]`}>
      {initials}
    </span>
  );
}

export function AccountDrawer({ isSignedIn, displayName, avatarUrl }: AccountDrawerProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setAvatar(avatarUrl);
    const updateAvatar = (event: Event) => {
      const detail = (event as CustomEvent<{ photo: string }>).detail;
      setAvatar(detail.photo);
    };
    window.addEventListener("zero-loss-avatar-updated", updateAvatar);
    return () => window.removeEventListener("zero-loss-avatar-updated", updateAvatar);
  }, [avatarUrl]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((element) => !element.hasAttribute("hidden"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      (previouslyFocused?.isConnected ? previouslyFocused : trigger)?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);
  const shownName = isSignedIn ? displayName : investorDemoAccount.customerName;
  const initials = shownName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ZL";
  const accountMode = pathname.startsWith("/account") ? accountModeFromPath(pathname) : "live";
  const isDemoMode = accountMode === "demo";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open account menu"
        aria-expanded={open}
        className={`grid h-9 w-9 place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${isSignedIn ? "rounded-full border border-cyan-300/40 bg-[#07533f] text-[11px] font-black text-[#72ff9f] hover:border-cyan-200" : "rounded-md text-white/75 hover:bg-white/8 hover:text-white"}`}
      >
        {isSignedIn ? (
          <DrawerAvatar avatar={avatar} initials={initials} size="small" />
        ) : (
          <span aria-hidden="true" className="flex w-[17px] flex-col gap-[3px]"><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /></span>
        )}
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[120]" role="presentation">
          <button type="button" aria-label="Close account menu" onClick={close} className="absolute inset-0 h-full w-full cursor-default bg-black/65" />
          <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,420px)] flex-col overflow-hidden border-l border-cyan-300/25 bg-[#03172f] shadow-[-18px_0_50px_rgba(0,0,0,.45)]">
            <div className="flex shrink-0 items-center gap-3 border-b border-cyan-200/15 px-5 py-4">
              <DrawerAvatar avatar={isSignedIn ? avatar : null} initials={initials} size="large" />
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-[18px] font-bold text-white">{shownName}</h2>
                <p className="text-[12px] text-white/55">{isSignedIn ? (isDemoMode ? "Demo account" : "Live account") : investorDemoAccount.accountLabel}</p>
                {isDemoMode ? <p className="mt-1 text-[9px] font-bold uppercase tracking-[.12em] text-cyan-300">Demo data</p> : null}
              </div>
              <button ref={closeRef} type="button" onClick={close} aria-label="Close account menu" className="grid h-10 w-10 place-items-center rounded-lg text-2xl font-light text-white/65 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/45">Account snapshot</p>
                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] text-cyan-200">Demo Data</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#0b3155] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/55">Playable balance</p>
                  <p className="mt-1 text-[19px] font-extrabold text-[#46f293]">{investorDemoAccount.playableBalance}</p>
                  <Link href={accountHref(accountMode, "wallet")} onClick={close} className="mt-2 inline-flex rounded-md bg-[#087feb] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#1692ff]">Add Funds</Link>
                </div>
                <Link href={accountHref(accountMode, "entries")} onClick={close} className="rounded-xl bg-[#0b3155] px-4 py-3 transition-colors hover:bg-[#104269]">
                  <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/55">Active entries</p>
                  <p className="mt-1 text-[19px] font-extrabold text-white">{investorDemoAccount.activeEntries}</p>
                  <p className="mt-2 text-[11px] font-semibold text-cyan-300">View Entries</p>
                </Link>
              </div>

              <Link href={accountHref(accountMode, "results")} onClick={close} className="mt-4 flex min-h-[68px] items-center gap-3 rounded-xl border border-[#168bd4] bg-[#0b3155] px-4 transition-colors hover:bg-[#104269]">
                <span aria-hidden="true" className="text-xl text-cyan-200">◷</span>
                <span className="min-w-0 flex-1"><strong className="block text-[14px] text-white">{investorDemoAccount.resultsReady} results ready</strong><span className="text-[11px] text-white/60">Review your outcomes and available next steps</span></span>
                <span className="text-[12px] font-bold text-cyan-300">Review</span>
              </Link>

              <nav aria-label="Account activity" className="mt-4">
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.13em] text-white/45">Your activity</p>
                <DrawerLink label="Profile & dashboard" href={accountMode === "demo" ? "/account/preview/entries" : "/account"} onNavigate={close} />
                {primaryLinks.map(([label, section, badge]) => <DrawerLink key={label} label={label} href={accountHref(accountMode, section)} badge={isDemoMode && badge ? badge : undefined} onNavigate={close} />)}
              </nav>

              <div className="mt-3 border-t border-cyan-200/15 pt-3">
                <button type="button" onClick={() => setMoreOpen((current) => !current)} aria-expanded={moreOpen} aria-controls="account-drawer-help-links" className="flex min-h-12 w-full items-center justify-between rounded-lg px-2 text-left text-[14px] font-semibold text-white/88 hover:bg-white/7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span>Help, Rules & Policies</span><span aria-hidden="true" className={`text-cyan-300 transition-transform ${moreOpen ? "rotate-180" : ""}`}>⌄</span>
                </button>
                {moreOpen && <nav id="account-drawer-help-links" aria-label="Help, rules and policies" className="pb-2 pl-2">{secondaryLinks.map(([label, href]) => <DrawerLink key={label} label={label} href={href} onNavigate={close} />)}</nav>}
              </div>
            </div>

            <div className="shrink-0 border-t border-cyan-200/15 px-5 py-3">
              {isSignedIn ? <form action={signOutAction}><button type="submit" className="min-h-11 w-full rounded-lg px-2 text-left text-[14px] font-semibold text-[#ff796c] hover:bg-red-400/8">↪ &nbsp; Sign out</button></form> : <div className="grid grid-cols-2 gap-3"><Link href="/login" onClick={close} className="grid min-h-11 place-items-center rounded-lg border border-cyan-200/25 text-[13px] font-bold text-white">Sign in</Link><Link href="/signup" onClick={close} className="grid min-h-11 place-items-center rounded-lg bg-[#087feb] text-[13px] font-bold text-white">Sign up</Link></div>}
            </div>
          </aside>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
