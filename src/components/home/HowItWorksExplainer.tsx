"use client";

import { useRef } from "react";
import Image from "next/image";

const IMAGE_WIDTH = 3840;
const IMAGE_HEIGHT = 1429;
const IMAGE_SRC = "/how-it-works-five-steps-option-b.png";

const steps = [
  { start: 0, end: 768, description: "Step 1: Pick it. Choose a product and see its full offer total." },
  { start: 768, end: 1536, description: "Step 2: Enter one dollar. Your dollar starts the offer." },
  { start: 1536, end: 2304, description: "Step 3: You win. Get a gift card for the full offer value." },
  { start: 2304, end: 3072, description: "Step 4: Didn't win? What you spent still counts. Pay the balance by the deadline to receive the same gift card." },
  { start: 3072, end: IMAGE_WIDTH, description: "Step 5: Your call. Use the gift card for your pick or other items at that retailer." },
] as const;

export function HowItWorksExplainer() {
  const stripRef = useRef<HTMLDivElement>(null);

  function move(direction: -1 | 1) {
    const strip = stripRef.current;
    if (!strip) return;
    const cards = [...strip.querySelectorAll<HTMLElement>("[data-explainer-step]")];
    const stripLeft = strip.getBoundingClientRect().left;
    const current = cards.reduce((best, card, index) =>
      Math.abs(card.getBoundingClientRect().left - stripLeft) < Math.abs(cards[best].getBoundingClientRect().left - stripLeft) ? index : best, 0);
    const target = cards[Math.min(cards.length - 1, Math.max(0, current + direction))];
    if (target) strip.scrollTo({ left: strip.scrollLeft + target.getBoundingClientRect().left - stripLeft, behavior: "smooth" });
  }

  return (
    <div>
      <Image
        src={IMAGE_SRC}
        alt="How ZeroLoss works in five steps: pick a product, enter for $1, receive the full-value retailer gift card if you win, or use what you spent toward the balance if you don't; then use the gift card at that retailer."
        width={IMAGE_WIDTH}
        height={IMAGE_HEIGHT}
        sizes="(min-width: 1024px) 1440px, 100vw"
        className="hidden h-auto w-full rounded-2xl shadow-[0_18px_42px_rgba(0,0,0,0.32)] lg:block"
        unoptimized
      />

      <div className="lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white/80">Swipe through the five steps</p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => move(-1)} aria-label="Previous how-it-works step" className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/50 bg-[#08264b] text-xl text-white transition hover:bg-[#123d6b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#59dfff]">‹</button>
            <button type="button" onClick={() => move(1)} aria-label="Next how-it-works step" className="grid h-10 w-10 place-items-center rounded-full border border-cyan-300/50 bg-[#08264b] text-xl text-white transition hover:bg-[#123d6b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#59dfff]">›</button>
          </div>
        </div>
        <div
          ref={stripRef}
          role="region"
          aria-label="How ZeroLoss works, five swipeable steps"
          tabIndex={0}
          className="zl-noscroll flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#59dfff]"
        >
          {steps.map((step, index) => {
            const cropWidth = step.end - step.start;
            return (
              <div
                key={step.start}
                data-explainer-step
                role="img"
                aria-label={step.description}
                className="relative h-[min(72vh,540px)] shrink-0 snap-start overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#00132e] shadow-[0_16px_36px_rgba(0,0,0,0.32)]"
                style={{ aspectRatio: `${cropWidth} / ${IMAGE_HEIGHT}` }}
              >
                <Image
                  src={IMAGE_SRC}
                  alt=""
                  aria-hidden="true"
                  width={IMAGE_WIDTH}
                  height={IMAGE_HEIGHT}
                  sizes="1600px"
                  className="absolute top-0 h-full max-w-none"
                  style={{ width: `${(IMAGE_WIDTH / cropWidth) * 100}%`, left: `-${(step.start / cropWidth) * 100}%` }}
                  loading={index === 0 ? "eager" : "lazy"}
                  unoptimized
                />
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-white/65">Pick it → Enter $1 → Win or pay the balance → Your call</p>
      </div>
    </div>
  );
}
