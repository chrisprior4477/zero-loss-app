import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { HeroSection } from "./HeroSection";

vi.mock("next/image", () => ({ default: () => <span /> }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test.each([false, true])("How It Works keeps a compact close control outside the moving slides (desktop: %s)", (desktop) => {
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query.includes("min-width") ? desktop : true })));
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const scrollIntoView = vi.fn();
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = scrollIntoView;

  try {
    render(<HeroSection />);
    const trigger = screen.getByRole("button", { name: "How It Works" });
    fireEvent.click(trigger);

    const panel = screen.getByRole("region", { name: "How ZeroLoss works" });
    const rail = screen.getByRole("region", { name: "How ZeroLoss works, five swipeable steps" });
    const closeButtons = screen.getAllByRole("button", { name: "Close How It Works" });
    const close = desktop ? closeButtons.find((button) => !rail.contains(button)) : closeButtons.find((button) => rail.contains(button));
    expect(screen.queryByRole("link", { name: "Open the full How It Works page →" })).toBeNull();
    expect(closeButtons).toHaveLength(6);
    expect(panel.contains(close ?? null)).toBe(true);
    expect(close?.className).toContain("absolute right-1 top-1");
    expect(close?.querySelector("span")?.className).toContain("bg-[#a0ff00]");
    for (const slide of rail.querySelectorAll("[data-explainer-step]")) {
      expect(slide.querySelector('button[aria-label="Close How It Works"]')).toBeTruthy();
    }

    fireEvent.click(close!);
    expect(screen.queryByRole("region", { name: "How ZeroLoss works" })).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(scrollIntoView).toHaveBeenCalled();
  } finally {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  }
});
