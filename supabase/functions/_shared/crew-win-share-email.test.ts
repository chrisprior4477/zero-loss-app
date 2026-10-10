import { expect, test } from "vitest";
import { renderCrewWinShareEmail } from "./crew-win-share-email";

test("win update email contains no reward credentials", () => {
  const email = renderCrewWinShareEmail({ senderName: "Alex", title: "$100 Walmart Gift Card", updateHref: "https://mvp.getzeroloss.com/account/crew?member=abc#shared-picks", preferencesHref: "https://mvp.getzeroloss.com/account/notifications#crew-win-email-preference" });
  expect(email.subject).toBe("Alex shared an update with their Crew");
  expect(email.text).toContain("We do not include gift-card numbers");
  expect(email.html).toContain("Manage Crew win emails");
});

test("escapes the sender and title", () => {
  const email = renderCrewWinShareEmail({ senderName: "A&B", title: "<Gift>", updateHref: "https://mvp.getzeroloss.com/account/crew", preferencesHref: "https://mvp.getzeroloss.com/account/notifications" });
  expect(email.html).toContain("A&amp;B");
  expect(email.html).toContain("&lt;Gift&gt;");
});
