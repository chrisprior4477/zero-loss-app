import { expect, test } from "vitest";
import { renderPurchaseOptionReminderEmail } from "./purchase-option-reminder-email";

const input = {
  title: "$100 Walmart Gift Card", retailer: "Walmart", giftCardValueCents: 10000,
  remainingCents: 9900, deadline: "2026-11-09T05:00:00.000Z",
  reminderKey: "7d" as const,
  reviewHref: "https://mvp.getzeroloss.com/account/entries?entry=ent_test",
  preferencesHref: "https://mvp.getzeroloss.com/account/notifications#email-preferences",
};

test("renders the approved 7-day reminder with no charge or reservation language", () => {
  const email = renderPurchaseOptionReminderEmail(input);
  expect(email.subject).toBe("Your Walmart purchase option ends in 7 days");
  expect(email.text).toContain("remaining price is $99.00");
  expect(email.text).toContain("there is nothing you need to do");
  expect(email.html).toContain("Manage purchase-option emails");
});

test("renders the 24-hour variant and escapes customer-facing text", () => {
  const email = renderPurchaseOptionReminderEmail({ ...input, retailer: "A&B <Store>", reminderKey: "24h" });
  expect(email.subject).toContain("tomorrow");
  expect(email.html).toContain("A&amp;B &lt;Store&gt;");
  expect(email.html).not.toContain("A&B <Store>");
});
