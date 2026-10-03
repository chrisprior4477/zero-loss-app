import { describe, expect, it } from "vitest";
import { renderFavoriteAlertEmail } from "./favorite-alert-email";

const example = {
  title: "$100 Publix Gift Card", sold: 271, capacity: 300,
  offerHref: "https://mvp.getzeroloss.com/items/publix-100-gift-card",
  preferencesHref: "https://mvp.getzeroloss.com/account/notifications#favorite-alert-preference",
};

describe("Favorites watchlist email", () => {
  it("states current capacity and links to the saved item and opt-out", () => {
    const email = renderFavoriteAlertEmail(example);
    expect(email.text).toContain("90% full");
    expect(email.text).toContain("29 of 300 entries remain");
    expect(email.text).toContain("does not reserve an entry");
    expect(email.html).toContain(example.offerHref);
    expect(email.html).toContain(example.preferencesHref);
  });
  it("rejects closed or not-yet-almost-full offers and escapes titles", () => {
    expect(() => renderFavoriteAlertEmail({ ...example, sold: 300 })).toThrow();
    expect(() => renderFavoriteAlertEmail({ ...example, sold: 269 })).toThrow();
    expect(renderFavoriteAlertEmail({ ...example, title: "<script>" }).html).toContain("&lt;script&gt;");
  });
});
