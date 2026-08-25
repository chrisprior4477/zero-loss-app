/**
 * Live marketplace activity (homepage spec §10-§11).
 *
 * Ships EMPTY by design. Spec §10 states that live activity must always
 * represent authentic platform events and that "Artificial or fabricated
 * activity is prohibited" — so this component has no placeholder rows and no
 * sample data anywhere in the module. Invented winner names are exactly the
 * kind of scaffolding that survives to production.
 *
 * With no items, it renders the informative empty state required by §27.
 * When real event data exists, pass it via `items` and nothing else changes.
 */

export type ActivityItem = {
  id: string;
  /** Short factual description of a real, already-occurred platform event. */
  message: string;
  /** Display-ready relative time, e.g. "2 minutes ago". */
  timeLabel: string;
};

type LiveActivityFeedProps = {
  items?: ActivityItem[];
};

export function LiveActivityFeed({ items = [] }: LiveActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--section-line)] bg-[var(--surface)]/60 p-5">
        <p className="text-sm font-medium text-[var(--foreground)]">
          The marketplace is just getting started.
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
          Real participation and results will appear here as they happen. We
          only ever show activity that actually took place.
        </p>
      </div>
    );
  }

  return (
    <ul
      aria-live="polite"
      className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-sm text-[var(--foreground)]">
            {item.message}
          </span>
          <span className="shrink-0 text-xs text-[var(--muted)] tabular-nums">
            {item.timeLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}
