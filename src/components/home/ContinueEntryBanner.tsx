"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearEntryIntent, productEntryHref, readEntryIntent, type EntryIntent } from "@/lib/entries/return-intent";

export function ContinueEntryBanner() {
  const [intent, setIntent] = useState<EntryIntent | null>(null);

  useEffect(() => {
    // Session storage is a browser-only navigation hint, not an entry record.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntent(readEntryIntent());
  }, []);

  if (!intent) return null;

  return <aside aria-label="Continue your entry" className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-300/35 bg-[#072c4c] px-4 py-3 text-white shadow-[0_8px_24px_rgba(0,0,0,.18)] sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-cyan-300">Pick up where you left off</p>
      <p className="mt-1 truncate text-sm font-bold sm:text-base">{intent.title} <span className="font-medium text-[#b5cce4]">· {intent.quantity} {intent.quantity === 1 ? "entry" : "entries"}</span></p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <Link href={productEntryHref(intent.slug, intent.quantity)} className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#31e800] px-4 text-sm font-extrabold text-[#002719] sm:flex-none">Continue your entry <span aria-hidden="true" className="ml-2">→</span></Link>
      <button type="button" aria-label="Dismiss continue entry prompt" onClick={() => { clearEntryIntent(); setIntent(null); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-cyan-300/40 text-xl text-cyan-100">×</button>
    </div>
  </aside>;
}
