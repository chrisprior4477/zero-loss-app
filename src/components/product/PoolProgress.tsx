/**
 * Pool completion indicator (homepage spec §15), styled to the Checkpoint 2
 * artboards: an 11px pill-shaped track on the white card, with a floating
 * "N left" label pinned to the right edge above it.
 *
 * Pure presentation. Progress, remaining count and urgency are derived only
 * from the two props passed in — there is no prop to set an urgency state by
 * hand, because spec §15 prohibits artificial scarcity.
 *
 * The fill uses the same green/blue/orange/red capacity bands as the circles.
 */

import { availabilityStatus } from "@/lib/catalog/availability";

type PoolProgressProps = {
  ticketsSold: number;
  ticketCapacity: number;
  showRemainingLabel?: boolean;
};

export function PoolProgress({
  ticketsSold,
  ticketCapacity,
  showRemainingLabel = true,
}: PoolProgressProps) {
  const status = availabilityStatus(ticketCapacity, ticketsSold);

  return (
    <div className="relative">
      {showRemainingLabel ? <div
        className="absolute bottom-full right-0 mb-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold leading-none tracking-[0.04em]"
        style={{
          background: status.color,
          color: "#00132e",
        }}
      >
        {status.remaining === 0 ? "Pool full" : `${status.remaining.toLocaleString()} left`}
      </div> : null}

      <div
        role="progressbar"
        aria-valuenow={status.percentFilled}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Pool ${status.percentFilled}% complete, ${status.remaining} entries remaining`}
        className="h-[11px] overflow-hidden rounded-full bg-[rgba(0,71,149,0.12)]"
      >
        <div
          className="zl-bar-fill h-full rounded-full"
          style={{
            ["--zl-target" as string]: `${status.percentFilled}%`,
            background: status.color,
          }}
        />
      </div>
    </div>
  );
}
