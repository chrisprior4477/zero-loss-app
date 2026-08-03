import Link from "next/link";
import { MainNav } from "@/components/layout/MainNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { HeaderAuthControls } from "@/components/layout/HeaderAuthControls";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("legal_first_name")
      .eq("customer_id", user.id)
      .maybeSingle();

    firstName = profile?.legal_first_name ?? "there";
  }

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
          <HeaderAuthControls firstName={firstName} />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
