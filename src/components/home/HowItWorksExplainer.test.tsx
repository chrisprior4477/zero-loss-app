import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) =>
    <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-src={src} />,
}));

import { HowItWorksExplainer } from "./HowItWorksExplainer";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("uses the supplied five-step artwork with seam arrows and no redundant carousel copy", () => {
  render(<HowItWorksExplainer />);

  const fullImage = screen.getByRole("img", { name: /How ZeroLoss works in five steps/ });
  expect(fullImage.getAttribute("data-src")).toBe("/how-it-works-five-steps-option-b.png");

  const strip = screen.getByRole("region", { name: "How ZeroLoss works, five swipeable steps" });
  expect(within(strip).getAllByRole("img")).toHaveLength(5);
  expect(within(strip).getByRole("img", { name: /Step 4: Didn't win/ })).toBeTruthy();
  expect(screen.queryByText("Swipe through the five steps")).toBeNull();
  expect(screen.queryByRole("button", { name: "Previous how-it-works step" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next how-it-works step" })).toBeNull();
  expect(within(strip).getAllByRole("button", { name: /Show how it works step/ })).toHaveLength(4);
  const scrollTo = vi.fn();
  Object.defineProperty(strip, "scrollTo", { value: scrollTo });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  fireEvent.click(within(strip).getByRole("button", { name: "Show how it works step 2 of 5" }));
  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
});
