"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, startTransition, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { setFavorite } from "@/lib/favorites/actions";
import { accountRoutes } from "@/lib/account/navigation";

const pendingKey = "zero-loss-pending-favorite-v1";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pendingMaxAge = 24 * 60 * 60 * 1000;

type FavoritesContextValue = {
  slugs: string[];
  isSignedIn: boolean;
  available: boolean;
  busySlug: string | null;
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

export function FavoritesProvider({ children, initialSlugs, isSignedIn, available }: { children: ReactNode; initialSlugs: string[]; isSignedIn: boolean; available: boolean }) {
  const router = useRouter();
  const [slugs, setSlugs] = useState(initialSlugs);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const syncedPending = useRef(false);
  const initialKey = initialSlugs.join("|");

  useEffect(() => {
    // A refreshed server tree or another device may have changed this account list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlugs(initialSlugs);
  }, [initialKey]); // eslint-disable-line react-hooks/exhaustive-deps

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
      void setFavorite(pending, true).then(result => {
        if (result.status === "saved") {
          sessionStorage.removeItem(pendingKey);
          setSlugs(current => current.includes(pending) ? current : [pending, ...current]);
          setMessage("Saved to Favorites.");
        } else setMessage(result.message ?? "Could not save this favorite. Please try again.");
      }).catch(() => setMessage("Could not save this favorite. Please try again."));
    });
  }, [available, initialSlugs, isSignedIn]);

  const toggle = (slug: string) => {
    if (!slugPattern.test(slug) || busySlug) return;
    if (!isSignedIn) {
      try { sessionStorage.setItem(pendingKey, JSON.stringify({ slug, savedAt: Date.now() })); } catch { /* Sign-in still works without storage. */ }
      router.push(`/login?next=${encodeURIComponent(accountRoutes.favorites)}`);
      return;
    }
    if (!available) { setMessage("Favorites are temporarily unavailable. Please try again later."); return; }
    const shouldSave = !slugs.includes(slug);
    setBusySlug(slug);
    startTransition(() => {
      void setFavorite(slug, shouldSave).then(result => {
        if (result.status === "saved" || result.status === "removed") {
          setSlugs(current => result.status === "saved"
            ? current.includes(slug) ? current : [slug, ...current]
            : current.filter(item => item !== slug));
          setMessage(result.status === "saved" ? "Saved to Favorites." : "Removed from Favorites.");
        } else if (result.status === "sign-in") {
          router.push(`/login?next=${encodeURIComponent(accountRoutes.favorites)}`);
        } else setMessage(result.message ?? "Favorites could not be updated.");
      }).catch(() => setMessage("Favorites could not be updated. Please try again.")).finally(() => setBusySlug(null));
    });
  };

  return <FavoritesContext.Provider value={{ slugs, isSignedIn, available, busySlug, toggle }}>
    {children}
    {message ? <div role="status" className="fixed bottom-4 left-4 right-4 z-[250] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border border-cyan-300/50 bg-[#052b4c] px-4 py-3 text-sm font-bold text-white shadow-2xl sm:left-auto sm:right-5">
      <span>{message}</span>{message === "Saved to Favorites." ? <Link href={accountRoutes.favorites} className="shrink-0 text-cyan-300 underline">View</Link> : null}
    </div> : null}
  </FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("FavoritesProvider is missing");
  return context;
}
