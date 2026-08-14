"use client";

import { useEffect, useId, useRef, useState } from "react";

type BannerSlide =
  | {
      id: string;
      kind: "primary";
      title: string;
    }
  | {
      id: string;
      kind: "placeholder";
      title: string;
      body: string;
    };

const SLIDES: BannerSlide[] = [
  {
    id: "tagline",
    kind: "primary",
    title: "Shopping should never feel like losing.",
  },
  {
    id: "featured",
    kind: "placeholder",
    title: "Featured item",
    body: "Coming once catalog browsing is connected.",
  },
  {
    id: "drops",
    kind: "placeholder",
    title: "New drops",
    body: "Fresh listings will appear here when the catalog has live items.",
  },
  {
    id: "trending",
    kind: "placeholder",
    title: "Trending pools",
    body: "Trending opportunities will show here once marketplace data is live.",
  },
];

const AUTO_ADVANCE_MS = 5000;
const SCROLL_EDGE_PX = 2;

function ChevronIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {direction === "prev" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      )}
    </svg>
  );
}

function getSlideStride(track: HTMLDivElement): number {
  const first = track.children[0] as HTMLElement | undefined;
  const second = track.children[1] as HTMLElement | undefined;
  if (first && second) {
    return second.offsetLeft - first.offsetLeft;
  }
  if (first) {
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return first.offsetWidth + gap;
  }
  return track.clientWidth;
}

function getMaxScroll(track: HTMLDivElement): number {
  return Math.max(0, track.scrollWidth - track.clientWidth);
}

/**
 * Thin StockX-style homepage banner strip.
 * Loops in both directions. Auto-advances once (slide 1 → 2 after ~5s)
 * unless the user interacts or prefers-reduced-motion is set — then
 * fully manual from that point on.
 *
 * Chevron navigation uses scroll-edge detection + a logical index ref.
 * It must NOT use "nearest slide to viewport center" for wrap decisions:
 * when multiple slides are visible, center-nearest is already slide 2 at
 * scrollLeft=0, which made prev a no-op and blocked next-wrap.
 */
export function HeroBannerCarousel() {
  const labelId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const userInteractedRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  /** Source of truth for chevron / keyboard / auto-advance navigation. */
  const logicalIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const cancelAutoAdvance = () => {
    userInteractedRef.current = true;
    if (autoAdvanceTimerRef.current != null) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const setLogicalIndex = (index: number) => {
    logicalIndexRef.current = index;
    setActiveIndex(index);
  };

  const scrollTrackTo = (left: number, programmatic: boolean) => {
    const track = trackRef.current;
    if (!track) return;

    programmaticScrollRef.current = programmatic;
    track.scrollTo({
      left,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });

    if (programmatic) {
      // Fallback clear if scrollend never fires; do not sync index here.
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 500);
    }
  };

  const scrollToIndex = (index: number, programmatic: boolean) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;

    const maxScroll = getMaxScroll(track);
    const target = Math.min(slide.offsetLeft, maxScroll);
    setLogicalIndex(index);
    scrollTrackTo(target, programmatic);
  };

  /**
   * Wrap uses real scroll edges, not center-derived activeIndex.
   * Mid-track moves advance by one slide stride.
   */
  const scrollByDirection = (direction: "prev" | "next") => {
    cancelAutoAdvance();
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = getMaxScroll(track);
    const atStart = track.scrollLeft <= SCROLL_EDGE_PX;
    const atEnd = track.scrollLeft >= maxScroll - SCROLL_EDGE_PX;

    if (direction === "prev") {
      if (atStart) {
        scrollToIndex(SLIDES.length - 1, true);
        return;
      }

      const stride = getSlideStride(track);
      const nextLeft = Math.max(0, track.scrollLeft - stride);
      setLogicalIndex(Math.max(0, logicalIndexRef.current - 1));
      scrollTrackTo(nextLeft, true);
      return;
    }

    // next
    if (atEnd) {
      scrollToIndex(0, true);
      return;
    }

    const stride = getSlideStride(track);
    const nextLeft = Math.min(maxScroll, track.scrollLeft + stride);

    // Stride cannot move further — treat as end and wrap.
    if (Math.abs(nextLeft - track.scrollLeft) <= SCROLL_EDGE_PX) {
      scrollToIndex(0, true);
      return;
    }

    const reachedEnd = nextLeft >= maxScroll - SCROLL_EDGE_PX;
    setLogicalIndex(
      reachedEnd
        ? SLIDES.length - 1
        : Math.min(SLIDES.length - 1, logicalIndexRef.current + 1)
    );
    scrollTrackTo(nextLeft, true);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const syncIndexFromLeftEdge = () => {
      const slides = Array.from(track.children) as HTMLElement[];
      let nearest = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - track.scrollLeft);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
      setLogicalIndex(nearest);
    };

    const onScroll = () => {
      // Chevron/keyboard scrolls are programmatic — never cancel or sync here.
      if (programmaticScrollRef.current) {
        return;
      }
      cancelAutoAdvance();
    };

    const onScrollEnd = () => {
      if (programmaticScrollRef.current) {
        programmaticScrollRef.current = false;
        return;
      }
      // User swipe finished — sync from the leftmost visible slide.
      syncIndexFromLeftEdge();
    };

    const onPointerDown = () => {
      cancelAutoAdvance();
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    track.addEventListener("scrollend", onScrollEnd);
    track.addEventListener("pointerdown", onPointerDown);

    return () => {
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("scrollend", onScrollEnd);
      track.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      return;
    }

    autoAdvanceTimerRef.current = setTimeout(() => {
      if (userInteractedRef.current) return;
      scrollToIndex(1, true);
      autoAdvanceTimerRef.current = null;
    }, AUTO_ADVANCE_MS);

    return () => {
      if (autoAdvanceTimerRef.current != null) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
    // Intentionally mount-only: one scheduled advance, never resumed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="relative md:px-11"
      aria-labelledby={labelId}
      aria-roledescription="carousel"
    >
      <h2 id={labelId} className="sr-only">
        Highlights
      </h2>

      <button
        type="button"
        className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--foreground)] opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:inline-flex"
        aria-label="Previous highlight"
        onClick={() => scrollByDirection("prev")}
      >
        <ChevronIcon direction="prev" />
      </button>

      <button
        type="button"
        className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--foreground)] opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 md:inline-flex"
        aria-label="Next highlight"
        onClick={() => scrollByDirection("next")}
      >
        <ChevronIcon direction="next" />
      </button>

      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto scroll-smooth motion-reduce:scroll-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        aria-label="Highlight banners"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollByDirection("prev");
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollByDirection("next");
          }
        }}
      >
        {SLIDES.map((slide, index) => {
          const isPrimary = slide.kind === "primary";
          return (
            <button
              key={slide.id}
              type="button"
              className={`flex min-h-[4.75rem] w-[min(100%,18.5rem)] snap-start shrink-0 flex-col justify-center rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-[min(100%,17rem)] md:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)] ${
                isPrimary
                  ? "border-[var(--border)] bg-[linear-gradient(135deg,var(--surface-elevated)_0%,var(--surface)_100%)]"
                  : "border-dashed border-[var(--section-line)] bg-[var(--surface)]/70"
              } ${activeIndex === index ? "ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]" : ""}`}
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} of ${SLIDES.length}`}
              aria-current={activeIndex === index ? "true" : undefined}
              onClick={() => {
                cancelAutoAdvance();
                scrollToIndex(index, true);
              }}
            >
              {isPrimary ? (
                <p className="text-sm font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[0.95rem]">
                  {slide.title}
                </p>
              ) : (
                <>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
                    {slide.title}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-[var(--muted)]">
                    {slide.body}
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
