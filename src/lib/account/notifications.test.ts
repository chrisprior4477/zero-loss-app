import { expect, test } from "vitest";
import { storedActivityFixture } from "./activity.test-fixture";
import { buildAccountNotifications } from "./notifications";

test("same-product purchase options have distinct notifications and exact entry links", () => {
  const state = storedActivityFixture();
  const first = state.activity[2];
  first.entryId = "entry-one";
  first.completionOptionId = "option-one";
  state.activity.push({ ...first, entryId: "entry-two", completionOptionId: "option-two" });

  const options = buildAccountNotifications(state, null, true).filter(notification => notification.href.includes("nike-court-shot-shoes"));
  expect(options.map(option => option.id)).toEqual(["completion-option-one", "completion-option-two"]);
  expect(options.map(option => option.href)).toEqual([
    "/account/entries?item=nike-court-shot-shoes&entry=entry-one",
    "/account/entries?item=nike-court-shot-shoes&entry=entry-two",
  ]);
});

test("email confirmation produces a new unread account notification", () => {
  const unconfirmed = buildAccountNotifications(storedActivityFixture(), null, false).find((item) => item.category === "account");
  const confirmed = buildAccountNotifications(storedActivityFixture(), null, true).find((item) => item.category === "account");
  expect(unconfirmed?.id).toBe("account-email-unconfirmed");
  expect(confirmed?.id).toBe("account-email-confirmed");
});
