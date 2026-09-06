"use client";

import { type PointerEvent as ReactPointerEvent, type TransitionEvent as ReactTransitionEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ZeroLossJourney } from "@/components/home/ZeroLossJourney";

const HERO_SLIDES = [
  {
    id: "real-shots",
    lines: ["Real shots.", "Real wins.", "Zero loss."],
    image: "/hero-tech-transparent.png",
    mobileImage: "/mobile-hero-zero-loss-coin-transparent.png",
  },
  {
    id: "shopping",
    lines: ["Shopping should", "never feel like", "a loss."],
    image: "/hero-marketplace.png",
    mobileImage: "/hero-marketplace.png",
  },
  {
    id: "real-products",
    lines: ["Real products.", "Real winners.", "Zero loss."],
    image: "/hero-everyday-2400x800.png",
    mobileImage: "/hero-everyday-2400x800.png",
  },
] as const;

function DesktopHeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [trackSlide, setTrackSlide] = useState(1);
  const [animateTrack, setAnimateTrack] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const howItWorksPanelRef = useRef<HTMLElement>(null);
  const swipeRef = useRef({ startX: 0, startY: 0, currentX: 0, currentY: 0, active: false });

  useEffect(() => {
    if (!showHowItWorks) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !(target instanceof Element && target.closest("[data-how-it-works-trigger]")) &&
        !howItWorksPanelRef.current?.contains(target)
      ) {
        setShowHowItWorks(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHowItWorks(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [showHowItWorks]);

  const showSlide = (index: number) => {
    if (index < 0) {
      setActiveSlide(HERO_SLIDES.length - 1);
      setTrackSlide(0);
      return;
    }
    if (index >= HERO_SLIDES.length) {
      setActiveSlide(0);
      setTrackSlide(HERO_SLIDES.length + 1);
      return;
    }
    setActiveSlide(index);
    setTrackSlide(index + 1);
  };

  const settleInfiniteTrack = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (trackSlide !== 0 && trackSlide !== HERO_SLIDES.length + 1) return;
    setAnimateTrack(false);
    setTrackSlide(trackSlide === 0 ? HERO_SLIDES.length : 1);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimateTrack(true)));
  };

  const startSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") return;
    if ((event.target as Element).closest("button, a")) return;
    swipeRef.current = { startX: event.clientX, startY: event.clientY, currentX: event.clientX, currentY: event.clientY, active: true };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const trackSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (!swipeRef.current.active) return;
    swipeRef.current.currentX = event.clientX;
    swipeRef.current.currentY = event.clientY;
  };

  const finishSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (!swipeRef.current.active) return;
    const deltaX = swipeRef.current.currentX - swipeRef.current.startX;
    const deltaY = swipeRef.current.currentY - swipeRef.current.startY;
    swipeRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.abs(deltaX) < 25 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    showSlide(activeSlide + (deltaX < 0 ? 1 : -1));
  };

  return (
    <>
    <section
      aria-roledescription="carousel"
      aria-label="ZeroLoss highlights"
      onPointerDown={startSwipe}
      onPointerMove={trackSwipe}
      onPointerUp={finishSwipe}
      onPointerCancel={() => { swipeRef.current.active = false; }}
      className="relative left-1/2 w-screen touch-pan-y -translate-x-1/2 overflow-hidden bg-transparent"
    >
      <div
        onTransitionEnd={settleInfiniteTrack}
        className={`flex duration-500 ease-out motion-reduce:transition-none ${animateTrack ? "transition-transform" : "transition-none"}`}
        style={{ transform: `translateX(-${trackSlide * 100}%)` }}
      >
        {[HERO_SLIDES[HERO_SLIDES.length - 1], ...HERO_SLIDES, HERO_SLIDES[0]].map((slide, renderIndex) => {
          const index = (renderIndex - 1 + HERO_SLIDES.length) % HERO_SLIDES.length;
          return (
          <article
            key={`${slide.id}-${renderIndex}`}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${HERO_SLIDES.length}`}
            aria-hidden={activeSlide !== index}
            className="relative min-h-[270px] w-full shrink-0 overflow-hidden px-5 py-5 sm:px-8 lg:min-h-[clamp(240px,20vw,290px)] lg:px-[clamp(4.5rem,7vw,8rem)]"
          >
            <div className="absolute inset-0 overflow-hidden lg:left-auto lg:w-[72%]">
              <Image
                src={slide.mobileImage}
                alt=""
                aria-hidden="true"
                fill
                sizes="100vw"
                className={
                  slide.id === "real-shots"
                    ? "origin-right translate-x-[45px] scale-[1.275] object-contain object-right mix-blend-screen drop-shadow-[0_0_30px_rgba(255,92,0,0.68)] lg:hidden"
                    : "object-cover object-center brightness-[1.22] contrast-[1.08] saturate-[1.35] drop-shadow-[0_18px_32px_rgba(0,0,0,0.3)] lg:hidden"
                }
                preload={renderIndex === 1}
              />
              <Image
                src={slide.image}
                alt=""
                aria-hidden="true"
                fill
                sizes="(min-width: 1024px) 72vw, 100vw"
                className="hidden scale-[0.97] object-cover object-center drop-shadow-[0_18px_32px_rgba(0,0,0,0.3)] lg:block"
                preload={renderIndex === 1}
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-0 lg:hidden"
              style={{
                background:
                  slide.id === "real-shots"
                    ? "linear-gradient(to right, #031b44 0%, #031b44 38%, rgba(3,27,68,0.78) 44%, rgba(3,27,68,0) 56%)"
                    : "linear-gradient(to right, #031b44 0%, #031b44 38%, rgba(3,27,68,0.76) 44%, rgba(3,27,68,0) 58%)",
              }}
            />
            <div aria-hidden="true" className="absolute inset-0 hidden bg-gradient-to-r from-[#031b44] via-[#031b44]/70 to-transparent lg:block" />
            <div className="relative z-10 flex min-h-[230px] max-w-[620px] flex-col items-start justify-center lg:min-h-[calc(clamp(240px,20vw,290px)-2.5rem)]">
              <h1 className="max-w-[82%] text-[34px] font-extrabold leading-[0.98] tracking-[-0.045em] text-white sm:text-[42px] lg:max-w-none lg:text-[clamp(38px,3.5vw,54px)]">
                {slide.lines.map((line) =>
                  slide.id === "shopping" && line === "a loss." ? (
                    <span key={line} className="block">
                      a <span className="text-[var(--live)]">loss.</span>
                    </span>
                  ) : (
                    <span
                      key={line}
                      className={`block ${
                        line === "Zero loss." ? "text-[var(--live)]" : ""
                      }`}
                    >
                      {line}
                    </span>
                  )
                )}
              </h1>
              <p className="mt-3 max-w-[390px] text-[14px] leading-[1.4] text-white/88">
                {slide.id === "real-shots" ? (
                  <>
                    <span className="block whitespace-nowrap">Pay $1 for a real shot.</span>
                    <span className="block whitespace-nowrap">At a product. Don&apos;t win? What</span>
                    <span className="block whitespace-nowrap">you spent still counts.</span>
                  </>
                ) : (
                  <>
                    <span className="block">Pay $1 for a real shot at a product.</span>
                    <span className="block">Don&apos;t win? What you spent still counts.</span>
                  </>
                )}
              </p>
              <button
                data-how-it-works-trigger
                type="button"
                aria-expanded={showHowItWorks}
                aria-controls="desktop-how-it-works-panel"
                onClick={() => setShowHowItWorks((current) => !current)}
                className={`${slide.id === "real-shots" ? "mt-5" : "mt-3"} inline-flex h-9 items-center gap-2 rounded-lg bg-[#087feb] px-4 text-[13px] font-bold text-white shadow-[0_0_0_1px_rgba(91,190,255,0.4)] transition-colors hover:bg-[#1692ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--live)]`}
              >
                How It Works
                <span aria-hidden="true">{showHowItWorks ? "↑" : "↓"}</span>
              </button>
            </div>
          </article>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Previous hero slide"
        onClick={() => showSlide(activeSlide - 1)}
        className="absolute left-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-2xl text-white/80 transition-colors hover:bg-black/45 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        aria-label="Next hero slide"
        onClick={() => showSlide(activeSlide + 1)}
        className="absolute right-3 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-2xl text-white/80 transition-colors hover:bg-black/45 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span aria-hidden="true">›</span>
      </button>

      <div
        className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2"
        aria-label="Choose hero slide"
      >
        {HERO_SLIDES.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Show slide ${index + 1}`}
            aria-current={activeSlide === index ? "true" : undefined}
            onClick={() => showSlide(index)}
            className={`h-2 rounded-full transition-all ${
              activeSlide === index
                ? "w-8 bg-[var(--live)]"
                : "w-2 bg-white/45 hover:bg-white/75"
            }`}
          />
        ))}
      </div>
    </section>

    {showHowItWorks ? (
      <section
        ref={howItWorksPanelRef}
        id="desktop-how-it-works-panel"
        aria-label="How ZeroLoss works"
        className="relative left-1/2 w-screen -translate-x-1/2 border-y border-cyan-300/20 bg-[#00132e] px-4 py-7 sm:px-6 lg:px-[clamp(4rem,8vw,10rem)]"
      >
        <div className="mx-auto max-w-[1440px]">
          <Image
            src="/perfect-zero-loss-four-card-v3.png"
            alt="Four-step ZeroLoss walkthrough: choose a prize, try for one dollar, win the prize, or use the dollar toward buying the same product."
            width={1774}
            height={887}
            sizes="(min-width: 1024px) 84vw, 100vw"
            className="mb-9 hidden h-auto w-full rounded-2xl shadow-[0_18px_42px_rgba(0,0,0,0.32)] lg:block"
            priority
          />
          <div className="mb-8 lg:hidden">
            <ZeroLossJourney compact />
          </div>
          <h2 className="text-[22px] font-bold text-white">How ZeroLoss works</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-8">
            <div className="border-l-2 border-[var(--live)] pl-4">
              <h3 className="text-[14px] font-bold text-[var(--live)]">Everyday items</h3>
              <p className="mt-1.5 max-w-[560px] text-[14px] leading-[1.55] text-white/80">
                On everyday items, what you spend applies toward buying that exact
                item at full price.
              </p>
            </div>
            <div className="border-l-2 border-[#087feb] pl-4">
              <h3 className="text-[14px] font-bold text-[#55b5ff]">Scarce or one-of-a-kind items</h3>
              <p className="mt-1.5 max-w-[650px] text-[14px] leading-[1.55] text-white/80">
                On scarce, one-off, or one-of-a-kind items, what you spend converts
                to a $1 credit toward the store where the product was originally
                listed.
              </p>
            </div>
          </div>

        </div>
      </section>
    ) : null}
    </>
  );
}

export function HeroSection() {
  return <DesktopHeroCarousel />;
}
