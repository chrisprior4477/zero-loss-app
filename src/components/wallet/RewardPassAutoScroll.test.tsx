import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { RewardPassAutoScroll } from "./RewardPassAutoScroll";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup(matches: boolean) {
  const scrollIntoView = vi.fn();
  const pass = document.createElement("div");
  pass.id = "reward-pass";
  pass.scrollIntoView = scrollIntoView;
  document.body.appendChild(pass);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches })));
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
    callback(0);
    return 1;
  });
  return { pass, scrollIntoView };
}

test("mobile reward arrival scrolls every selected pass beneath the header", () => {
  const { pass, scrollIntoView } = setup(true);
  const { rerender } = render(<RewardPassAutoScroll rewardKey="first-reward" />);
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "auto" });

  rerender(<RewardPassAutoScroll rewardKey="second-reward" />);
  expect(scrollIntoView).toHaveBeenCalledTimes(2);
  pass.remove();
});

test("desktop reward arrival does not move the page", () => {
  const { pass, scrollIntoView } = setup(false);
  render(<RewardPassAutoScroll rewardKey="reward" />);
  expect(scrollIntoView).not.toHaveBeenCalled();
  pass.remove();
});
