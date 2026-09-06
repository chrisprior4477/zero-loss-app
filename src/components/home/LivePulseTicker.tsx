import { livePulseDemoItems } from "@/lib/home/demo-data";

function TickerSequence({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {livePulseDemoItems.map((item) => (
        <div key={`${item.label}-${item.value}`} className="flex shrink-0 items-center">
          <span className="mx-5 h-1.5 w-1.5 rounded-full bg-cyan-300/70" aria-hidden="true" />
          <span className="text-[12px] font-bold uppercase tracking-[0.11em] text-white/65">
            {item.label}
          </span>
          <span
            className={`ml-2 text-[13px] font-extrabold ${
              item.tone === "live"
                ? "text-[#31e800]"
                : item.tone === "urgent"
                  ? "text-[#ff7a22]"
                  : "text-cyan-300"
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LivePulseTicker() {
  return (
    <section
      aria-label="Live Pulse sample marketplace activity"
      className="group relative flex h-10 items-center overflow-hidden border-y border-cyan-300/15 bg-[#020d20]"
    >
      <div className="absolute inset-y-0 left-0 z-10 flex items-center bg-[#020d20] pl-3 pr-3 shadow-[18px_0_24px_#020d20] sm:pl-6 sm:pr-5 lg:pl-[clamp(3rem,6vw,7rem)]">
        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#31e800] shadow-[0_0_10px_rgba(49,232,0,0.8)]" aria-hidden="true" />
        <span className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
          Live Pulse
        </span>
        <span className="ml-2 rounded border border-cyan-300/35 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300">
          Demo
        </span>
      </div>
      <div className="zl-live-pulse-track flex w-max pl-36 motion-reduce:translate-x-0 sm:pl-48">
        <TickerSequence />
        <TickerSequence hidden />
      </div>
      <span className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#020d20] to-transparent" aria-hidden="true" />
    </section>
  );
}
