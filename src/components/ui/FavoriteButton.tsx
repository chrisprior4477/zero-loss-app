"use client";

import { useState } from "react";

type FavoriteButtonProps = {
  itemName: string;
  className?: string;
};

export function FavoriteButton({ itemName, className = "" }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <button
      type="button"
      aria-label={`${isFavorite ? "Remove" : "Add"} ${itemName} ${
        isFavorite ? "from" : "to"
      } favorites`}
      aria-pressed={isFavorite}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsFavorite((current) => !current);
      }}
      className={`grid h-8 w-8 place-items-center text-[24px] leading-none transition-all hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--live)] ${
        isFavorite ? "text-[var(--live)]" : "text-[#087feb]"
      } ${className}`}
    >
      <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span>
    </button>
  );
}
