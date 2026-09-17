"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOutAction } from "@/lib/auth/actions";
import { activityHref, activityPresentation, openEntriesHref, walletHistoryHref, type AccountActivity } from "@/lib/account/activity";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { EntryTicket } from "@/components/layout/EntryTicket";
import { WalletShortcut } from "@/components/wallet/WalletShortcut";
import { MyZeroLossSummary, PlayableBalanceCard } from "@/components/account/AccountSummaries";
import { ProfileShortcut } from "@/components/account/ProfileShortcut";

type AccountDrawerProps = {
  isSignedIn: boolean;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  balanceLabel: string | null;
  fundingEnabled?: boolean;
  activityState: AccountActivity;
};

const primaryLinks = [
  ["My Rewards", "/account/wallet", ""],
  ["My Zero Loss", "/account/entries", ""],
  ["Wallet & Transactions", walletHistoryHref, "History"],
  ["Orders & Fulfillment", "/account/orders", ""],
  ["Notifications", "/account/notifications", ""],
  ["Account & Security", "/account/security", ""],
] as const;

const secondaryLinks = [
  ["Official Rules & Free Entry", "/free-entry"],
  ["Fairness & Verification", "/about"],
  ["Help Center", "/support"],
  ["Privacy & Terms", "/privacy"],
] as const;

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

export function AccountDrawer({ isSignedIn, displayName, email, avatarUrl, balanceLabel, fundingEnabled = false, activityState }: AccountDrawerProps) {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(true);
  const [accountPath, setAccountPath] = useState<"pleasure" | "business">("pleasure");
  const [avatarUpdate, setAvatarUpdate] = useState<{ original: string | null; photo: string | null } | null>(null);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateAvatar = (event: Event) => {
      const detail = (event as CustomEvent<{ photo: string | null }>).detail;
      setAvatarUpdate({ original: avatarUrl, photo: detail.photo });
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
      ).filter((element) => !element.hasAttribute("hidden") && element.getClientRects().length > 0);
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
  const state = activityState;
  const showAccountContent = isSignedIn;
  const shownName = isSignedIn ? displayName : "Welcome";
  const initials = shownName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ZL";
  const resolvedAvatar = avatarUpdate?.original === avatarUrl ? avatarUpdate.photo : avatarUrl;
  const hasSavedAvatar = isSignedIn && Boolean(resolvedAvatar);
  const ticketLabel = state.activeCount === null ? "Active entries unavailable" : `${state.activeCount} active ${state.activeCount === 1 ? "entry" : "entries"}`;

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
          <aside ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,440px)] flex-col overflow-hidden border-l border-cyan-300/25 bg-[#03172f] shadow-[-18px_0_50px_rgba(0,0,0,.45)]">
            <div className="flex shrink-0 items-center gap-3 border-b border-cyan-200/15 px-5 py-4">
              {!showAccountContent ? (
                <Link href="/signup" onClick={close} aria-label="Create a Zero Loss account" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#31e800]/55 bg-[#31e800]/12 transition hover:bg-[#31e800]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span aria-hidden="true" className="h-7 w-7 bg-[#73e72d] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
                </Link>
              ) : (
                <Link
                  href="/account"
                  onClick={close}
                  aria-label="Open Account Dashboard"
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition hover:bg-white/7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  <span className="min-w-0 flex-1">
                    <span id={titleId} className="block break-words text-[18px] font-bold text-white">Your Zero Loss</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#b5cce4]">
                      Account Dashboard
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">›</span>
                    </span>
                  </span>
                </Link>
              )}
              {!showAccountContent ? <div className="min-w-0 flex-1"><h2 id={titleId} className="truncate text-[18px] font-bold text-white">{shownName}</h2><p className="text-[12px] text-white/55">Sign in or create an account</p></div> : null}
              {showAccountContent ? <Link href={openEntriesHref} onClick={close} title={ticketLabel} aria-label={ticketLabel} className="shrink-0 rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-cyan-300"><EntryTicket count={state.activeCount} /></Link> : null}
              <button ref={closeRef} type="button" onClick={close} aria-label="Close account menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300 text-2xl font-light text-cyan-300 hover:bg-white/8 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {showAccountContent ? <>
                <div aria-label="Your Zero Loss overview" className="grid gap-2">
                  <PlayableBalanceCard balanceLabel={balanceLabel} fundingEnabled={fundingEnabled} compact onNavigate={close} />
                  <WalletShortcut state={state} onNavigate={close} />
                  <MyZeroLossSummary state={state} compact onNavigate={close} />
                </div>

                <section className="mt-6" aria-label="Your latest activity" data-activity-source={state.source}>
                  <h3 className="text-base font-bold text-white">Your latest activity</h3>
                  {state.activity.length === 0 ? <p className="py-7 text-sm leading-6 text-[#b5cce4]">{state.source === "unavailable" ? "Activity unavailable. Please try again shortly." : "No activity yet. Your entries, prizes and purchase options will appear here."}</p> : (
                    <div className="mt-3">
                      {state.activity.map(item => <Link
                        key={item.slug}
                        href={activityHref(item)}
                        onClick={close}
                        className="grid grid-cols-[48px_minmax(0,1fr)_minmax(90px,112px)] items-center gap-3 border-b border-white/10 py-3 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300"
                      >
                        <span className={`relative h-12 w-12 overflow-hidden rounded-xl ${item.status === "prize" ? "bg-[#16703f]" : item.status === "completion" ? "bg-[#8c3d15]" : "bg-[#154b74]"}`}>
                          <Image src={item.image} alt="" fill sizes="48px" className="object-contain p-1" />
                        </span>
                        <span className="min-w-0 text-sm leading-5"><strong className="block text-white">{item.retailer}</strong><span className="mt-0.5 block break-words text-[#b5cce4]">{item.title}</span></span>
                        <span className="text-right text-xs leading-5">
                          <span className={`block font-semibold uppercase ${activityPresentation(item).color}`}>{activityPresentation(item).label}</span>
                          <strong className="block text-white">{item.status === "completion" ? `${formatUsdFromCents(item.remainingCents)} remaining` : activityPresentation(item).action} ›</strong>
                          {item.status === "completion" ? <span className="block text-[10px] text-[#b5cce4]">{formatUsdFromCents(item.paidCents)} already applied</span> : null}
                        </span>
                      </Link>)}
                    </div>
                  )}
                </section>

                <div className="mt-4"><ProfileShortcut fullName={shownName} initials={initials} avatarUrl={resolvedAvatar} onNavigate={close} /></div>
                <nav aria-label="Account navigation" className="mt-4">
                  {primaryLinks.map(([label, href, detail]) => <Link key={href} href={href} onClick={close} className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 text-sm font-bold text-white hover:text-cyan-300">
                    <span>{label}</span><span className="shrink-0 text-xs text-[#b5cce4]">{detail} ›</span>
                  </Link>)}
                </nav>
                {email ? <span className="sr-only">Signed in as {displayName}, {email}</span> : null}
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
                  <span>Help, Rules & Policies</span><span aria-hidden="true" className="text-cyan-300">{moreOpen ? "⌄" : "›"}</span>
                </button>
                {moreOpen && <nav id="account-drawer-help-links" aria-label="Help, rules and policies" className="pb-2 pl-2">{secondaryLinks.map(([label, href]) => <Link key={label} href={href} onClick={close} className="flex min-h-11 items-center text-sm font-bold text-cyan-300 hover:underline">{label}</Link>)}</nav>}
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
