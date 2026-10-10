import { describe, expect, it } from "vitest";
import { renderOutcomeEmail, type OutcomeEmailInput } from "./outcome-email";

const base: OutcomeEmailInput = {
  kind: "paid_not_selected", title: "$50 Headphones", retailer: "Best Buy", giftCardValueCents: 5000,
  paidCents: 100, completionCents: 4900, completionDeadline: "2026-11-01T18:00:00.000Z",
  entryHref: "https://example.test/account/entries?entry=ent_123", rewardHref: null,
  preferencesHref: "https://example.test/account/notifications#email-preferences", preview: true,
};

describe("outcome emails", () => {
  it("shows the exact paid-entry completion difference", () => {
    const result = renderOutcomeEmail(base);
    expect(result.text).toContain("pay the remaining $49");
    expect(result.text).toContain("$1 entry amount");
    expect(result.text).toContain("Separate entries do not combine");
    expect(result.text).toContain("Turn them off in Email preferences");
    expect(result.html).toContain('href="https://example.test/account/notifications#email-preferences"');
  });
  it("charges the full value for a free AMOE entry", () => {
    const result = renderOutcomeEmail({ ...base, kind: "amoe_not_selected", paidCents: 0, completionCents: 5000 });
    expect(result.subject).toBe("Your free-entry result is ready: $50 Headphones");
    expect(result.subject).not.toBe(renderOutcomeEmail(base).subject);
    expect(result.text).toContain("for $50");
    expect(result.text).toContain("no entry payment is applied");
  });
  it("never offers a winner an optional purchase", () => {
    const result = renderOutcomeEmail({ ...base, kind: "winner", completionCents: null, completionDeadline: null, rewardHref: "https://example.test/account/wallet?reward=headphones" });
    expect(result.text).toContain("YOU WON");
    expect(result.text).not.toContain("complete the purchase");
    expect(result.text).toContain("You never need to pay to receive a prize you won.");
  });
  it("rejects a free-entry discount and escapes offer content", () => {
    expect(() => renderOutcomeEmail({ ...base, kind: "amoe_not_selected", paidCents: 0 })).toThrow();
    expect(renderOutcomeEmail({ ...base, title: "<script>" }).html).toContain("&lt;script&gt;");
  });
});
