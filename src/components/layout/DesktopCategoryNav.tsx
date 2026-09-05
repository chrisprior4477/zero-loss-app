"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { categorySubcategories } from "@/lib/home/placeholder-data";

const desktopCategories = [
  "Ending Soon",
  "Everyday Items",
  "Groceries",
  "Gas",
  "Electronics",
  "Gift Cards",
  "Home Essentials",
] as const;

const desktopCategoryItems: Record<string, readonly string[]> = {
  ...categorySubcategories,
  Groceries: [
    "Grocery Gift Cards",
    "Meal Kits",
    "Coffee & Tea",
    "Snack Boxes",
    "Beverages",
    "Pantry Staples",
    "Fresh Produce Credit",
    "Bulk Essentials",
    "Convenience Bundles",
  ],
  Gas: [
    "Gas Cards",
    "Fuel Rewards",
    "Road-Trip Bundles",
    "Convenience Store Credit",
    "Car Washes",
    "EV Charging",
  ],
};

export function DesktopCategoryNav() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openCategory) return;

    const closeOutside = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenCategory(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenCategory(null);
    };

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openCategory]);

  return (
    <nav
      ref={navRef}
      aria-label="Marketplace categories"
      className="min-w-0 self-stretch flex-1"
      onMouseLeave={() => setOpenCategory(null)}
    >
      <ul className="flex h-full items-center justify-center gap-1 xl:gap-2">
        {desktopCategories.map((category, index) => {
          const isOpen = openCategory === category;
          const isEndingSoon = index === 0;
          const items = desktopCategoryItems[category] ?? [];

          return (
            <li
              key={category}
              className="flex h-full shrink-0 items-center"
              onMouseEnter={() => setOpenCategory(category)}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="menu"
                onFocus={() => setOpenCategory(category)}
                onClick={() =>
                  setOpenCategory((current) =>
                    current === category ? null : category
                  )
                }
                className={
                  isEndingSoon
                    ? "inline-flex h-8 items-center rounded-full bg-[var(--urgent)] px-4 text-[16px] font-medium text-white shadow-[0_2px_0_rgba(0,0,0,0.14)] transition-colors hover:bg-[#ff7a24]"
                    : "inline-flex h-7 items-center rounded-md px-2 text-[16px] font-medium text-white/90 transition-colors hover:bg-white/8 hover:text-white"
                }
              >
                {category}
              </button>

              {isOpen ? (
                <div
                  role="menu"
                  aria-label={`${category} menu`}
                  className="fixed left-0 top-[108px] z-50 w-screen border-y border-white/10 bg-[#00132e]/[0.98] px-[clamp(3rem,8vw,10rem)] py-7 shadow-[0_22px_48px_rgba(0,0,0,0.42)] backdrop-blur-md"
                >
                  <div className="mx-auto max-w-[1440px]">
                    <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                      {category}
                    </p>
                    <div className="grid grid-cols-3 gap-x-10 gap-y-1 xl:grid-cols-4">
                      {items.map((item) => (
                      <Link
                        key={item}
                        href="/browse"
                        role="menuitem"
                        onClick={() => setOpenCategory(null)}
                        className="flex min-h-11 items-center border-b border-white/8 px-1 text-[16px] font-medium text-white/85 transition-colors hover:border-[var(--accent)] hover:text-white focus-visible:border-[var(--accent)] focus-visible:text-white focus-visible:outline-none"
                      >
                        {item}
                      </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
