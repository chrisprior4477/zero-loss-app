"use client";

import { type PointerEvent as ReactPointerEvent, useRef } from "react";
import Image from "next/image";
import styles from "./HowItWorksExplainer.module.css";

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
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const rail = railRef.current;
    if (!rail) return;
    dragRef.current = { active: true, moved: false, startX: event.clientX, scrollLeft: rail.scrollLeft };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const drag = dragRef.current;
    if (!rail || !drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 5) {
      drag.moved = true;
      rail.dataset.dragging = "true";
      if (!rail.hasPointerCapture(event.pointerId)) rail.setPointerCapture(event.pointerId);
    }
    if (drag.moved) {
      event.preventDefault();
      rail.scrollLeft = drag.scrollLeft - distance;
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    const drag = dragRef.current;
    drag.active = false;
    if (!rail) return;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    if (!drag.moved) return;
    rail.dataset.dragging = "false";
    const cards = [...rail.querySelectorAll<HTMLElement>("[data-explainer-step]")];
    const railLeft = rail.getBoundingClientRect().left;
    const closest = cards.reduce<HTMLElement | null>((best, card) =>
      !best || Math.abs(card.getBoundingClientRect().left - railLeft) < Math.abs(best.getBoundingClientRect().left - railLeft) ? card : best, null);
    if (closest) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      rail.scrollTo({ left: rail.scrollLeft + closest.getBoundingClientRect().left - railLeft, behavior: reducedMotion ? "instant" : "smooth" });
    }
  }

  function cancelDrag() {
    dragRef.current.active = false;
    if (railRef.current) railRef.current.dataset.dragging = "false";
  }

  function showStep(index: number) {
    const rail = railRef.current;
    const nextStep = rail?.querySelectorAll<HTMLElement>("[data-explainer-step]")[index];
    if (!rail || !nextStep) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({
      left: rail.scrollLeft + nextStep.getBoundingClientRect().left - rail.getBoundingClientRect().left,
      behavior: reducedMotion ? "instant" : "smooth",
    });
  }

  return (
    <div>
      <Image
        src={IMAGE_SRC}
        alt="How ZeroLoss works in five steps: pick a product, enter for $1, receive the full-value retailer gift card if you win, or use what you spent toward the balance if you don't; then use the gift card at that retailer."
        width={IMAGE_WIDTH}
        height={IMAGE_HEIGHT}
        sizes="(min-width: 1024px) 1440px, 100vw"
        className={styles.desktopArtwork}
        unoptimized
      />

      <div
        ref={railRef}
        role="region"
        aria-label="How ZeroLoss works, five swipeable steps"
        tabIndex={0}
        className={`${styles.rail} zl-noscroll`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancelDrag}
        onDragStart={(event) => event.preventDefault()}
      >
        {steps.map((step, index) => {
          const cropWidth = step.end - step.start;
          return (
            <div key={step.start} data-explainer-step className={styles.stepSlot}>
              <div role="img" aria-label={step.description} className={styles.step}>
                <Image
                  src={IMAGE_SRC}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  width={IMAGE_WIDTH}
                  height={IMAGE_HEIGHT}
                  sizes="1600px"
                  className={styles.stepArtwork}
                  style={{ width: `${(IMAGE_WIDTH / cropWidth) * 100}%`, left: `-${(step.start / cropWidth) * 100}%` }}
                  loading={index === 0 ? "eager" : "lazy"}
                  unoptimized
                />
              </div>
              {index < steps.length - 1 ? (
                <button
                  type="button"
                  aria-label={`Show how it works step ${index + 2} of ${steps.length}`}
                  className={styles.lightningArrow}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => showStep(index + 1)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
