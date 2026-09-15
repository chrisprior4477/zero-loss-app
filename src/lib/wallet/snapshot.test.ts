import { describe, expect, test } from "vitest";
import { parseWalletSnapshot } from "./snapshot";

const empty = { walletAccountId: null, scope: "production", currency: "USD", balanceCents: "0", transactionCount: "0", fundingAvailable: false, entries: [] };

describe("authoritative wallet snapshot", () => {
  test("only a complete zero response becomes an empty wallet", () => {
    expect(parseWalletSnapshot(empty).balanceCents).toBe(0);
    for (const bad of [null, undefined, {}, { ...empty, balanceCents: undefined }]) {
      expect(() => parseWalletSnapshot(bad)).toThrow();
    }
  });
  test("rejects balances that would silently round in JavaScript", () => {
    expect(() => parseWalletSnapshot({ ...empty, balanceCents: "9007199254740993" })).toThrow();
  });
  test("rejects mixed currency, missing demo identity, and truncated history", () => {
    for (const patch of [{ currency: "EUR" }, { scope: "demo" }, { transactionCount: "1" }]) {
      expect(() => parseWalletSnapshot({ ...empty, ...patch })).toThrow();
    }
  });
  test("supports negative balances for an actual recorded reversal rather than clamping to zero", () => {
    const row = { id: "entry-1", entry_type: "CORRECTION", amount: -100, created_at: "2026-09-14T12:00:00Z" };
    expect(parseWalletSnapshot({ ...empty, walletAccountId: "33333333-3333-4333-8333-333333333333", balanceCents: "-100", transactionCount: "1", entries: [row] }).balanceCents).toBe(-100);
  });
});
