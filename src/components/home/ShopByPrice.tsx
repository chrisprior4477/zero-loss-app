import Link from "next/link";
import { shopByPriceTiers } from "@/lib/home/placeholder-data";

/**
 * "Shop by price" tiers from the Checkpoint 2 artboard — a promotional
 * browsing module (spec §20). Static links; no filtering is wired up yet.
 */
export function ShopByPrice() {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {shopByPriceTiers.map((tier) => {
        const oneOfAKind = tier.price === "ONE OF A KIND";
        return (
        <li key={tier.price}>
          <Link
            href="/browse"
            className={`group relative flex min-h-[82px] flex-col items-center justify-center overflow-hidden rounded-[10px] border border-[#218df0] bg-[linear-gradient(145deg,#0759c9_0%,#0879e8_52%,#0caaf4_100%)] px-4 py-3 text-center transition-all hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transform-none ${oneOfAKind ? "shadow-[inset_0_1px_0_rgba(255,255,255,.35),inset_0_0_24px_rgba(93,231,255,.28),0_0_0_1px_rgba(103,232,255,.35),0_8px_24px_rgba(0,147,255,.38)]" : "shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_7px_18px_rgba(0,44,110,0.25)]"}`}
          >
            {oneOfAKind && <>
              <span aria-hidden="true" className="absolute -left-5 -top-8 h-20 w-20 rounded-full bg-cyan-200/25 blur-xl transition-transform duration-500 group-hover:translate-x-6" />
              {(["left", "right"] as const).map((side) => (
                <svg aria-hidden="true" key={side} viewBox="0 0 120 100" className={`absolute top-[calc(58%+5px)] h-[40px] w-[40px] -translate-y-1/2 fill-none transition-transform duration-500 group-hover:scale-110 sm:top-[58%] ${side === "left" ? "left-1 -rotate-12" : "right-1 rotate-12"}`}>
                  <g stroke="#00bfff" strokeWidth="9" opacity=".85" className="drop-shadow-[0_0_5px_rgba(0,207,255,.95)]">
                    <path d="M30 39h60v54H30zM24 28h72v16H24zM60 28v65" strokeLinejoin="round" />
                    <path d="M59 29C45 27 34 20 35 12c1-6 8-8 14-4 6 4 10 12 11 21Zm2 0c14-2 25-9 24-17-1-6-8-8-14-4-6 4-10 12-10 21Z" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <g stroke="#effeff" strokeWidth="2.3">
                    <path d="M30 39h60v54H30zM24 28h72v16H24zM60 28v65" strokeLinejoin="round" />
                    <path d="M59 29C45 27 34 20 35 12c1-6 8-8 14-4 6 4 10 12 11 21Zm2 0c14-2 25-9 24-17-1-6-8-8-14-4-6 4-10 12-10 21Z" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </svg>
              ))}
              <span aria-hidden="true" className="absolute right-2 top-1 text-[12px] text-cyan-100 drop-shadow-[0_0_7px_white]">✦</span>
            </>}
            <span className={`relative font-extrabold leading-none text-white [text-shadow:0_2px_5px_rgba(0,38,92,0.4)] ${oneOfAKind ? "text-[15px] tracking-[.05em] sm:text-[17px]" : "text-[25px]"}`}>
              {tier.price}
            </span>
            <span className="relative mt-1 text-[12px] font-semibold leading-none text-white/90">{tier.detail}</span>
          </Link>
        </li>
        );
      })}
    </ul>
  );
}
