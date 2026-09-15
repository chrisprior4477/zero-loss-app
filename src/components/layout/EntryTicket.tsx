/** Same artwork, proportions and count weight in the homepage and drawer. */
export function EntryTicket({ count }: { count: number | null }) {
  return <span className="inline-flex shrink-0 items-center gap-1.5 text-white">
    <svg aria-hidden="true" viewBox="0 0 54 36" className="h-6 w-9 shrink-0" fill="none"><path d="M3 3h48v9a6 6 0 0 0 0 12v9H3v-9a6 6 0 0 0 0-12V3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /><circle cx="27" cy="18" r="7.5" stroke="currentColor" strokeWidth="2.2" /><path d="m20.5 25 13-14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
    <span className="text-lg font-bold tabular-nums">{count ?? "—"}</span>
  </span>;
}
