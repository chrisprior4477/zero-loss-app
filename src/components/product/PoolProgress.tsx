/**
 * Pool completion indicator (homepage spec §15).
 *
 * Pure presentation: progress and urgency are derived only from the two props
 * passed in. Nothing here fetches, and no urgency state can be set by hand —
 * spec §15 prohibits artificial scarcity, so the label must always be a
 * function of real remaining capacity.
 */

type PoolProgressProps = {
  ticketsSold: number;
  ticketCapacity: number;
  /** Hide the text row and render the bar alone. */
  barOnly?: boolean;
};

/** Spec §15 urgency ladder. Thresholds are presentation-only for now. */
function urgencyLabel(percentComplete: number): string | null {
  if (percentComplete >= 95) return "Closing Soon";
  if (percentComplete >= 85) return "Almost Full";
  if (percentComplete >= 70) return "Limited Spots Remaining";
  return null;
}

export function PoolProgress({
  ticketsSold,
  ticketCapacity,
  barOnly = false,
}: PoolProgressProps) {
  const safeCapacity = Math.max(1, ticketCapacity);
  const clampedSold = Math.min(Math.max(0, ticketsSold), safeCapacity);
  const percentComplete = Math.round((clampedSold / safeCapacity) * 100);
  const remaining = safeCapacity - clampedSold;
  const urgency = urgencyLabel(percentComplete);

  return (
    <div>
      <div
        role="progressbar"
        aria-valuenow={percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Pool ${percentComplete}% complete`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${percentComplete}%` }}
        />
      </div>

      {barOnly ? null : (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-[var(--muted)] tabular-nums">
            {remaining.toLocaleString()} of {safeCapacity.toLocaleString()} left
          </span>
          {urgency ? (
            <span className="font-medium text-[var(--accent)]">{urgency}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
