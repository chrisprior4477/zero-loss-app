import { expect, test } from "vitest";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { resolvedProductDestination } from "./resolved-destination";

test("an unclaimed win opens its exact authorized reward; a claimed win opens the same record", () => {
  const state = storedActivityFixture();
  const prize = state.activity[1];
  prize.rewardId = "owned-reward";
  prize.rewardStatus = "ready";
  expect(resolvedProductDestination(state, prize.slug)).toMatchObject({ href: "/account/wallet?reward=samsung-m70h-tv&rewardId=owned-reward", label: "Claim your reward" });
  prize.rewardClaimedAt = "2026-10-25T12:00:00Z";
  expect(resolvedProductDestination(state, prize.slug)).toMatchObject({ href: "/account/wallet?reward=samsung-m70h-tv&rewardId=owned-reward", label: "View your reward" });
});

test("an available purchase option opens its product's option page, then its purchased reward", () => {
  const state = storedActivityFixture();
  const option = state.activity[2];
  expect(resolvedProductDestination(state, option.slug)).toMatchObject({ href: "/account/purchase-options/nike-court-shot-shoes", label: "View your purchase option" });
  Object.assign(option, { status: "completed", rewardId: "purchased-reward", rewardStatus: "ready", rewardSource: "purchase", rewardClaimedAt: "2026-10-25T12:00:00Z", completionOptionStatus: "purchased" });
  expect(resolvedProductDestination(state, option.slug)).toMatchObject({ href: "/account/wallet?reward=nike-court-shot-shoes&rewardId=purchased-reward", label: "View your reward" });
});

test("multiple rewards never choose an arbitrary same-product card", () => {
  const state = storedActivityFixture();
  Object.assign(state.activity[1], { rewardId: "one", rewardStatus: "ready" });
  state.activity.push({ ...state.activity[1], rewardId: "two" });
  expect(resolvedProductDestination(state, state.activity[1].slug)?.href).toBe("/account/wallet");
});

test("declined and expired options are not presented as available purchases", () => {
  const state = storedActivityFixture();
  Object.assign(state.activity[2], { status: "completed", completionOptionStatus: "declined" });
  expect(resolvedProductDestination(state, state.activity[2].slug)?.href).toBe("/account/declined-offers");
  state.activity[2].completionOptionStatus = "expired";
  expect(resolvedProductDestination(state, state.activity[2].slug)?.label).toBe("View your saved result");
});

test("expired and pending rewards never invite another claim", () => {
  const state = storedActivityFixture();
  Object.assign(state.activity[1], { rewardId: "old", rewardStatus: "expired" });
  expect(resolvedProductDestination(state, state.activity[1].slug)?.label).toBe("View your reward");
  state.activity[1].rewardStatus = "issuance_pending";
  expect(resolvedProductDestination(state, state.activity[1].slug)?.label).toBe("View your reward");
});

test("signed-out, unavailable, unrelated, and still-open activity never gets a saved-result link", () => {
  const state = storedActivityFixture();
  expect(resolvedProductDestination(null, "samsung-m70h-tv")).toBeNull();
  expect(resolvedProductDestination({ ...state, source: "unavailable" }, "samsung-m70h-tv")).toBeNull();
  expect(resolvedProductDestination(state, "missing")).toBeNull();
  expect(resolvedProductDestination(state, state.activity[0].slug)).toBeNull();
});
