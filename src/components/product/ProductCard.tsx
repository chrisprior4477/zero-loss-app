import Image from "next/image";
import Link from "next/link";
import { PoolProgress } from "@/components/product/PoolProgress";
import type {
  OpportunityStatus,
  PlaceholderOpportunity,
} from "@/lib/home/placeholder-data";

/**
 * Opportunity card (homepage spec §15), styled to the Checkpoint 2 artboards:
 * a white card on the deep-blue page, photo on top, a status pill and entry
 * count, then the pool bar, title, and a retail / entry footer row.
 *
 * Presentational only — every value arrives as a prop. The card never reads
 * the catalog, a pool, or the ledger, and it never derives an entry count
 * from anything (financial rules §1.1: entries come from displayed face value
 * only, and acquisition cost must never be customer-inferable).
 */

type ProductCardProps = {
  opportunity: PlaceholderOpportunity;
  /** Where the card navigates. Spec §16 — no intermediate screens. */
  href?: string;
};

/* C4: the orange pill takes black text. Green marks live activity, cyan is
   neutral emphasis — these roles are not interchangeable with decoration. */
const STATUS_STYLE: Record<
  OpportunityStatus,
  { background: string; color: string }
> = {
  closing: { background: "var(--urgent)", color: "#000" },
  new: { background: "var(--live)", color: "var(--live-ink)" },
  popular: { background: "var(--accent)", color: "var(--ink)" },
};

export function ProductCard({ opportunity, href = "/browse" }: ProductCardProps) {
  const status = STATUS_STYLE[opportunity.status];

  return (
    <article className="h-full">
      <Link
        href={href}
        className="flex h-full flex-col rounded-2xl bg-[var(--card)] p-4 transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-reduce:transform-none"
      >
        <div className="relative mb-4 h-[168px] overflow-hidden rounded-lg bg-[#f2f2f2]">
          <Image
            src={opportunity.image}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
            className="object-contain p-2"
          />
        </div>

        <div className="mb-2.5 flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase leading-none tracking-[0.08em]"
            style={status}
          >
            {opportunity.statusLabel}
          </span>
          <span className="font-mono text-[10.5px] font-medium text-[rgba(0,0,0,0.45)]">
            {opportunity.category}
          </span>
        </div>

        <div className="mb-2.5 mt-3">
          <PoolProgress
            ticketsSold={opportunity.ticketsSold}
            ticketCapacity={opportunity.ticketCapacity}
          />
        </div>

        <h3 className="mb-1.5 text-[17px] font-bold leading-[1.25] text-[var(--ink-strong)]">
          {opportunity.title}
        </h3>

        <div className="mt-auto flex items-baseline justify-between border-t border-[rgba(0,0,0,0.1)] pt-3">
          <span className="text-[13px] text-[var(--ink-soft)]">
            {opportunity.faceValueLabel} value
          </span>
          <span className="text-[15px] font-bold text-[var(--background)]">
            {opportunity.entryPriceLabel}
          </span>
        </div>
      </Link>
    </article>
  );
}
