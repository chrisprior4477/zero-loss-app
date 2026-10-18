import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { HeroSection } from "./HeroSection";

vi.mock("next/image", () => ({ default: () => <span /> }));
vi.mock("./HowItWorksExplainer", () => ({ HowItWorksExplainer: () => <div>Five steps</div> }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test.each([false, true])("How It Works has side-by-side page and Close actions (desktop: %s)", (desktop) => {
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
    const pageLink = screen.getByRole("link", { name: "Open the full How It Works page →" });
    const close = screen.getByRole("button", { name: "Close" });
    expect(panel.contains(pageLink)).toBe(true);
    expect(pageLink.getAttribute("href")).toBe("/how-it-works");
    expect(pageLink.parentElement).toBe(close.parentElement);

    fireEvent.click(close);
    expect(screen.queryByRole("region", { name: "How ZeroLoss works" })).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(scrollIntoView).toHaveBeenCalled();
  } finally {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  }
});
