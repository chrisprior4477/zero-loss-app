import Link from "next/link";
import Image from "next/image";
import { DesktopCategoryNav } from "@/components/layout/DesktopCategoryNav";
import { DesktopHeaderSearch } from "@/components/layout/DesktopHeaderSearch";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { AccountModeSwitch } from "@/components/layout/AccountModeSwitch";
import { HeaderAccountMetrics } from "@/components/layout/HeaderAccountMetrics";
import { createClient } from "@/lib/supabase/server";
import { getPlayableBalanceLabel } from "@/lib/wallet/balance";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balanceLabel: string | null = null;

  if (user) {
    try {
      balanceLabel = await getPlayableBalanceLabel(user.id);
    } catch {
      // Header must stay up even if ledger read fails; keep placeholder.
      balanceLabel = null;
    }
  }

  const displayName = user
    ? String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Account")
    : "Chris P.";

  return (
    // Blur lives on a non-interactive underlay — not on <header> itself — so
    // sticky + backdrop-filter does not create a containing/stacking context
    // that traps or breaks taps on header controls (esp. iOS Safari).
    <header className="relative sticky top-0 z-40 bg-[var(--header)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 backdrop-blur supports-[backdrop-filter]:bg-[var(--header)]/90"
      />
      <div className="relative z-10 flex h-[60px] w-full items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:gap-6 xl:px-6">
        <Link href="/" className="shrink-0" aria-label="ZeroLoss home">
          <Image
            src="/zeroloss-logo.svg"
            alt=""
            width={174}
            height={32}
            className="h-5 w-auto sm:h-[28px] lg:h-[32px]"
            priority
          />
        </Link>

        <div className="hidden min-w-0 max-w-[640px] flex-1 md:flex xl:max-w-[700px]">
          <DesktopHeaderSearch />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-4 lg:gap-5">
          <HeaderAccountMetrics isSignedIn={Boolean(user)} liveBalance={balanceLabel} />
          <AccountDrawer isSignedIn={Boolean(user)} displayName={displayName} />
        </div>
      </div>

      <div className="relative z-10 flex h-[52px] items-center border-t border-white/8 px-3 md:hidden">
        <DesktopHeaderSearch />
      </div>

      <div className="relative z-10 flex h-12 w-full items-center overflow-visible border-t border-white/8 bg-[var(--header)] px-0 sm:px-2 lg:px-4 xl:px-6">
        <DesktopCategoryNav />
      </div>

      <div
        aria-hidden="true"
        className="h-[3px] w-full"
        style={{ background: "var(--brand-rule)" }}
      />
      <AccountModeSwitch isSignedIn={Boolean(user)} />
    </header>
  );
}
