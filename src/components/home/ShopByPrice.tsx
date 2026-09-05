import Link from "next/link";
import { shopByPriceTiers } from "@/lib/home/placeholder-data";

/**
 * "Shop by price" tiers from the Checkpoint 2 artboard — a promotional
 * browsing module (spec §20). Static links; no filtering is wired up yet.
 */
export function ShopByPrice() {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {shopByPriceTiers.map((tier) => (
        <li key={tier.price}>
          <Link
            href="/browse"
            className="flex min-h-[82px] flex-col items-center justify-center rounded-[10px] border border-[#218df0] bg-[linear-gradient(145deg,#0759c9_0%,#0879e8_52%,#0caaf4_100%)] px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_7px_18px_rgba(0,44,110,0.25)] transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transform-none"
          >
            <span className="text-[25px] font-extrabold leading-none text-white [text-shadow:0_2px_5px_rgba(0,38,92,0.4)]">
              {tier.price}
            </span>
            <span className="mt-1 text-[12px] font-semibold leading-none text-white/90">{tier.detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
