"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { MainNav } from "@/components/layout/MainNav";
import { signOutAction } from "@/lib/auth/actions";

type MobileNavProps = {
  isSignedIn: boolean;
};

/**
 * Mobile menu uses a checkbox + <label> disclosure — the same reliability
 * class as <a href>: the browser toggles it from a tap with no React
 * onClick / controlled open attribute required.
 *
 * Panel is position:fixed in-flow (not portaled). Safe now that backdrop-blur
 * is no longer on <header> (that was the containing-block clip).
 */
export function MobileNav({ isSignedIn }: MobileNavProps) {
  const reactId = useId();
  const toggleId = `mobile-nav-toggle-${reactId.replace(/:/g, "")}`;
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkbox = checkboxRef.current;
    if (!checkbox) return;

    const syncOverflow = () => {
      document.body.style.overflow = checkbox.checked ? "hidden" : "";
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && checkbox.checked) {
        checkbox.checked = false;
        syncOverflow();
      }
    };

    checkbox.addEventListener("change", syncOverflow);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      checkbox.removeEventListener("change", syncOverflow);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, []);

  const closeMenu = () => {
    const checkbox = checkboxRef.current;
    if (!checkbox) return;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const linkClassName =
    "block rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]";

  return (
    <div className="relative z-50 md:hidden">
      {/*
        Do not use display:none — iOS will not activate a label target that is
        display:none. sr-only keeps it in the a11y/hit model for the label.
      */}
      <input
        ref={checkboxRef}
        id={toggleId}
        type="checkbox"
        className="peer sr-only"
        aria-controls="mobile-nav-panel"
      />
      <label
        htmlFor={toggleId}
        className="relative z-50 flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)] peer-checked:[&_[data-icon=open]]:hidden peer-checked:[&_[data-icon=close]]:flex"
      >
        <span className="sr-only">Menu</span>
        <span
          data-icon="open"
          aria-hidden="true"
          className="pointer-events-none flex flex-col gap-1.5"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </span>
        <span
          data-icon="close"
          aria-hidden="true"
          className="pointer-events-none hidden flex-col gap-1.5"
        >
          <span className="block h-0.5 w-5 origin-center translate-y-2 rotate-45 bg-current" />
          <span className="block h-0.5 w-5 opacity-0 bg-current" />
          <span className="block h-0.5 w-5 origin-center -translate-y-2 -rotate-45 bg-current" />
        </span>
      </label>

      {/*
        Closed: pointer-events-none so this layer cannot intercept taps on the
        hamburger (or anything else) while unchecked.
      */}
      <div
        id="mobile-nav-panel"
        className="pointer-events-none fixed inset-0 z-[100] hidden peer-checked:pointer-events-auto peer-checked:block"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <label
          htmlFor={toggleId}
          className="absolute inset-0 cursor-pointer bg-black/60"
          aria-label="Close menu"
        />
        <div className="absolute inset-y-0 right-0 flex h-dvh w-[min(100%,20rem)] flex-col border-l border-[var(--border)] bg-[var(--background)] shadow-xl">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Menu
            </p>
            <label
              htmlFor={toggleId}
              className="cursor-pointer touch-manipulation rounded-md px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
            >
              Close
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <MainNav onNavigate={closeMenu} />
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              {isSignedIn ? (
                <ul className="flex flex-col gap-1">
                  <li>
                    <Link
                      href="/account"
                      className={linkClassName}
                      onClick={closeMenu}
                    >
                      Account
                    </Link>
                  </li>
                  <li>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className={`${linkClassName} w-full cursor-pointer touch-manipulation text-left`}
                      >
                        Sign out
                      </button>
                    </form>
                  </li>
                </ul>
              ) : (
                <ul className="flex flex-col gap-1">
                  <li>
                    <Link
                      href="/login"
                      className={linkClassName}
                      onClick={closeMenu}
                    >
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/signup"
                      className={linkClassName}
                      onClick={closeMenu}
                    >
                      Sign up
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
