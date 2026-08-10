import Link from "next/link";
import Image from "next/image";
import { MainNav } from "@/components/layout/MainNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { HeaderAuthControls } from "@/components/layout/HeaderAuthControls";
import { WalletBalanceDisplay } from "@/components/layout/WalletBalanceDisplay";
import { createClient } from "@/lib/supabase/server";
import { getPlayableBalanceLabel } from "@/lib/wallet/balance";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let firstName: string | null = null;
  let balanceLabel: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("legal_first_name")
      .eq("customer_id", user.id)
      .maybeSingle();

    firstName = profile?.legal_first_name ?? "there";

    try {
      balanceLabel = await getPlayableBalanceLabel(user.id);
    } catch {
      // Header must stay up even if ledger read fails; keep placeholder.
      balanceLabel = null;
    }
  }

  const isSignedIn = Boolean(firstName);

  return (
    // Blur lives on a non-interactive underlay — not on <header> itself — so
    // sticky + backdrop-filter does not create a containing/stacking context
    // that traps or breaks taps on header controls (esp. iOS Safari).
    <header className="relative sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/80"
      />
      {/*
        Two-column grid below lg (search is display:none and out of flow).
        Logo column uses pointer-events-none so any overflow cannot steal taps
        from the controls column on real mobile viewports.
      */}
      <div className="relative z-10 mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)_auto] lg:px-8">
        <div className="pointer-events-none relative z-0 flex min-w-0 items-center gap-4 overflow-hidden md:gap-6">
          <Link
            href="/"
            className="pointer-events-auto relative z-0 block min-w-0 max-w-full overflow-hidden"
            aria-label="ZeroLoss home"
          >
            <Image
              src="/zeroloss-logo.svg"
              alt=""
              width={174}
              height={32}
              className="h-5 w-auto max-w-full object-contain object-left sm:h-6 md:h-8"
              style={{ width: "auto", maxWidth: "100%" }}
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 174px"
              priority
            />
          </Link>
          <MainNav className="pointer-events-auto hidden shrink-0 md:block" />
        </div>

        <div className="relative z-0 hidden min-w-0 lg:block">
          <label className="sr-only" htmlFor="shell-search">
            Search
          </label>
          <input
            id="shell-search"
            type="search"
            disabled
            placeholder="Search coming soon"
            aria-disabled="true"
            className="w-full cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] placeholder:text-[var(--muted)]"
          />
        </div>

        <div className="relative z-50 flex items-center justify-end gap-1.5 sm:gap-2">
          {isSignedIn && balanceLabel != null ? (
            <WalletBalanceDisplay
              balanceLabel={balanceLabel}
              href="/account/wallet"
              className="hidden md:inline-flex"
            />
          ) : (
            <WalletBalanceDisplay
              balanceLabel={null}
              className="hidden xl:inline-flex"
            />
          )}
          <div className="hidden md:block">
            <HeaderAuthControls firstName={firstName} />
          </div>
          <MobileNav isSignedIn={isSignedIn} balanceLabel={balanceLabel} />
        </div>
      </div>
    </header>
  );
}
