import { expect, test } from "vitest";
import { renderCrewPrizeShareEmail } from "./crew-prize-share-email";

test("includes approved consent and no-reservation language", () => {
  const email = renderCrewPrizeShareEmail({ senderName: "Alex", title: "$100 Walmart Gift Card", offerHref: "https://mvp.getzeroloss.com/items/walmart-100-gift-card" });
  expect(email.subject).toBe("Alex shared a prize with you");
  expect(email.text).toContain("does not reserve an entry");
  expect(email.text).toContain("View the prize:");
});

test("escapes names and titles", () => {
  const email = renderCrewPrizeShareEmail({ senderName: "A&B", title: "<Gift>", offerHref: "https://mvp.getzeroloss.com/items/gift" });
  expect(email.html).toContain("A&amp;B");
  expect(email.html).toContain("&lt;Gift&gt;");
});
