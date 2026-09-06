import Link from "next/link";
import Image from "next/image";
import { DesktopCategoryNav } from "@/components/layout/DesktopCategoryNav";
import { DesktopHeaderSearch } from "@/components/layout/DesktopHeaderSearch";
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

        <div className="hidden min-w-0 flex-1 md:flex">
          <DesktopHeaderSearch />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-4 lg:gap-5">
          <Link
            href={balanceLabel != null ? "/account/wallet" : "/signup"}
            aria-label="12 available tickets"
            className="flex items-center gap-1 text-white transition-opacity hover:opacity-80 sm:gap-2.5"
          >
            <span
              aria-hidden="true"
              className="inline-block h-[28px] w-[34px] shrink-0 bg-[url('/header-ticket-credit-icons.png')] bg-no-repeat mix-blend-screen sm:w-[42px]"
              style={{
                backgroundSize: "95px 43px",
                backgroundPosition: "-5px -6px",
              }}
            />
            <span className="text-[17px] font-bold leading-none tabular-nums sm:text-[20px] lg:text-[22px]">12</span>
          </Link>

          <Link
            href={balanceLabel != null ? "/account/wallet" : "/signup"}
            aria-label="$247 credit value"
            className="flex items-center gap-1.5 text-white transition-opacity hover:opacity-80"
          >
            <span
              aria-hidden="true"
              className="inline-block h-[30px] w-[34px] shrink-0 bg-[url('/header-ticket-credit-icons.png')] bg-no-repeat mix-blend-screen sm:w-[42px]"
              style={{
                backgroundSize: "95px 43px",
                backgroundPosition: "-54px -4px",
              }}
            />
            <span className="text-[17px] font-bold leading-none tabular-nums sm:text-[20px] lg:text-[22px]">$247</span>
          </Link>

          <Link
            href="/about"
            aria-label="Open menu"
            className="grid h-8 w-8 place-items-center rounded-md text-white/75 transition-colors hover:bg-white/8 hover:text-white"
          >
            <span aria-hidden="true" className="flex w-[17px] flex-col gap-[3px]">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
            </span>
          </Link>
        </div>
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
