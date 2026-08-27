"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  categorySubcategories,
  homeCategories,
} from "@/lib/home/placeholder-data";

/**
 * Horizontal category strip with subcategory dropdowns (homepage spec §7),
 * built to the Checkpoint 2 artboards.
 *
 * Interaction model: TAP/CLICK to open, not hover. The desktop artboard (2a)
 * opens its menus on hover and the mobile artboard (5a) opens the same menus
 * on tap; a hover-only menu is unreachable on a phone, so the tap behaviour is
 * the one implemented for every pointer type.
 *
 * Positioning note, and the reason the panel is NOT a child of the chip: the
 * chip rail is an overflow-x:auto scroller, so anything absolutely positioned
 * inside it is clipped at the rail's edge. The artboards solve this the same
 * way — the panels are siblings of the scroller inside a position:relative
 * wrapper, placed with a measured offset. The offset is recalculated when the
 * rail scrolls or the viewport resizes.
 *
 * Touch targets are a minimum of 44px, on the chips and on the menu rows. The
 * artboard's own rows are ~31px tall; that was raised deliberately, because an
 * under-sized target is exactly what made the previous version of this control
 * feel dead on a real phone.
 */

const MENU_WIDTH = 210;

export function CategoryNav() {
  const [activeCategory, setActiveCategory] = useState<string>(
    homeCategories[0]
  );
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [menuLeft, setMenuLeft] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const positionMenu = useCallback((category: string) => {
    const wrapper = wrapperRef.current;
    const chip = chipRefs.current[category];
    if (!wrapper || !chip) return;

    const wrapperBox = wrapper.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    const maxLeft = Math.max(0, wrapperBox.width - MENU_WIDTH);
    setMenuLeft(Math.min(Math.max(0, chipBox.left - wrapperBox.left), maxLeft));
  }, []);

  useLayoutEffect(() => {
    if (openCategory) positionMenu(openCategory);
  }, [openCategory, positionMenu]);

  useEffect(() => {
    if (!openCategory) return;

    const reposition = () => positionMenu(openCategory);
    const rail = railRef.current;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenCategory(null);
        chipRefs.current[openCategory]?.focus();
      }
    };

    rail?.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      rail?.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openCategory, positionMenu]);

  const openSubcategories = openCategory
    ? categorySubcategories[openCategory]
    : undefined;

  return (
    <nav aria-label="Categories" className="bg-[var(--surface)]">
      <div ref={wrapperRef} className="relative mx-auto max-w-6xl">
        <ul
          ref={railRef}
          className="zl-noscroll flex items-center gap-2 overflow-x-auto px-4 py-1.5 sm:px-6 lg:px-8"
        >
          {homeCategories.map((category) => {
            const isActive = category === activeCategory;
            const isOpen = category === openCategory;
            const hasMenu = Boolean(categorySubcategories[category]);
            /* The artboards give the leading merchandising chip a green
               outlined treatment rather than the taxonomy chips. style. */
            const isMerchandising = category === "Ending Soon";

            return (
              <li key={category} className="shrink-0">
                <button
                  type="button"
                  ref={(node) => {
                    chipRefs.current[category] = node;
                  }}
                  aria-pressed={isActive}
                  aria-expanded={hasMenu ? isOpen : undefined}
                  aria-haspopup={hasMenu ? "menu" : undefined}
                  onClick={() => {
                    setActiveCategory(category);
                    setOpenCategory((current) =>
                      !hasMenu || current === category ? null : category
                    );
                  }}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[12.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                    isMerchandising
                      ? "border-[1.5px] border-[var(--live)] text-[var(--live)] zl-pulse-live"
                      : isActive
                        ? "bg-[var(--accent)] text-[var(--ink)]"
                        : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {category}
                  {hasMenu ? (
                    <span
                      aria-hidden="true"
                      className={`text-[9px] leading-none transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {openCategory && openSubcategories ? (
          <div
            role="menu"
            aria-label={`${openCategory} subcategories`}
            style={{ left: menuLeft, width: MENU_WIDTH }}
            className="absolute top-full z-50 max-w-[calc(100vw-1.25rem)] overflow-hidden rounded-b-xl bg-[var(--surface)] py-2 shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
          >
            {openSubcategories.map((subcategory) => (
              <Link
                key={subcategory}
                href="/browse"
                role="menuitem"
                onClick={() => setOpenCategory(null)}
                className="flex min-h-[44px] items-center whitespace-nowrap border-l-2 border-transparent px-[18px] text-[13px] font-medium text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[rgba(255,255,255,0.08)] focus-visible:border-[var(--accent)] focus-visible:bg-[rgba(255,255,255,0.08)] focus-visible:outline-none"
              >
                {subcategory}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
