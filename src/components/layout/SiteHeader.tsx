import Link from "next/link";
import Image from "next/image";
import { MainNav } from "@/components/layout/MainNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { DesktopCategoryNav } from "@/components/layout/DesktopCategoryNav";
import { DesktopHeaderSearch } from "@/components/layout/DesktopHeaderSearch";
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
    <header className="relative sticky top-0 z-40 bg-[var(--header)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 backdrop-blur supports-[backdrop-filter]:bg-[var(--header)]/90"
      />
      <div className="relative z-10 mx-auto grid h-16 max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:hidden">
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

      <div className="relative z-10 hidden h-[60px] w-full items-center gap-6 px-4 lg:flex xl:px-6">
        <Link href="/" className="shrink-0" aria-label="ZeroLoss home">
          <Image
            src="/zeroloss-logo.svg"
            alt=""
            width={174}
            height={32}
            className="h-[32px] w-auto"
            priority
          />
        </Link>

        <DesktopHeaderSearch />

        <div className="flex shrink-0 items-center gap-5">
          <Link
            href={balanceLabel != null ? "/account/wallet" : "/signup"}
            aria-label="12 available tickets"
            className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-80"
          >
            <span
              aria-hidden="true"
              className="inline-block h-[28px] w-[42px] shrink-0 bg-[url('/header-ticket-credit-icons.png')] bg-no-repeat mix-blend-screen"
              style={{
                backgroundSize: "95px 43px",
                backgroundPosition: "-5px -6px",
              }}
            />
            <span className="text-[22px] font-bold leading-none tabular-nums">12</span>
          </Link>

          <Link
            href={balanceLabel != null ? "/account/wallet" : "/signup"}
            aria-label="$247 credit value"
            className="flex items-center gap-1.5 text-white transition-opacity hover:opacity-80"
          >
            <span
              aria-hidden="true"
              className="inline-block h-[30px] w-[42px] shrink-0 bg-[url('/header-ticket-credit-icons.png')] bg-no-repeat mix-blend-screen"
              style={{
                backgroundSize: "95px 43px",
                backgroundPosition: "-54px -4px",
              }}
            />
            <span className="text-[22px] font-bold leading-none tabular-nums">$247</span>
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

      <div className="relative z-10 hidden h-12 w-full items-center border-t border-white/8 bg-[var(--header)] px-4 lg:flex xl:px-6">
        <DesktopCategoryNav />
      </div>

      {/* 4-stop brand rule separating the header from the category strip. */}
      <div
        aria-hidden="true"
        className="h-[3px] w-full lg:hidden"
        style={{ background: "var(--brand-rule)" }}
      />
    </header>
  );
}
