import Image from "next/image";
import Link from "next/link";
import { dollarChoiceDemoItems, marketplaceMovementDemoItems } from "@/lib/home/demo-data";

const movementItems = marketplaceMovementDemoItems.map((movement, index) => ({
  ...movement,
  rank: index + 1,
  product: dollarChoiceDemoItems.find((item) => item.id === movement.itemId)!,
}));

export function MarketplaceMovementPanel() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-cyan-300/15 bg-[linear-gradient(145deg,#031b42,#00132e)] px-5 py-5 shadow-[0_16px_38px_rgba(0,0,0,0.2)] sm:px-6">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-[21px] font-extrabold tracking-[-0.025em] text-white">What&apos;s moving right now</h3>
          <span className="rounded-full border border-cyan-300/35 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300">Demo data</span>
        </div>
        <p className="mt-1 text-[12px] text-white/55">The race is on. See what everyone&apos;s going for.</p>
      </div>

      <ol className="space-y-3">
        {movementItems.map(({ rank, product, spotsLeft }) => {
          const barColor = product.percentFilled >= 80 ? "#73e72d" : product.percentFilled >= 60 ? "#00a9ff" : product.percentFilled >= 50 ? "#ff7a22" : "#a54cff";
          return (
            <li key={product.id}>
              <Link href={product.href} className="group grid grid-cols-[18px_38px_minmax(105px,1fr)_minmax(100px,1.5fr)_42px_72px] items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
                <span className="text-center text-[12px] font-bold text-white/70">{rank}</span>
                <span className="relative h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-white/95">
                  <Image src={product.image} alt="" aria-hidden="true" fill sizes="36px" className="object-contain p-1" />
                </span>
                <span className="truncate text-[12px] font-semibold text-white">{product.title}</span>
                <span className="h-2 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full transition-[width] duration-500 group-hover:brightness-110" style={{ width: `${product.percentFilled}%`, backgroundColor: barColor, boxShadow: `0 0 10px ${barColor}66` }} />
                </span>
                <span className="text-right text-[13px] font-extrabold" style={{ color: barColor }}>{product.percentFilled}%</span>
                <span className="text-right text-[10px] text-white/55">{spotsLeft.toLocaleString()} spots left</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
