import { expect, test } from "vitest";
import { renderRewardDeadlineEmail, renderRewardReadyEmail } from "./reward-email";

const base = { title: "$100 Walmart Gift Card", retailer: "Walmart", giftCardValueCents: 10000, rewardHref: "https://mvp.getzeroloss.com/account/wallet?rewardId=test" };

test("ready email links to the private account without the gift-card number", () => {
  const email = renderRewardReadyEmail(base);
  expect(email.subject).toBe("Your Walmart reward is ready");
  expect(email.text).toContain("gift-card number is available only inside your account");
  expect(email.html).toContain("Open my reward");
});

test("deadline email uses Eastern time and a real claim date", () => {
  const email = renderRewardDeadlineEmail({ ...base, deadline: "2026-11-09T05:00:00Z", reminderKey: "7d" });
  expect(email.subject).toContain("November 9, 2026");
  expect(email.text).toContain("If you already claimed it, no action is needed.");
  expect(email.html).toContain("View my reward");
});

test("escapes retailer and title", () => {
  const email = renderRewardReadyEmail({ ...base, retailer: "A&B", title: "<Gift>" });
  expect(email.html).toContain("A&amp;B");
  expect(email.html).toContain("&lt;Gift&gt;");
});
