import { describe, expect, it } from "vitest";
import { renderDeclinedReminderEmail } from "./declined-reminder-email";

describe("requested declined-offer reminder", () => {
  const input = {
    title: "$50 Best Buy Gift Card",
    retailer: "Best Buy",
    deadline: "2026-11-09T18:28:00Z",
    reviewHref: "https://mvp.getzeroloss.com/account/declined-offers",
  };

  it("uses the approved optional wording and Eastern deadline", () => {
    const message = renderDeclinedReminderEmail(input);
    expect(message.subject).toBe("The offer you declined expires in two days");
    expect(message.text).toContain("You asked us to remind you");
    expect(message.text).toContain("Revival is optional");
    expect(message.text).toContain("Eastern Time");
    expect(message.html).toContain(input.reviewHref);
  });

  it("escapes customer-facing values and rejects insecure links", () => {
    expect(renderDeclinedReminderEmail({ ...input, title: "<script>" }).html).toContain("&lt;script&gt;");
    expect(() => renderDeclinedReminderEmail({ ...input, reviewHref: "http://example.com" })).toThrow();
  });
});
