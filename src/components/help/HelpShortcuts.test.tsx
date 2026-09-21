import { afterEach, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HelpShortcuts, helpShortcuts } from "./HelpShortcuts";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
afterEach(cleanup);

test("a single ready reward opens its exact owner-authorized reward without the collection detour", () => {
  const state = storedActivityFixture();
  state.activity[1].rewardId = "11111111-1111-4111-8111-111111111111";
  state.activity[1].rewardStatus = "ready";
  render(<HelpShortcuts activity={state} />);
  expect(screen.getByRole("link", { name: /Open my reward/ }).getAttribute("href")).toBe(`/account/wallet?reward=samsung-m70h-tv&rewardId=${state.activity[1].rewardId}`);
});
test("a single available purchase option goes directly to its review, never submits payment", () => {
  const state = storedActivityFixture();
  state.activity[2].completionOptionStatus = "available";
  state.activity[2].entryId = "ent_shoe_one";
  state.activity[3].completionOptionStatus = "purchased";
  expect(helpShortcuts(state)[1].href).toBe("/account/entries?item=nike-court-shot-shoes&entry=ent_shoe_one&filter=completion");
});
test("multiple choices, unavailable activity and closed rewards use safe collection paths", () => {
  const state = storedActivityFixture();
  state.activity[2].completionOptionStatus = "available";
  state.activity[3].completionOptionStatus = "available";
  state.activity[1].rewardStatus = "expired";
  expect(helpShortcuts(state).map(item => item.href)).toEqual(["/account/wallet", "/account/entries?filter=completion", "/account/wallet?view=history"]);
  state.source = "unavailable";
  expect(helpShortcuts(state)).toEqual(helpShortcuts());
});
