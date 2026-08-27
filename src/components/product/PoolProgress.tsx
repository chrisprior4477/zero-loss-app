/**
 * Pool completion indicator (homepage spec §15), styled to the Checkpoint 2
 * artboards: an 11px pill-shaped track on the white card, with a floating
 * "N left" label pinned to the right edge above it.
 *
 * Pure presentation. Progress, remaining count and urgency are derived only
 * from the two props passed in — there is no prop to set an urgency state by
 * hand, because spec §15 prohibits artificial scarcity.
 *
 * The fill colour carries the semantic role: cyan while a pool is filling
 * normally, orange once it crosses into genuine urgency.
 */

type PoolProgressProps = {
  ticketsSold: number;
  ticketCapacity: number;
};

const URGENT_THRESHOLD = 85;

export function PoolProgress({
  ticketsSold,
  ticketCapacity,
}: PoolProgressProps) {
  const safeCapacity = Math.max(1, ticketCapacity);
  const clampedSold = Math.min(Math.max(0, ticketsSold), safeCapacity);
  const percentComplete = Math.round((clampedSold / safeCapacity) * 100);
  const remaining = safeCapacity - clampedSold;
  const isUrgent = percentComplete >= URGENT_THRESHOLD;

  return (
    <div className="relative">
      <div
        className="absolute bottom-full right-0 mb-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold leading-none tracking-[0.04em]"
        style={{
          background: isUrgent ? "var(--urgent)" : "var(--accent-deep)",
          /* C4: orange pills carry black text, not white. */
          color: isUrgent ? "#000" : "#fff",
        }}
      >
        {remaining.toLocaleString()} left
      </div>

      <div
        role="progressbar"
        aria-valuenow={percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Pool ${percentComplete}% complete, ${remaining} entries remaining`}
        className="h-[11px] overflow-hidden rounded-full bg-[rgba(0,71,149,0.12)]"
      >
        <div
          className="zl-bar-fill h-full rounded-full"
          style={{
            ["--zl-target" as string]: `${percentComplete}%`,
            background: isUrgent ? "var(--urgent)" : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
