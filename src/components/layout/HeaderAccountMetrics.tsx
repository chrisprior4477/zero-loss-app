"use client";

import Link from "next/link";
import { openEntriesHref, walletHistoryHref, type AccountActivity } from "@/lib/account/activity";
import { EntryTicket } from "@/components/layout/EntryTicket";

function CreditIcon() {
  return <svg aria-hidden="true" viewBox="0 0 54 36" className="h-6 w-9 sm:h-[30px] sm:w-[45px]" fill="none"><circle cx="18" cy="18" r="14.5" stroke="currentColor" strokeWidth="2.4" /><circle cx="18" cy="18" r="7.5" stroke="currentColor" strokeWidth="2.2" /><path d="m11.5 25 13-14M37 10h13M39 18h11M37 26h13" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>;
}

export function HeaderAccountMetrics({
  isSignedIn,
  liveBalance,
  activityState,
}: {
  isSignedIn: boolean;
  liveBalance: string | null;
  activityState: AccountActivity;
}) {
  const state = activityState;

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="grid min-h-9 place-items-center px-2 text-xs font-bold text-white sm:px-3 sm:text-sm">Sign in</Link>
        <Link href="/signup" className="grid min-h-9 place-items-center rounded-full bg-cyan-300 px-3 text-xs font-black text-[#00132e] hover:bg-cyan-200 sm:px-4 sm:text-sm">Create account</Link>
      </div>
    );
  }

  const ticketCount = state.activeCount;
  const ticketLabel = ticketCount === null ? "Active entries unavailable" : `${ticketCount} active ${ticketCount === 1 ? "entry" : "entries"}`;
  const balance = liveBalance ?? "Unavailable";

  return (
    <>
      <Link href={openEntriesHref} title={ticketLabel} aria-label={ticketLabel} className="inline-flex items-center text-white hover:opacity-80">
        <EntryTicket count={ticketCount} />
      </Link>
      <Link href={walletHistoryHref} aria-label={`${balance} playable balance`} className="inline-grid grid-cols-[max-content_max-content] items-center gap-1 text-white hover:opacity-80 sm:gap-2">
        <CreditIcon />
        <span className="text-sm font-bold tabular-nums sm:text-xl">{balance}</span>
      </Link>
    </>
  );
}
