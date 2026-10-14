import { expect, test } from "vitest";
import { entryReceiptHref } from "./request";

test("a closed pool opens the exact purchase option in My Activity", () => {
  expect(entryReceiptHref({ status: "not_selected", entryId: "ent_1234" }, "dunkin-25-gift-card"))
    .toBe("/account/entries?filter=completion&item=dunkin-25-gift-card&entry=ent_1234");
});

test("a winner opens its exact wallet reward and an open entry stays in Open Entries", () => {
  expect(entryReceiptHref({ status: "winner", rewardId: "11111111-1111-4111-8111-111111111111" }, "dunkin-25-gift-card"))
    .toBe("/account/wallet?reward=dunkin-25-gift-card&rewardId=11111111-1111-4111-8111-111111111111");
  expect(entryReceiptHref({ status: "active", entryId: "ent_1234" }, "netflix-25-gift-card"))
    .toBe("/account/entries?filter=active&item=netflix-25-gift-card&entry=ent_1234");
});
