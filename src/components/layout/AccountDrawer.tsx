"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOutAction } from "@/lib/auth/actions";
import { investorDemoAccount } from "@/lib/demo/account-drawer";
import { accountHref, accountModeFromPath } from "@/lib/account/mode";

type AccountDrawerProps = {
  isSignedIn: boolean;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  balanceLabel: string | null;
};

const primaryLinks = [
  ["My Entries", "entries", String(investorDemoAccount.activeEntries)],
  ["Orders & Fulfillment", "orders", String(investorDemoAccount.orderCount)],
  ["Wallet & Transactions", "wallet", ""],
  ["Notifications", "notifications", String(investorDemoAccount.notificationCount)],
  ["Account & Security", "security", ""],
] as const;

const secondaryLinks = [
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

const activityDetails = {
  profile: "View your saved profile, photo, verification, and account overview.",
  entries: "Review your active entries and completed results.",
  orders: "Track rewards, delivery, and fulfillment updates.",
  wallet: "See your playable balance and complete transaction history.",
  notifications: "Review account, entry, result, and delivery updates.",
  security: "Manage your sign-in, password, and account security.",
} as const;

function DrawerActivity({
  label,
  section,
  detail,
  href,
  badge,
  expanded,
  onToggle,
  onNavigate,
}: {
  label: string;
  section: keyof typeof activityDetails;
  detail?: string;
  href: string;
  badge?: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const panelId = `account-drawer-${section}`;
  return (
    <div className="border-b border-white/7 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left text-[14px] font-semibold text-white/88 transition-colors hover:bg-white/7 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-cyan-200/25 text-[13px] text-cyan-100 transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
        <span className="min-w-0 flex-1">{label}</span>
        {badge ? <span className="grid min-w-8 place-items-center rounded-full bg-[#123d64] px-2 py-1 text-[11px] font-bold text-cyan-100">{badge}</span> : null}
      </button>
      {expanded ? (
        <div id={panelId} className="mx-2 mb-3 rounded-xl border border-cyan-200/15 bg-[#082846] p-4">
          <p className="text-xs leading-5 text-white/65">{detail ?? activityDetails[section]}</p>
          <Link href={href} onClick={onNavigate} className="mt-3 inline-flex min-h-9 items-center rounded-full border border-cyan-300/35 px-4 text-xs font-bold text-cyan-200 hover:bg-cyan-300/10">
            Open {label.toLowerCase()}
          </Link>
        </div>
      ) : null}
    </div>
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

export function AccountDrawer({ isSignedIn, displayName, email, avatarUrl, balanceLabel }: AccountDrawerProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountPath, setAccountPath] = useState<"pleasure" | "business">("pleasure");
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [openActivity, setOpenActivity] = useState<string | null>(null);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!avatarUrl) {
      const explicitlyChosenPhoto = window.localStorage.getItem("zero-loss-profile-photo");
      if (explicitlyChosenPhoto) window.setTimeout(() => setAvatar(explicitlyChosenPhoto), 0);
    }
    const updateAvatar = (event: Event) => {
      const detail = (event as CustomEvent<{ photo: string | null }>).detail;
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
  const accountMode = pathname.startsWith("/account") ? accountModeFromPath(pathname) : "live";
  const isDemoMode = accountMode === "demo";
  const showAccountContent = isSignedIn || isDemoMode;
  const shownName = isDemoMode ? investorDemoAccount.customerName : isSignedIn ? displayName : "Welcome";
  const initials = shownName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ZL";
  const resolvedAvatar = avatar ?? avatarUrl;
  const hasSavedAvatar = isSignedIn && Boolean(resolvedAvatar);
  const entryCount = isDemoMode ? investorDemoAccount.activeEntries : 0;
  const resultCount = isDemoMode ? investorDemoAccount.resultsReady : 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open account menu"
        aria-expanded={open}
        className={`grid h-9 w-9 place-items-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${hasSavedAvatar ? "rounded-full border border-cyan-300/40 bg-[#07533f] hover:border-cyan-200" : "rounded-md text-white/75 hover:bg-white/8 hover:text-white"}`}
      >
        {hasSavedAvatar ? (
          <DrawerAvatar avatar={resolvedAvatar} initials={initials} size="small" />
        ) : (
          <span aria-hidden="true" className="flex w-[17px] flex-col gap-[3px]"><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /><span className="h-px w-full bg-current" /></span>
        )}
      </button>

      {open && typeof document !== "undefined" ? createPortal(
        <div className="fixed inset-0 z-[120]" role="presentation">
          <button type="button" aria-label="Close account menu" onClick={close} className="absolute inset-0 h-full w-full cursor-default bg-black/65" />
          <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,420px)] flex-col overflow-hidden border-l border-cyan-300/25 bg-[#03172f] shadow-[-18px_0_50px_rgba(0,0,0,.45)]">
            <div className="flex shrink-0 items-center gap-3 border-b border-cyan-200/15 px-5 py-4">
              {!showAccountContent ? (
                <Link href="/signup" onClick={close} aria-label="Create a Zero Loss account" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#31e800]/55 bg-[#31e800]/12 transition hover:bg-[#31e800]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span aria-hidden="true" className="h-7 w-7 bg-[#73e72d] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
                </Link>
              ) : (
                <Link
                  href={accountMode === "demo" ? "/account/preview/entries" : "/account"}
                  onClick={close}
                  aria-label={`Open ${shownName}'s account`}
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition hover:bg-white/7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  {isDemoMode ? <DrawerAvatar avatar={null} initials={initials} size="large" /> : hasSavedAvatar ? <DrawerAvatar avatar={resolvedAvatar} initials={initials} size="large" /> : (
                    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#31e800]/45 bg-[#31e800]/10 text-sm font-black text-[#72ff9f]">
                      {initials}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span id={titleId} className="block truncate text-[18px] font-bold text-white">{shownName}</span>
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#72ff9f]">
                      {isDemoMode ? investorDemoAccount.accountLabel : "Live account"}
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                    {isDemoMode ? <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.12em] text-cyan-300">Demo data</span> : null}
                  </span>
                </Link>
              )}
              {!showAccountContent ? <div className="min-w-0 flex-1"><h2 id={titleId} className="truncate text-[18px] font-bold text-white">{shownName}</h2><p className="text-[12px] text-white/55">Sign in or create an account</p></div> : null}
              <button ref={closeRef} type="button" onClick={close} aria-label="Close account menu" className="grid h-10 w-10 place-items-center rounded-lg text-2xl font-light text-white/65 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {showAccountContent ? <><div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white/45">Account snapshot</p>
                {isDemoMode ? <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.1em] text-cyan-200">Demo Data</span> : null}
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#31e800]/25 bg-[linear-gradient(135deg,#06375a_0%,#07533f_100%)]">
                <div className="px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[.1em] text-[#72ff9f]">Playable balance</p>
                  <p className="mt-1 text-[26px] font-black tabular-nums tracking-[-0.04em] text-white">{isDemoMode ? investorDemoAccount.playableBalance : balanceLabel ?? "$0.00"}</p>
                </div>
                <div className="grid grid-cols-2 border-t border-white/12">
                  <Link href={accountHref(accountMode, "wallet")} onClick={close} className="grid min-h-11 place-items-center bg-[#31e800] px-3 text-[11px] font-black text-[#002719] transition hover:bg-[#72ff4e]">Add funds</Link>
                  <Link href={accountHref(accountMode, "wallet")} onClick={close} className="grid min-h-11 place-items-center border-l border-white/12 px-3 text-center text-[11px] font-black text-white transition hover:bg-white/8">View transactions</Link>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Link href={accountHref(accountMode, "entries")} onClick={close} className="rounded-xl border border-cyan-300/15 bg-[#0b3155] px-4 py-3 transition-colors hover:bg-[#104269]">
                  <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/55">Active entries</p>
                  <p className="mt-1 text-[19px] font-extrabold text-white">{entryCount}</p>
                  <p className="mt-2 text-[11px] font-semibold text-cyan-300">View Entries</p>
                </Link>
                <Link href={accountHref(accountMode, "results")} onClick={close} className="rounded-xl border border-cyan-300/15 bg-[#0b3155] px-4 py-3 transition-colors hover:bg-[#104269]">
                  <p className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/55">Results ready</p>
                  <p className="mt-1 text-[19px] font-extrabold text-white">{resultCount}</p>
                  <p className="mt-2 text-[11px] font-semibold text-cyan-300">Review results</p>
                </Link>
              </div>

              <nav aria-label="Account activity" className="mt-4">
                <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[.13em] text-white/45">Your activity</p>
                <DrawerActivity
                  label="Profile & dashboard"
                  section="profile"
                  detail={email ? `${displayName} · ${email}` : activityDetails.profile}
                  href={accountMode === "demo" ? "/account/preview/entries" : "/account"}
                  expanded={openActivity === "profile"}
                  onToggle={() => setOpenActivity((current) => current === "profile" ? null : "profile")}
                  onNavigate={close}
                />
                {primaryLinks.map(([label, section, badge]) => <DrawerActivity
                  key={label}
                  label={label}
                  section={section}
                  href={accountHref(accountMode, section)}
                  badge={isDemoMode && badge ? badge : undefined}
                  expanded={openActivity === section}
                  onToggle={() => setOpenActivity((current) => current === section ? null : section)}
                  onNavigate={close}
                />)}
                {openActivity === "profile" && email ? <p className="sr-only">Signed in as {displayName}, {email}</p> : null}
              </nav>
              </> : <section className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#001b3d] p-5">
                  <span aria-hidden="true" className="absolute -left-5 -top-6 h-32 w-32 bg-[#ff630f]/65 [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
                  <span aria-hidden="true" className="absolute -bottom-16 -right-12 h-52 w-52 bg-[#31e800]/16 [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
                  <div className="relative z-10">
                    <span aria-hidden="true" className="absolute right-0 top-0 block h-12 w-12 bg-[#69edff] drop-shadow-[0_0_14px_rgba(105,237,255,.42)] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Your Zero Loss account</p>
                    <h3 className="mt-3 text-3xl font-black leading-[.95] tracking-[-0.05em] text-white">One account.<br /><span className="text-[#31e800]">Every $1 shot counts.</span></h3>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#ff8a45]">What brings you to Zero Loss?</p>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose account type">
                    <button type="button" aria-pressed={accountPath === "pleasure"} onClick={() => setAccountPath("pleasure")} className={`min-h-16 rounded-xl border p-3 text-left transition ${accountPath === "pleasure" ? "border-[#31e800] bg-[#31e800]/12" : "border-white/12 bg-white/5"}`}><strong className={accountPath === "pleasure" ? "text-[#72ff4e]" : "text-white"}>For personal use</strong><span className="mt-1 block text-[11px] text-white/50">Enter and explore</span></button>
                    <button type="button" aria-pressed={accountPath === "business"} onClick={() => setAccountPath("business")} className={`min-h-16 rounded-xl border p-3 text-left transition ${accountPath === "business" ? "border-cyan-300 bg-cyan-300/12" : "border-white/12 bg-white/5"}`}><strong className={accountPath === "business" ? "text-cyan-300" : "text-white"}>For business</strong><span className="mt-1 block text-[11px] text-white/50">Offer products or rewards</span></button>
                  </div>
                </div>

                <Link href={accountPath === "business" ? "/signup?account=business" : "/signup"} onClick={close} className="grid min-h-12 w-full place-items-center rounded-xl bg-[#087feb] px-4 text-sm font-black text-white transition hover:bg-[#1692ff]">Sign up</Link>
                <p className="text-center text-xs text-white/50">Already registered? <Link href="/login?focus=email#login-form" onClick={close} className="font-bold text-cyan-300 hover:underline">Sign in</Link></p>
                <Link href="/how-it-works" onClick={close} className="grid min-h-11 w-full place-items-center rounded-xl border border-[#ff7a2d] bg-[#ff630f] px-4 text-sm font-black text-white transition hover:bg-[#ff7a2d]">How It Works</Link>
              </section>}

              <div className="mt-3 border-t border-cyan-200/15 pt-3">
                <button type="button" onClick={() => setMoreOpen((current) => !current)} aria-expanded={moreOpen} aria-controls="account-drawer-help-links" className="flex min-h-12 w-full items-center justify-between rounded-lg px-2 text-left text-[14px] font-semibold text-white/88 hover:bg-white/7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span>Help, Rules & Policies</span><span aria-hidden="true" className={`text-cyan-300 transition-transform ${moreOpen ? "rotate-180" : ""}`}>⌄</span>
                </button>
                {moreOpen && <nav id="account-drawer-help-links" aria-label="Help, rules and policies" className="pb-2 pl-2">{secondaryLinks.map(([label, href]) => <DrawerLink key={label} label={label} href={href} onNavigate={close} />)}</nav>}
              </div>
            </div>

            {showAccountContent ? <div className="shrink-0 border-t border-cyan-200/15 px-5 py-3">
              {isSignedIn ? <form action={signOutAction}><button type="submit" className="min-h-11 w-full rounded-lg px-2 text-left text-[14px] font-semibold text-[#ff796c] hover:bg-red-400/8">↪ &nbsp; Sign out</button></form> : <div className="grid grid-cols-2 gap-3"><Link href="/login" onClick={close} className="grid min-h-11 place-items-center rounded-lg border border-cyan-200/25 text-[13px] font-bold text-white">Sign in</Link><Link href="/signup" onClick={close} className="grid min-h-11 place-items-center rounded-lg bg-[#087feb] text-[13px] font-bold text-white">Sign up</Link></div>}
            </div> : null}
          </aside>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
