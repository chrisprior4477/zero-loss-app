import Link from "next/link";
import { shopByPriceTiers } from "@/lib/home/placeholder-data";

/**
 * "Shop by price" tiers from the Checkpoint 2 artboard — a promotional
 * browsing module (spec §20). Static links; no filtering is wired up yet.
 */
export function ShopByPrice() {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {shopByPriceTiers.map((tier) => (
        <li key={tier}>
          <Link
            href="/browse"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,var(--accent-deep),var(--accent))] px-5 py-6 text-base text-[var(--foreground)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] motion-reduce:transform-none"
          >
            <span className="text-[26px] font-extrabold leading-none text-[var(--urgent)] [text-shadow:2px_2px_3px_rgba(0,47,110,0.55)]">
              {tier}
            </span>
            and above
          </Link>
        </li>
      ))}
    </ul>
  );
}
