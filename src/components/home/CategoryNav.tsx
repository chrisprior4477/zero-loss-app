"use client";

import { useState } from "react";
import { homeCategories } from "@/lib/home/placeholder-data";

/**
 * Horizontal category strip (homepage spec §7).
 *
 * Replaces the previous non-interactive <span> chips with real buttons so the
 * control is keyboard reachable and announces its state (§29). Selection is
 * local visual state only — it does NOT filter the discovery grid yet.
 *
 * Wiring §18 ("filtering updates results without a full page reload") needs
 * real catalog data behind the grid; until then, lifting this state into
 * page.tsx would force the whole homepage into a client component for no
 * user-visible gain.
 */
export function CategoryNav() {
  const [activeCategory, setActiveCategory] = useState<string>(
    homeCategories[0]
  );

  return (
    <nav aria-label="Categories">
      <ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {homeCategories.map((category) => {
          const isActive = category === activeCategory;
          return (
            <li key={category} className="shrink-0">
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(category)}
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  isActive
                    ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:text-[var(--foreground)]"
                }`}
              >
                {category}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
