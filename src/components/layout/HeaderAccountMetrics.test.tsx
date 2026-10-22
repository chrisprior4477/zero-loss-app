import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { HeaderAccountMetrics } from "./HeaderAccountMetrics";

afterEach(cleanup);
const activityState = { activeCount: 17, activity: [], source: "stored" as const, isPreview: false };

test.each([
  ["$0.00", false], ["$10", false], ["$999", false], ["$999.99", false],
  ["$1000", true], ["$1,000.00", true], ["$1010", true], ["$10,000", true],
  [null, false], ["Unavailable", false],
] as const)("balance %s marks whether the mobile logo needs extra room", (balance, large) => {
  render(<HeaderAccountMetrics isSignedIn liveBalance={balance} activityState={activityState} />);
  const wallet = screen.getByRole("link", { name: `${balance ?? "Unavailable"} playable balance` });
  expect(wallet.hasAttribute("data-header-large-balance")).toBe(large);
  expect(wallet.getAttribute("href")).toBe("/account/wallet?view=history#balance");
  expect(wallet.textContent).toBe(balance ?? "Unavailable");
});

test("the fit marker follows balance updates in both directions without changing the amount", () => {
  const view = render(<HeaderAccountMetrics isSignedIn liveBalance="$999" activityState={activityState} />);
  const wallet = screen.getByRole("link", { name: "$999 playable balance" });
  expect(wallet.hasAttribute("data-header-large-balance")).toBe(false);
  view.rerender(<HeaderAccountMetrics isSignedIn liveBalance="$1000" activityState={activityState} />);
  expect(wallet.getAttribute("data-header-large-balance")).toBe("true");
  view.rerender(<HeaderAccountMetrics isSignedIn liveBalance="$999.99" activityState={activityState} />);
  expect(wallet.hasAttribute("data-header-large-balance")).toBe(false);
  expect(wallet.textContent).toBe("$999.99");
});

test("signed-out headers never enable balance fitting", () => {
  const { container } = render(<HeaderAccountMetrics isSignedIn={false} liveBalance="$1000" activityState={activityState} />);
  expect(container.querySelector("[data-header-large-balance]")).toBeNull();
});
