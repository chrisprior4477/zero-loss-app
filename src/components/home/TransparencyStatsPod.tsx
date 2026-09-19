import Link from "next/link";
import { transparencyStatsDemo } from "@/lib/home/demo-data";

const statSymbols = ["◇", "✓", "$", "◎"] as const;
const statColors = ["#74e72d", "#00b9ff", "#c65cff", "#ff7a22"] as const;

const trustPoints = [
  { symbol: "✓", title: "Clear, published rules", body: "Pool size, entries, and closing details are shown before you participate.", color: "#00b9ff" },
  { symbol: "⌾", title: "Secure & private", body: "Account and financial details are protected and only shown to you.", color: "#74e72d" },
  { symbol: "♡", title: "Real value protected", body: "If you don’t win, what you spent still applies toward that item.", color: "#8b7cff" },
  { symbol: "◉", title: "Responsible participation", body: "Clear limits and support help keep the experience controlled.", color: "#ff9a50" },
] as const;

export function TransparencyStatsPod() {
  return (
    <section aria-labelledby="transparency-stats-title" className="relative w-full overflow-hidden border-t border-cyan-300/15 bg-[linear-gradient(180deg,#031b38_0%,#000f25_100%)]">
      <div className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(49,232,0,0.08),transparent_25%),radial-gradient(circle_at_88%_18%,rgba(0,185,255,0.11),transparent_28%),radial-gradient(circle_at_52%_100%,rgba(139,92,246,0.09),transparent_33%)]" />

        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1.35fr]">
          <div className="min-w-0 py-1">
            <div className="mb-3">
              <div className="flex items-center gap-2.5">
                <h2 id="transparency-stats-title" className="text-[18px] font-extrabold tracking-[-0.025em] text-white">Platform transparency</h2>
                <span className="rounded-full border border-[#ff9a50]/55 bg-[#ff630f]/10 px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.11em] text-[#ffad76]">Sandbox / Sample Data</span>
              </div>
              <p className="mt-0.5 text-[10px] text-white/55">We play fair. You can see it.</p>
            </div>

            <div className="grid grid-cols-2 gap-y-2 sm:grid-cols-4 sm:divide-x sm:divide-white/10">
              {transparencyStatsDemo.map((stat, index) => (
                <div key={stat.label} className="flex min-w-0 items-center gap-2 px-3 py-2 first:pl-0 last:pr-0">
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[17px] font-extrabold" style={{ color: statColors[index], borderColor: `${statColors[index]}66`, boxShadow: `inset 0 0 14px ${statColors[index]}20, 0 0 12px ${statColors[index]}16` }}>{statSymbols[index]}</span>
                  <span className="min-w-0">
                    <strong className="block whitespace-nowrap text-[16px] font-extrabold leading-none tracking-[-0.025em] text-white">{stat.value}</strong>
                    <span className="mt-1.5 block text-[8px] font-bold uppercase leading-tight tracking-[0.05em] text-white/65">{stat.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:py-1 lg:pl-6 lg:pt-1">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-extrabold tracking-[-0.025em] text-white">Built to be worth trusting</h2>
                <p className="mt-0.5 text-[10px] text-white/55">Clear protections behind every marketplace experience.</p>
              </div>
              <Link href="/how-it-works" className="shrink-0 text-[10px] font-bold text-cyan-300 hover:text-white">View full reports</Link>
            </div>

            <ul className="grid grid-cols-2 gap-y-3 sm:grid-cols-4 sm:divide-x sm:divide-white/10">
              {trustPoints.map((point) => (
                <li key={point.title} className="flex min-w-0 gap-2 px-3 py-2 first:pl-0 last:pr-0">
                  <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[16px] font-extrabold" style={{ color: point.color, borderColor: `${point.color}55`, backgroundColor: `${point.color}0d` }}>{point.symbol}</span>
                  <div className="min-w-0">
                    <h3 className="text-[10px] font-extrabold leading-tight text-white">{point.title}</h3>
                    <p className="mt-1 text-[8px] leading-[1.35] text-white/50">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
