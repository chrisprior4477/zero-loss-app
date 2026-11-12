"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  toggle: (slug: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readPendingFavorite(): string | null {
  try {
    const raw = sessionStorage.getItem(pendingKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && "slug" in value && "savedAt" in value &&
      typeof value.slug === "string" && slugPattern.test(value.slug) &&
      typeof value.savedAt === "number" && value.savedAt <= Date.now() && Date.now() - value.savedAt < pendingMaxAge) return value.slug;
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
  const syncedPending = useRef(false);

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
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!isSignedIn || !available || syncedPending.current) return;
    syncedPending.current = true;
    const pending = readPendingFavorite();
    if (!pending) return;
    if (initialSlugs.includes(pending)) { sessionStorage.removeItem(pendingKey); return; }
    // The guest explicitly tapped Save. The server rechecks catalog membership and ownership.
    startTransition(() => {
      if (!beginChange(pending)) return;
      void setFavorite(pending, true).then(result => {
        if (result.status === "saved") {
          confirmed.current.set(pending, true);
          notifyAccountChanged();
          sessionStorage.removeItem(pendingKey);
          setSlugs(current => current.includes(pending) ? current : [pending, ...current]);
          setMessage("Saved to Favorites.");
        } else setMessage(result.message ?? "Could not save this favorite. Please try again.");
      }).catch(() => setMessage("Could not save this favorite. Please try again.")).finally(() => finishChange(pending));
    });
  }, [available, initialSlugs, isSignedIn]);

  const toggle = (slug: string) => {
    if (!slugPattern.test(slug) || inFlight.current.has(slug)) return;
    if (!isSignedIn) {
      try { sessionStorage.setItem(pendingKey, JSON.stringify({ slug, savedAt: Date.now() })); } catch { /* Sign-in still works without storage. */ }
      router.push(`/login?next=${encodeURIComponent(accountRoutes.favorites)}`);
      return;
    }
    if (!available) { setMessage("Favorites are temporarily unavailable. Please try again later."); return; }
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
          setMessage(result.status === "saved" ? "Saved to Favorites." : "Removed from Favorites.");
        } else if (result.status === "sign-in") {
          router.push(`/login?next=${encodeURIComponent(accountRoutes.favorites)}`);
        } else setMessage(result.message ?? "Favorites could not be updated.");
      }).catch(() => setMessage("Favorites could not be updated. Please try again.")).finally(() => finishChange(slug));
    });
  };

  return <FavoritesContext.Provider value={{ slugs, isSignedIn, available, busySlugs, toggle }}>
    {children}
    {message ? <div role="status" className={`${popupStyles.notice} ${popupStyles.favoriteNotice} fixed bottom-4 left-4 right-4 z-[250] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border border-cyan-300/50 bg-[#052b4c] px-4 py-3 text-sm font-bold text-white shadow-2xl sm:left-auto sm:right-5`}>
      <span>{message}</span>{message === "Saved to Favorites." ? <Link href={accountRoutes.favorites} className="shrink-0 text-cyan-300 underline">View</Link> : null}
    </div> : null}
  </FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("FavoritesProvider is missing");
  return context;
}
