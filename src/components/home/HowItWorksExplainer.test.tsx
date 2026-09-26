import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) =>
    <span role={alt ? "img" : undefined} aria-label={alt || undefined} data-src={src} />,
}));

import { HowItWorksExplainer } from "./HowItWorksExplainer";

afterEach(cleanup);

test("uses the supplied five-step artwork at full width and as readable swipe panels", () => {
  render(<HowItWorksExplainer />);

  const fullImage = screen.getByRole("img", { name: /How ZeroLoss works in five steps/ });
  expect(fullImage.getAttribute("data-src")).toBe("/how-it-works-five-steps.png");

  const strip = screen.getByRole("region", { name: "How ZeroLoss works, five swipeable steps" });
  expect(within(strip).getAllByRole("img")).toHaveLength(5);
  expect(within(strip).getByRole("img", { name: /Step 4: Didn't win/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Previous how-it-works step" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Next how-it-works step" })).toBeTruthy();
});
