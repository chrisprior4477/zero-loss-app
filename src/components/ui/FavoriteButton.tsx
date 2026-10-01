"use client";

import { useFavorites } from "@/components/favorites/FavoritesProvider";
import { favoriteSlugFromHref } from "@/lib/favorites/navigation";

type FavoriteButtonProps = {
  itemName: string;
  itemHref: string;
  className?: string;
  size?: "compact" | "large";
};

export function FavoriteButton({ itemName, itemHref, className = "", size = "compact" }: FavoriteButtonProps) {
  const { slugs, isSignedIn, busySlug, toggle } = useFavorites();
  const slug = favoriteSlugFromHref(itemHref);
  if (!slug) return null;
  const isFavorite = slugs.includes(slug);
  const busy = busySlug === slug;

  return (
    <button
      type="button"
      aria-label={isSignedIn ? `${isFavorite ? "Remove" : "Add"} ${itemName} ${isFavorite ? "from" : "to"} favorites` : `Sign in to save ${itemName} to favorites`}
      aria-pressed={isFavorite}
      aria-busy={busy}
      disabled={busy}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(slug);
      }}
      className={`grid place-items-center rounded-full bg-white/90 leading-none shadow-[0_2px_10px_rgba(0,19,46,.18)] transition-all hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#087feb] ${size === "large" ? "h-11 w-11 text-[29px]" : "h-8 w-8 text-[24px]"} ${
        isFavorite ? "text-[var(--live)]" : "text-[#087feb]"
      } ${className}`}
    >
      <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
    </button>
  );
}
