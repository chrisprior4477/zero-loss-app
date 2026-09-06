import Image from "next/image";

const STEPS = [
  {
    number: "1",
    eyebrow: "PICK",
    title: "Choose your prize.",
    description: "Pick a real product you actually want—not points or pretend value.",
    image: "/zero-loss-owned-choose.png",
    accent: "#98d900",
  },
  {
    number: "2",
    eyebrow: "TAKE YOUR SHOT",
    title: "Put in $1.",
    description: "One dollar gives you a real shot at the exact product you picked.",
    image: "/zero-loss-owned-dollar.png",
    accent: "#42b6ff",
  },
  {
    number: "3",
    eyebrow: "THE WIN",
    title: "You are a winner!",
    description: "Congratulations—the prize you chose is yours to keep or gift.",
    image: "/zero-loss-owned-win.png",
    accent: "#e6b33f",
  },
  {
    number: "4",
    eyebrow: "THE PLOT TWIST",
    title: "Didn't win? No problem.",
    description: "Reclaim your $1 toward buying the exact product you chose.",
    image: "/zero-loss-owned-reclaim.png",
    accent: "#98d900",
  },
] as const;

export function ZeroLossJourney({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <section aria-labelledby="mobile-zero-loss-journey">
        <div className="mb-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#55b5ff]">
            How ZeroLoss works
          </p>
          <h2
            id="mobile-zero-loss-journey"
            className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-white"
          >
            Four simple steps. <span className="text-[var(--live)]">Swipe to explore.</span>
          </h2>
        </div>

        <div className="zl-noscroll -mx-4 flex touch-auto gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 sm:-mx-6 sm:px-6">
          {STEPS.map((step, index) => (
            <article
              key={step.number}
              role="img"
              aria-label={`Step ${step.number}: ${step.eyebrow}. ${step.title} ${step.description}`}
              className="relative aspect-[.59/1] w-[min(78vw,310px)] shrink-0 overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#00132e] shadow-[0_16px_36px_rgba(0,0,0,0.32)]"
            >
              <Image
                src="/perfect-zero-loss-four-card-v3.png"
                alt=""
                aria-hidden="true"
                width={1774}
                height={887}
                sizes="312vw"
                className="absolute top-0 h-auto w-[400%] max-w-none"
                style={{ left: `-${index * 100}%` }}
                priority
              />
            </article>
          ))}
        </div>

        <p className="mt-2 text-center text-[12px] font-semibold text-white/65">
          Win it, or use what you spent toward buying the product you already wanted.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="desktop-zero-loss-journey">
      <div className="mb-5 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#55b5ff]">
          The ZeroLoss journey
        </p>
        <h2
          id="desktop-zero-loss-journey"
          className="mt-1 text-[30px] font-extrabold tracking-[-0.03em] text-white"
        >
          Pick it. Take your shot. <span className="text-[var(--live)]">Keep the value.</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <article
            key={step.number}
            className="overflow-hidden rounded-2xl border border-white/12 bg-[#031b44] shadow-[0_16px_36px_rgba(0,0,0,0.3)]"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={step.image}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 22vw"
                className="object-cover"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[#031b44] via-transparent to-transparent" />
              <span
                className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full text-base font-extrabold text-[#00132e] shadow-lg"
                style={{ backgroundColor: step.accent }}
              >
                {step.number}
              </span>
            </div>
            <div className="px-5 pb-5 pt-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em]" style={{ color: step.accent }}>
                {step.eyebrow}
              </p>
              <h3 className="mt-1 text-[19px] font-extrabold leading-tight text-white">{step.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.5] text-white/68">{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
