import Link from "next/link";
import { MainNav } from "@/components/layout/MainNav";
import { MobileNav } from "@/components/layout/MobileNav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <Link
            href="/"
            className="shrink-0 text-lg font-semibold tracking-tight text-[var(--foreground)]"
          >
            ZeroLoss
          </Link>
          <MainNav className="hidden md:block" />
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <label className="sr-only" htmlFor="shell-search">
            Search
          </label>
          <input
            id="shell-search"
            type="search"
            disabled
            placeholder="Search coming soon"
            aria-disabled="true"
            className="w-full max-w-md cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] placeholder:text-[var(--muted)]"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className="hidden rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] sm:inline-flex"
            title="Wallet balances will appear here in a later release"
          >
            Wallet · Coming soon
          </span>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Sign in will be available in a later release"
            className="cursor-not-allowed rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--muted)] opacity-70"
          >
            Sign in
          </button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
