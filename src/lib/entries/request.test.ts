import { expect, test } from "vitest";
import { entryReceiptHref, parseEntryRequest } from "./request";

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

test("accepted receipts keep their exact entry for My Activity highlighting", () => {
  const request = parseEntryRequest({
    requestId: "22222222-2222-4222-8222-222222222222",
    slug: "dunkin-25-gift-card", title: "$25 Dunkin Gift Card", quantity: 1, amountCents: 100,
    status: "accepted", undoUntil: "2026-10-14T12:00:00Z", serverNow: "2026-10-14T12:00:31Z",
    receipt: { status: "winner", entryId: "ent_1234", rewardId: "11111111-1111-4111-8111-111111111111" },
  });
  expect(request.entryId).toBe("ent_1234");
  expect(request.href).toContain("/account/wallet?reward=dunkin-25-gift-card");
});
