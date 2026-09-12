"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountModeFromPath } from "@/lib/account/mode";

function TicketIcon() {
  return <svg aria-hidden="true" viewBox="0 0 54 36" className="h-6 w-9 sm:h-[30px] sm:w-[45px]" fill="none"><path d="M3 3h48v9a6 6 0 0 0 0 12v9H3v-9a6 6 0 0 0 0-12V3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /><circle cx="27" cy="18" r="7.5" stroke="currentColor" strokeWidth="2.2" /><path d="m20.5 25 13-14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>;
}

function CreditIcon() {
  return <svg aria-hidden="true" viewBox="0 0 54 36" className="h-6 w-9 sm:h-[30px] sm:w-[45px]" fill="none"><circle cx="18" cy="18" r="14.5" stroke="currentColor" strokeWidth="2.4" /><circle cx="18" cy="18" r="7.5" stroke="currentColor" strokeWidth="2.2" /><path d="m11.5 25 13-14M37 10h13M39 18h11M37 26h13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>;
}

export function HeaderAccountMetrics({
  isSignedIn,
  liveBalance,
}: {
  isSignedIn: boolean;
  liveBalance: string | null;
}) {
  const pathname = usePathname();

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="grid min-h-9 place-items-center px-2 text-xs font-bold text-white sm:px-3 sm:text-sm">Sign in</Link>
        <Link href="/signup" className="grid min-h-9 place-items-center rounded-full bg-cyan-300 px-3 text-xs font-black text-[#00132e] hover:bg-cyan-200 sm:px-4 sm:text-sm">Create account</Link>
      </div>
    );
  }

  const isDemo = pathname.startsWith("/account") && accountModeFromPath(pathname) === "demo";
  const ticketCount = isDemo ? "12" : "0";
  const balance = isDemo ? "$247" : liveBalance ?? "$0.00";
  const walletHref = isDemo ? "/account/preview/wallet" : "/account/wallet";

  return (
    <>
      <Link href={isDemo ? "/account/preview/entries" : "/account/entries"} aria-label={`${ticketCount} available tickets`} className="inline-grid grid-cols-[max-content_max-content] items-center gap-1 text-white hover:opacity-80 sm:gap-2">
        <TicketIcon />
        <span className="text-sm font-bold tabular-nums sm:text-xl">{ticketCount}</span>
      </Link>
      <Link href={walletHref} aria-label={`${balance} playable balance`} className="inline-grid grid-cols-[max-content_max-content] items-center gap-1 text-white hover:opacity-80 sm:gap-2">
        <CreditIcon />
        <span className="text-sm font-bold tabular-nums sm:text-xl">{balance}</span>
      </Link>
    </>
  );
}
