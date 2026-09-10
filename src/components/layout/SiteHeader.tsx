import Link from "next/link";
import Image from "next/image";
import { DesktopCategoryNav } from "@/components/layout/DesktopCategoryNav";
import { DesktopHeaderSearch } from "@/components/layout/DesktopHeaderSearch";
import { AccountDrawer } from "@/components/layout/AccountDrawer";
import { createClient } from "@/lib/supabase/server";
import { getPlayableBalanceLabel } from "@/lib/wallet/balance";

function HeaderTicketIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 54 36" className="h-[24px] w-[36px] overflow-visible sm:h-[30px] sm:w-[45px]" fill="none">
      <path d="M3 3h48v9a6 6 0 0 0 0 12v9H3v-9a6 6 0 0 0 0-12V3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="27" cy="18" r="7.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m20.5 25 13-14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function HeaderCreditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 54 36" className="h-[24px] w-[36px] overflow-visible sm:h-[30px] sm:w-[45px]" fill="none">
      <circle cx="18" cy="18" r="14.5" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="18" cy="18" r="7.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m11.5 25 13-14M37 10h13M39 18h11M37 26h13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

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
          <Link
            href={balanceLabel != null ? "/account/wallet" : "/signup"}
            aria-label="12 available tickets"
            className="inline-grid min-w-max grid-cols-[max-content_max-content] items-center gap-1.5 text-white transition-opacity hover:opacity-80 sm:gap-2.5"
          >
            <span className="grid h-[28px] w-[38px] shrink-0 place-items-center sm:h-[34px] sm:w-[48px]">
              <HeaderTicketIcon />
            </span>
            <span className="inline-flex h-[28px] min-w-[27px] w-fit items-center justify-center px-1 text-[14px] font-bold leading-none tabular-nums sm:h-[34px] sm:min-w-[34px] sm:px-1.5 sm:text-[20px] lg:text-[22px]">12</span>
          </Link>

          <Link
            href={balanceLabel != null ? "/account/wallet" : "/signup"}
            aria-label="$247 credit value"
            className="inline-grid min-w-max grid-cols-[max-content_max-content] items-center gap-1.5 text-white transition-opacity hover:opacity-80 sm:gap-2"
          >
            <span className="grid h-[28px] w-[38px] shrink-0 place-items-center sm:h-[34px] sm:w-[48px]">
              <HeaderCreditIcon />
            </span>
            <span className="inline-flex h-[28px] min-w-[45px] w-fit items-center justify-center px-1 text-[14px] font-bold leading-none tabular-nums sm:h-[34px] sm:min-w-[64px] sm:px-1.5 sm:text-[20px] lg:text-[22px]">$247</span>
          </Link>

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
    </header>
  );
}
