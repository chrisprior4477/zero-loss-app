"use client";

import { isEntryQuantity } from "@/lib/entries/quantity";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authNavigationHref, signInReturnPath } from "@/lib/auth/entry-return";
import { currentProductEntryHref } from "@/lib/entries/return-intent";
import { createContext, startTransition, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getCurrentFavorites, setFavorite } from "@/lib/favorites/actions";
import { notifyAccountChanged } from "@/lib/account/account-state-events";
import { accountRoutes } from "@/lib/account/navigation";
import popupStyles from "@/components/layout/responsive-popup.module.css";

const pendingKey = "zero-loss-pending-favorite-v1";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pendingMaxAge = 24 * 60 * 60 * 1000;

type FavoritesContextValue = {
  slugs: string[];
  isSignedIn: boolean;
  available: boolean;
  busySlugs: string[];
  toggle: (slug: string, returnTo?: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

type FavoriteIntent = { slug: string; save: boolean; owner?: string; destination?: string };
function rememberFavorite(intent: FavoriteIntent) {
  try { sessionStorage.setItem(pendingKey, JSON.stringify({ ...intent, savedAt: Date.now() })); }
  catch { /* Sign-in still works without storage. */ }
}
function readPendingFavorite(): FavoriteIntent | null {
  try {
    const raw = sessionStorage.getItem(pendingKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && "slug" in value && "savedAt" in value &&
      typeof value.slug === "string" && slugPattern.test(value.slug) &&
      typeof value.savedAt === "number" && value.savedAt <= Date.now() && Date.now() - value.savedAt < pendingMaxAge) return {
      destination: "destination" in value && typeof value.destination === "string" ? value.destination : undefined,
      slug: value.slug, save: !("save" in value) || value.save === true, owner: "owner" in value && typeof value.owner === "string" ? value.owner : undefined,
    };
    sessionStorage.removeItem(pendingKey);
  } catch { /* Browser storage is only a sign-in handoff. */ }
  return null;
}

export function FavoritesProvider({ children, initialSlugs, isSignedIn, available, accountId }: { children: ReactNode; initialSlugs: string[]; isSignedIn: boolean; available: boolean; accountId: string | null }) {
  const router = useRouter();
  const [slugs, setSlugs] = useState(initialSlugs);
  const [busySlugs, setBusySlugs] = useState<string[]>([]);
  const inFlight = useRef(new Set<string>());
  const confirmed = useRef(new Map<string, boolean>());
  const mutationGeneration = useRef(0);
  const [message, setMessage] = useState("");
  const [unverifiedFavorites, setUnverifiedFavorites] = useState<Record<string, boolean>>({});
  const uncheckedSlug = Object.keys(unverifiedFavorites)[0];
  const [lastSavedSlug, setLastSavedSlug] = useState<string | null>(null);
  const syncedPending = useRef(false);
  const [handoffError, setHandoffError] = useState(false);
  const [handoffAttempt, setHandoffAttempt] = useState(0);

  function beginChange(slug: string) {
    if (inFlight.current.has(slug)) return false;
    mutationGeneration.current += 1;
    inFlight.current.add(slug);
    setBusySlugs(current => [...current, slug]);
    return true;
  }
  function finishChange(slug: string) {
    inFlight.current.delete(slug);
    setBusySlugs(current => current.filter(item => item !== slug));
  }

  useEffect(() => {
    if (!available) return;
    // RSC refreshes can have started before a successful write. Keep confirmed
    // hearts until a read started here verifies a conflicting snapshot. This
    // also accepts genuine later changes from another tab, without polling or
    // relying on clocks on different servers being synchronized.
    const next = new Set(initialSlugs);
    let conflicts = false;
    for (const [slug, saved] of confirmed.current) {
      if (next.has(slug) !== saved) conflicts = true;
      if (saved) next.add(slug); else next.delete(slug);
    }
    setSlugs(current => {
      for (const slug of inFlight.current) {
        if (current.includes(slug)) next.add(slug); else next.delete(slug);
      }
      return [...next];
    });
    if (!conflicts || inFlight.current.size || !accountId) return;
    let cancelled = false;
    const generation = mutationGeneration.current;
    void getCurrentFavorites().then(snapshot => {
      if (cancelled || generation !== mutationGeneration.current || !snapshot.available || snapshot.accountId !== accountId) return;
      for (const slug of confirmed.current.keys()) confirmed.current.set(slug, snapshot.slugs.includes(slug));
      setSlugs(snapshot.slugs);
    }).catch(() => { /* Keep confirmed hearts; the next refresh can retry. */ });
    return () => { cancelled = true; };
  }, [initialSlugs, available, accountId, busySlugs]);

  useEffect(() => {
    if (!message || handoffError || uncheckedSlug) return;
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message, handoffError, uncheckedSlug]);

  useEffect(() => {
    if (isSignedIn) return;
    const abandonOnBack = () => {
      if (["/login", "/signup", "/forgot-password", "/reset-password", "/auth/recovery"].includes(location.pathname)) return;
      try { sessionStorage.removeItem(pendingKey); } catch { /* Storage is optional. */ }
    };
    window.addEventListener("popstate", abandonOnBack);
    return () => window.removeEventListener("popstate", abandonOnBack);
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !available || syncedPending.current) return;
    syncedPending.current = true;
    const pending = readPendingFavorite();
    if (!pending || (pending.owner && pending.owner !== accountId)) return;
    if (!pending.destination || pending.destination !== location.pathname + location.search + location.hash) {
      sessionStorage.removeItem(pendingKey);
      return;
    }
    const { slug, save } = pending;
    if (initialSlugs.includes(slug) === save) { sessionStorage.removeItem(pendingKey); return; }
    // The guest explicitly tapped Save. The server rechecks catalog membership and ownership.
    startTransition(() => {
      if (!beginChange(slug)) return;
      const failed = (message: string) => { setHandoffError(true); setMessage(message); };
      void setFavorite(slug, save).then(result => {
        if (result.status !== "saved" && result.status !== "removed") {
          failed(result.message ?? "Could not update this favorite. Please try again.");
          return;
        }
        confirmed.current.set(slug, save);
        notifyAccountChanged();
        sessionStorage.removeItem(pendingKey);
        setSlugs(current => save ? [...new Set([slug, ...current])] : current.filter(item => item !== slug));
        setLastSavedSlug(save ? slug : null);
        setMessage(save ? "Saved to Favorites." : "Removed from Favorites.");
      }).catch(() => failed("Could not update this favorite. Please try again.")).finally(() => finishChange(slug));
    });
  }, [accountId, available, handoffAttempt, initialSlugs, isSignedIn]);

  const toggle = (slug: string, sourceReturn?: string) => {
    if (!slugPattern.test(slug) || inFlight.current.has(slug)) return;
    const favoriteLogin = () => {
      const { pathname, search } = window.location;
      const draft = window.history.state?.freeEntryDraft;
      const selection = draft?.slug === slug && isEntryQuantity(draft.quantity) ? { slug, quantity: draft.quantity } : null;
      const returnTo = pathname === "/browse" ? signInReturnPath(`${pathname}${search}#prize-${slug}`)
        : pathname === "/" ? signInReturnPath(sourceReturn) : currentProductEntryHref(pathname, search, selection);
      return authNavigationHref("/login", returnTo ?? `${accountRoutes.favorites}?item=${encodeURIComponent(slug)}`);
    };
    if (!isSignedIn) {
      const login = favoriteLogin();
      const destination = new URL(login, location.origin).searchParams.get("next") ?? undefined;
      rememberFavorite({ slug, save: true, destination });
      router.push(login);
      return;
    }
    if (!available) { setMessage("Favorites are temporarily unavailable. Please try again later."); return; }
    if (Object.hasOwn(unverifiedFavorites, slug)) { void checkFavorite({ slug, shouldSave: unverifiedFavorites[slug] }); return; }
    const shouldSave = !slugs.includes(slug);
    if (!beginChange(slug)) return;
    startTransition(() => {
      void setFavorite(slug, shouldSave).then(result => {
        if (result.status === "saved" || result.status === "removed") {
          confirmed.current.set(slug, result.status === "saved");
          notifyAccountChanged();
          setSlugs(current => result.status === "saved"
            ? current.includes(slug) ? current : [slug, ...current]
            : current.filter(item => item !== slug));
          setLastSavedSlug(result.status === "saved" ? slug : null);
          setMessage(result.status === "saved" ? "Saved to Favorites." : "Removed from Favorites.");
        } else if (result.status === "sign-in") {
          const login = favoriteLogin();
          const destination = new URL(login, location.origin).searchParams.get("next") ?? undefined;
          rememberFavorite({ slug, save: shouldSave, owner: accountId ?? undefined, destination });
          router.push(login);
        } else throw new Error(result.message ?? "Favorites could not be updated.");
      }).catch(() => checkFavorite({ slug, shouldSave })).finally(() => finishChange(slug));
    });
  };

  async function checkFavorite(attempt: { slug: string; shouldSave: boolean }) {
    const latest = await getCurrentFavorites().catch(() => null);
    if (!latest?.available || (accountId && latest.accountId !== accountId)) {
      setUnverifiedFavorites(current => ({ ...current, [attempt.slug]: attempt.shouldSave }));
      setMessage("We couldn’t confirm the change to Favorites. Check the saved favorite.");
      return;
    }
    const saved = latest.slugs.some(slug => slug === attempt.slug);
    confirmed.current.set(attempt.slug, saved);
    setSlugs(current => saved ? [...new Set([attempt.slug, ...current])] : current.filter(item => item !== attempt.slug));
    setUnverifiedFavorites(current => {
      const next = { ...current };
      delete next[attempt.slug];
      return next;
    });
    setLastSavedSlug(saved && saved === attempt.shouldSave ? attempt.slug : null);
    setMessage(saved === attempt.shouldSave ? saved ? "Saved to Favorites." : "Removed from Favorites." : "Showing the current saved favorite. The requested change wasn’t found.");
    notifyAccountChanged();
  }

  return <FavoritesContext.Provider value={{ slugs, isSignedIn, available, busySlugs, toggle }}>
    {children}
    {message ? <div role="status" className={`${popupStyles.notice} ${popupStyles.favoriteNotice} fixed bottom-4 left-4 right-4 z-[250] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border border-cyan-300/50 bg-[#052b4c] px-4 py-3 text-sm font-bold text-white shadow-2xl sm:left-auto sm:right-5`}>
      <span>{message}</span>{uncheckedSlug ? <button type="button" className="shrink-0 text-cyan-300 underline" onClick={() => void checkFavorite({ slug: uncheckedSlug, shouldSave: unverifiedFavorites[uncheckedSlug] })}>Check favorite</button> : handoffError ? <button type="button" className="shrink-0 text-cyan-300 underline" onClick={() => {
        syncedPending.current = false; setHandoffError(false); setMessage(""); setHandoffAttempt(attempt => attempt + 1);
      }}>Retry favorite</button> : message === "Saved to Favorites." && lastSavedSlug ? <Link href={`${accountRoutes.favorites}?item=${encodeURIComponent(lastSavedSlug)}`} className="shrink-0 text-cyan-300 underline">View</Link> : null}
    </div> : null}
  </FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("FavoritesProvider is missing");
  return context;
}
