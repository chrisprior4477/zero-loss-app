/** Shared ticket artwork; the mobile header selects the narrower outline only. */
export function EntryTicket({ count }: { count: number | null }) {
  return <span className="inline-flex shrink-0 items-center gap-1.5 text-white">
    <svg data-entry-ticket-icon aria-hidden="true" viewBox="0 0 54 36" className="h-6 w-9 shrink-0" fill="none">
      <path data-entry-ticket-outline="standard" d="M3 3h48v9a6 6 0 0 0 0 12v9H3v-9a6 6 0 0 0 0-12V3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Inset each side 2.52: 10% less visible width, with identical height, stroke and circular notches. */}
      <path data-entry-ticket-outline="narrow" className="hidden" d="M5.52 3H48.48v9a6 6 0 0 0 0 12v9H5.52v-9a6 6 0 0 0 0-12V3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="27" cy="18" r="7.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="m20.5 25 13-14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
    <span className="text-lg font-bold tabular-nums">{count ?? "—"}</span>
  </span>;
}
