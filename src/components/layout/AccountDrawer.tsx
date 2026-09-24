"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openEntriesHref, walletHistoryHref, type AccountActivity } from "@/lib/account/activity";
import { usePathname } from "next/navigation";
import { DrawerOverview } from "@/components/account/DrawerOverview";
import { AccountIcon, type AccountIconName } from "@/components/account/AccountIcon";
import { DrawerIllustration } from "@/components/account/DrawerIllustration";
import styles from "@/components/account/drawer.module.css";
import { marketplaceCategories, marketplaceCategoryHref } from "@/lib/catalog/navigation";
import { accountNavigation } from "@/lib/account/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { INSTALL_APP_REQUEST_EVENT } from "@/components/layout/InstallAppPrompt";

type AccountDrawerProps = {
  isSignedIn: boolean;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  balanceLabel: string | null;
  fundingEnabled?: boolean;
  activityState: AccountActivity;
  /** The local design fixture only; never passed by production account pages. */
  preview?: { mode: "implementation" | "reference" | "overlay" | "difference"; capture: boolean; referenceImage: string };
};

const secondaryLinks = [
  ["Official Rules & Free Entry", "/free-entry"],
  ["Fairness & Verification", "/about"],
  ["Help Center", "/support"],
  ["Privacy & Terms", "/privacy"],
] as const;

const navigationDescriptions: Record<string, string> = {
  "My Activity": "Track your entries and results.",
  "Gift Cards & Rewards": "Browse prizes and claim rewards.",
  "Wallet & Transactions": "Manage your balance and view transactions.",
  "Orders & Fulfillment": "Track your orders and delivery updates.",
  "Your Crew": "Build your crew and see their activity.",
  "Notifications": "The updates that need your attention.",
  "Account & Security": "Profile, preferences, and security settings.",
};

function DrawerAvatar({ avatar, initials }: { avatar: string | null; initials: string }) {
  return avatar ? (
    <span className={styles.avatar}>
      <Image src={avatar} alt="" fill unoptimized className="object-cover" />
    </span>
  ) : (
    <span aria-hidden="true" className={styles.avatar}>
      {initials}
    </span>
  );
}

/** Drawer-only outline: the approved counter has no Zero Loss mark inside its ticket. */
function DrawerTicketCounter({ count }: { count: number | null }) {
  return <span className={styles.ticketCounter}>
    <svg aria-hidden="true" viewBox="0 0 54 36" fill="none">
      <path d="M3 3h48v9a6 6 0 0 0 0 12v9H3v-9a6 6 0 0 0 0-12V3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    </svg>
    <span>{count ?? "—"}</span>
  </span>;
}

export function AccountDrawer({ isSignedIn, displayName, email, avatarUrl, balanceLabel, fundingEnabled = false, activityState, preview }: AccountDrawerProps) {
  const [open, setOpen] = useState(false);
  const previewAutoOpen = Boolean(preview);
  const [moreOpen, setMoreOpen] = useState(!isSignedIn);
  const [walletHistoryOpen, setWalletHistoryOpen] = useState(false);
  const pathname = usePathname();
  const [accountPath, setAccountPath] = useState<"pleasure" | "business">("pleasure");
  const [avatarUpdate, setAvatarUpdate] = useState<{ original: string | null; photo: string | null } | null>(null);
  const titleId = useId();
  const drawerId = useId();
  const countId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewAutoOpen) return;
    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [previewAutoOpen]);

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
    const previousRootOverflow = document.documentElement.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const trigger = triggerRef.current;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbarWidth}px`;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    // Keep the underlying app out of keyboard and assistive-technology navigation.
    const background = Array.from(document.body.children).filter((element) => element !== overlayRef.current);
    const inertBefore = background.map((element) => element.hasAttribute("inert"));
    background.forEach((element) => element.setAttribute("inert", ""));
    const focusFrame = window.requestAnimationFrame(() => {
      if (previewAutoOpen) drawerRef.current?.focus();
      else closeRef.current?.focus();
    });
    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !drawerRef.current?.contains(event.target)) closeRef.current?.focus();
    };
    const closeOnBack = () => setOpen(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [],
      ).filter((element) => !element.hasAttribute("hidden") && element.getClientRects().length > 0);
      if (focusable.length === 0) { event.preventDefault(); drawerRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outside = !drawerRef.current?.contains(document.activeElement) || document.activeElement === drawerRef.current;
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", closeOnBack);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.body.style.paddingRight = previousPadding;
      background.forEach((element, index) => { if (!inertBefore[index]) element.removeAttribute("inert"); });
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("popstate", closeOnBack);
      document.removeEventListener("focusin", keepFocusInside);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, previewAutoOpen]);

  const close = () => setOpen(false);
  const requestInstall = () => {
    setOpen(false);
    window.dispatchEvent(new Event(INSTALL_APP_REQUEST_EVENT));
  };
  const state = activityState.source === "unavailable" ? { ...activityState, activity: [], activeCount: null } : activityState;
  const showAccountContent = isSignedIn;
  const shownName = isSignedIn ? displayName : "Welcome";
  const initials = shownName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ZL";
  const resolvedAvatar = avatarUpdate?.original === avatarUrl ? avatarUpdate.photo : avatarUrl;
  const ticketLabel = state.activeCount === null ? "Active entries unavailable" : `${state.activeCount} active ${state.activeCount === 1 ? "entry" : "entries"}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setWalletHistoryOpen(new URLSearchParams(window.location.search).get("view") === "history"); setOpen(true); }}
        aria-label="Open account menu"
        aria-expanded={open}
        aria-controls={open ? drawerId : undefined}
        aria-describedby={isSignedIn ? countId : undefined}
        aria-haspopup="dialog"
        className={styles.trigger}
      >
        <span aria-hidden="true" className={styles.hamburger}><span /><span /><span /></span>
        {isSignedIn ? <span aria-hidden="true" className={styles.countBadge}>{state.activeCount === null ? "—" : state.activeCount > 99 ? "99+" : state.activeCount}</span> : null}
      </button>
      {isSignedIn ? <span id={countId} className="sr-only">{ticketLabel}</span> : null}

      {open && typeof document !== "undefined" ? createPortal(
        <div ref={overlayRef} className={`${styles.overlay} ${preview ? styles.previewOverlay : ""}`} role="presentation">
          <div aria-hidden="true" onClick={close} className={styles.backdrop} data-testid="account-menu-backdrop" />
          <aside id={drawerId} ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`${styles.drawerFrame} ${showAccountContent ? styles.drawer : "w-[min(100%,440px)] border-l border-cyan-300/25 bg-[#03172f] shadow-[-18px_0_50px_rgba(0,0,0,.45)]"}`}>
            {showAccountContent ? (
              <div className={styles.accountHeader}>
                <Link href="/account/profile" onClick={close} aria-label={`Open ${shownName}'s account`} className={styles.profile}>
                  <DrawerAvatar avatar={resolvedAvatar} initials={initials} />
                  <span><strong>{shownName}</strong><small>Your account</small></span>
                </Link>
                <span id={titleId} className="sr-only">Your Zero Loss account menu</span>
                <div className={styles.accountActions}>
                  <Link href={openEntriesHref} onClick={close} title={ticketLabel} aria-label={ticketLabel} className={styles.ticketLink}>
                    <DrawerTicketCounter count={state.activeCount} />
                  </Link>
                  <button ref={closeRef} type="button" onClick={close} aria-label="Close account menu" className={styles.closeButton}>×</button>
                </div>
              </div>
            ) : (
            <div className="flex shrink-0 items-center gap-3 border-b border-cyan-200/15 px-5 py-4">
                <Link href="/signup" onClick={close} aria-label="Create a Zero Loss account" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#31e800]/55 bg-[#31e800]/12 transition hover:bg-[#31e800]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span aria-hidden="true" className="h-7 w-7 bg-[#73e72d] [mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat] [-webkit-mask:url('/zeroloss-favicon.svg')_center/contain_no-repeat]" />
                </Link>
              <div className="min-w-0 flex-1"><h2 id={titleId} className="truncate text-[18px] font-bold text-white">{shownName}</h2><p className="text-[12px] text-white/55">Sign in or create an account</p></div>
              <button ref={closeRef} type="button" onClick={close} aria-label="Close account menu" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl font-light text-white hover:bg-white/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">×</button>
            </div>
            )}

            <div className={`min-h-0 flex-1 overflow-y-auto ${showAccountContent ? styles.accountContent : "px-5 py-4"}`}>
              {showAccountContent ? <>
                <DrawerOverview state={state} balanceLabel={balanceLabel} fundingEnabled={fundingEnabled} onNavigate={close} />

                <nav aria-label="Account navigation" className={styles.nav}>
                  {accountNavigation.map(([label, href, icon]) => {
                    const active = href.startsWith("/account/wallet") ? pathname === "/account/wallet" && (href === walletHistoryHref) === walletHistoryOpen : pathname === href || pathname?.startsWith(href + "/");
                    return <Link key={href} href={href} onClick={close} aria-label={label} aria-description={navigationDescriptions[label]} aria-current={active ? "page" : undefined} className={styles.navLink}><span className={styles.navArtwork}><DrawerIllustration name={icon as AccountIconName} /></span><span className={styles.navText}><strong>{label}</strong><small>{navigationDescriptions[label]}</small></span><AccountIcon name="chevron" /></Link>;
                  })}
                </nav>
                <div className={styles.taglineTicket} aria-hidden="true"><span className={styles.taglineMark}><span /></span><strong>Real prizes. Real possibilities.</strong></div>
                <button type="button" onClick={requestInstall} className={styles.installButton}><AccountIcon name="install" /><span>Add to Home Screen</span><AccountIcon name="chevron" /></button>
                <form action={signOutAction} className={styles.accountFooter}>
                  <button type="submit" className={styles.signOutButton}><AccountIcon name="signout" /><span>Sign out</span></button>
                </form>
                {email ? <span className="sr-only">Signed in as {displayName}, {email}</span> : null}
              </> : <section className="space-y-4">
                <nav aria-label="Shop categories" className="zl-noscroll flex gap-2 overflow-x-auto pb-1">
                  {marketplaceCategories.map((category) => (
                    <Link key={category.id} href={marketplaceCategoryHref(category.id)} onClick={close} className="shrink-0 rounded-full border border-cyan-200/20 bg-white/5 px-3 py-2 text-[11px] font-bold text-white hover:border-cyan-300 hover:text-cyan-300">
                      {category.label}
                    </Link>
                  ))}
                </nav>
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

              {!showAccountContent ? <div className="mt-3 border-t border-cyan-200/15 pt-3">
                <button type="button" onClick={() => setMoreOpen((current) => !current)} aria-expanded={moreOpen} aria-controls="account-drawer-help-links" className="flex min-h-12 w-full items-center justify-between rounded-lg px-2 text-left text-[14px] font-semibold text-white/88 hover:bg-white/7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                  <span>Help, Rules & Policies</span><span aria-hidden="true" className="text-cyan-300">{moreOpen ? "⌄" : "›"}</span>
                </button>
                {moreOpen && <nav id="account-drawer-help-links" aria-label="Help, rules and policies" className="pb-2 pl-2">{secondaryLinks.map(([label, href]) => <Link key={label} href={href} onClick={close} className="flex min-h-11 items-center text-sm font-bold text-cyan-300 hover:underline">{label}</Link>)}</nav>}
              </div> : null}
            </div>
            {preview && !preview.capture ? <nav aria-label="Local drawer comparison" className={styles.previewToolbar}>
              {(["implementation", "reference", "overlay", "difference"] as const).map((mode) =>
                <Link key={mode} href={`/drawer-local-preview?mode=${mode}`} aria-current={preview.mode === mode ? "page" : undefined}>
                  {mode === "overlay" ? "50% overlay" : mode === "difference" ? "Difference view" : mode[0].toUpperCase() + mode.slice(1)}
                </Link>)}
              <Link href={`/drawer-local-preview?mode=${preview.mode}&capture=1`}>Clean capture</Link>
            </nav> : null}
          </aside>
          {preview && preview.mode !== "implementation" ? <Image
            src={preview.referenceImage} width={503} height={946} alt=""
            className={`${styles.previewReference} ${preview.mode === "overlay" ? styles.previewHalf : ""} ${preview.mode === "difference" ? styles.previewDifference : ""}`}
            draggable={false} unoptimized priority
          /> : null}
        </div>,
        document.body,
      ) : null}
    </>
  );
}
