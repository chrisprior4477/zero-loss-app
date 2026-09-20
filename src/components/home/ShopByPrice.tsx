import Link from "next/link";
import { shopByPriceTiers } from "@/lib/home/placeholder-data";
import styles from "./ShopByPrice.module.css";

/**
 * "Shop by price" tiers from the Checkpoint 2 artboard — a promotional
 * browsing module (spec §20). Static links; no filtering is wired up yet.
 */
export function ShopByPrice() {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {shopByPriceTiers.map((tier) => {
        const rareFinds = tier.price === "RARE FINDS";
        return (
          <li key={tier.price}>
            <Link
              href="/browse"
              className={`group relative flex min-h-[82px] flex-col items-center justify-center overflow-hidden rounded-[10px] border border-[#218df0] bg-[linear-gradient(145deg,#0759c9_0%,#0879e8_52%,#0caaf4_100%)] text-center transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transform-none ${rareFinds ? "px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,.35),inset_0_0_24px_rgba(93,231,255,.28),0_0_0_1px_rgba(103,232,255,.35),0_8px_24px_rgba(0,147,255,.38)]" : "px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_7px_18px_rgba(0,44,110,0.25)]"}`}
            >
              {rareFinds ? (
                <span className="relative flex max-w-full items-center gap-1 text-left">
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap text-[14px] font-extrabold leading-none tracking-[-.04em] text-white [text-shadow:0_2px_5px_rgba(0,38,92,0.4)] min-[350px]:text-[17px] min-[390px]:text-[19px] sm:text-[25px] lg:text-[17px] xl:text-[20px]">Rare Finds</span>
                    <span className="mt-1 block text-[11px] font-semibold leading-none text-white/90 sm:text-[12px]">{tier.detail}</span>
                  </span>
                  <span aria-hidden="true" className={styles.favicon} />
                </span>
              ) : (
                <>
                  <span className="relative text-[25px] font-extrabold leading-none text-white [text-shadow:0_2px_5px_rgba(0,38,92,0.4)]">{tier.price}</span>
                  <span className="relative mt-1 text-[12px] font-semibold leading-none text-white/90">{tier.detail}</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
