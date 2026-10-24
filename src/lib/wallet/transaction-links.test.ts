import { expect, test } from "vitest";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { transactionLinks } from "./transaction-links";

const active = { ...storedActivityFixture().activity[0], entryId: `ent_${"1".repeat(32)}` };
const option = { ...storedActivityFixture().activity[2], entryId: `ent_${"2".repeat(32)}` };
const row = { id: "ledger", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-10-24T12:00:00Z" };

test("a debit opens its recorded entry, not another entry for the same product", () => {
  const duplicate = { ...active, entryId: `ent_${"3".repeat(32)}` };
  expect(transactionLinks({ ...row, entryIds: [active.entryId] }, [duplicate, active]))
    .toEqual([{ id: active.entryId, href: `/account/entries/${active.entryId}`, label: "View entry" }]);
});

test("a batch reservation retains each entry and its current outcome", () => {
  const links = transactionLinks({ ...row, entryIds: [active.entryId, option.entryId, active.entryId] }, [active, option]);
  expect(links).toHaveLength(2);
  expect(links[1].href).toBe(`/account/purchase-options/${option.slug}?option=${option.entryId}#purchase-option-rail`);
});

test("unknown or other-account entries never get a guessed destination", () => {
  expect(transactionLinks({ ...row, entryIds: ["ent_unknown"] }, [active])).toEqual([]);
  expect(transactionLinks(row, [active])).toEqual([]);
});

test("won rewards open the wallet rather than an active-entry-only page", () => {
  const won = { ...active, status: "prize" as const, rewardId: "reward-1", rewardStatus: "ready" as const };
  const [link] = transactionLinks({ ...row, entryIds: [won.entryId] }, [won]);
  expect(link.href).toContain("/account/wallet");
  expect(link.href).toContain("reward-1");
  expect(link.label).toBe("View result");
});
