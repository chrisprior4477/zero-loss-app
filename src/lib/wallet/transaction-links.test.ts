import { expect, test } from "vitest";
import { storedActivityFixture } from "@/lib/account/activity.test-fixture";
import { transactionLinks } from "./transaction-links";
import { transactionOriginHref } from "./ledger-return";
import { accountReturnPath } from "@/lib/auth/account-return";

const active = { ...storedActivityFixture().activity[0], entryId: `ent_${"1".repeat(32)}` };
const option = { ...storedActivityFixture().activity[2], entryId: `ent_${"2".repeat(32)}` };
const row = { id: "ledger", entry_type: "ENTRY_DEBIT", amount: -100, created_at: "2026-10-24T12:00:00Z" };

test("a declined option preserves the original Orders filter through the wallet return", () => {
  const transaction = "eea18423-dbb7-4559-a353-29788146df22";
  const declined = { ...option, completionOptionStatus: "declined" as const, completionOptionId: "515aed39-2586-452d-9796-ddac413d9673" };
  const [link] = transactionLinks({ ...row, id: transaction, entryIds: [declined.entryId] }, [declined], true, "fulfilled");
  const origin = Object.fromEntries(new URL(accountReturnPath(link.href)!, "https://demo.test").searchParams);
  expect(transactionOriginHref(origin)).toBe(`/account/wallet?view=history&transaction=${transaction}&walletView=1&panel=transactions&fromOrders=1&orderFilter=fulfilled#transaction-${transaction}`);
});

test("a debit opens its recorded entry, not another entry for the same product", () => {
  const duplicate = { ...active, entryId: `ent_${"3".repeat(32)}` };
  expect(transactionLinks({ ...row, entryIds: [active.entryId] }, [duplicate, active]))
    .toEqual([{ id: active.entryId, href: `/account/entries/${active.entryId}?entries=open&transaction=${row.id}#saved-entry-rail`, label: "View entry" }]);
});

test("a batch reservation retains each entry and its current outcome", () => {
  const links = transactionLinks({ ...row, entryIds: [active.entryId, option.entryId, active.entryId] }, [active, option]);
  expect(links).toHaveLength(2);
  expect(links[1].href).toBe(`/account/purchase-options/${option.slug}?option=${option.entryId}&transaction=${row.id}#purchase-option-rail`);
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

test("reservation rows omit gift-card links while the exact purchase keeps its result", () => {
  const purchased = { ...option, status: "completed" as const, rewardId: "purchased-reward", rewardStatus: "ready" as const };
  const linkedRow = { ...row, entryIds: [purchased.entryId, active.entryId] };
  for (const entry_type of ["ENTRY_HOLD", "ENTRY_HOLD_RELEASE"]) {
    expect(transactionLinks({ ...linkedRow, entry_type }, [purchased, active]).map(link => link.id)).toEqual([active.entryId]);
  }
  const [result] = transactionLinks({ ...linkedRow, entry_type: "PURCHASE_DEBIT" }, [purchased, active], true);
  expect(result.href).toBe(`/account/wallet?reward=${purchased.slug}&rewardId=purchased-reward&transaction=${row.id}&walletView=1`);
});
