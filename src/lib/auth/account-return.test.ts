import { expect, test } from "vitest";
import { accountPageReturnPath, accountReturnPath } from "./account-return";
import { authNavigationHref, signInReturnPath, signupVerificationPath } from "./entry-return";
const id = "11111111-1111-4111-8111-111111111111";
const destinations = [
  `/account/wallet?reward=samsung-m70h-tv&rewardId=${id}`,
  `/account/wallet?rewardId=${id}`, "/account/wallet", "/account/wallet?rewards=history", "/account/wallet?view=card",
  `/account/wallet?view=history&transaction=${id}#transaction-${id}`,
  "/account/entries?item=nike-court-shot-shoes&entry=ent_123&filter=completion",
  "/account/entries?filter=active", "/account/orders", "/account/security", "/account/profile", "/account/notifications",
  `/account/crew?tab=requests&request=${id}#crew-request-${id}`, "/account/crew?tab=picks#sharing",
  `/account/crew?member=${id}`, `/support?case=${id}#conversation`, `/support?transaction=${id}`,
  "/support?view=inbox&page=2#case-list", `/support?case=${id}&messages=2#conversation`, "/support",
];
test.each(destinations)("preserves the approved destination through every auth step: %s", destination => {
  expect(accountReturnPath(destination)).toBe(destination);
  expect(signInReturnPath(destination)).toBe(destination);
  for (const href of [authNavigationHref("/login", destination), authNavigationHref("/signup", destination), signupVerificationPath(destination)]) {
    expect(new URL(href, "https://example.test").searchParams.get("next")).toBe(destination);
  }
});
test.each([
  "https://evil.test/account/wallet", "//evil.test/account/wallet", "/\\evil.test/account/wallet",
  "/account/../support", "/account/%2e%2e/support", "/account/wallet\n", "/account/wallet?next=https://evil.test",
  "/account/wallet?rewardId=bad", `/account/wallet?rewardId=${id}&rewardId=${id}`,
  "/account/wallet?view=history&from=https%3A%2F%2Fevil.test", "/account/wallet#javascript:alert(1)",
  "/support?case=bad", "/support?view=admin", "/support?page=-1", "/support?page=1.5", "/support?token=secret",
  "/account/entries?entry=%0A", "/account/entries?filter=unknown", "/account/crew?tab=admin", "/api/admin", "/auth/confirm",
  null, ["/account/wallet"], "javascript:alert(1)", "/account/wallet?constructor=x",
])("rejects malformed, foreign or unsupported auth return: %s", value => expect(signInReturnPath(value)).toBeNull());
test("page builders forward only approved selectors and reject ambiguous selectors", () => {
  expect(accountPageReturnPath("/account/wallet", { reward: "samsung-m70h-tv", rewardId: id, token: "do-not-forward" }))
    .toBe(`/account/wallet?reward=samsung-m70h-tv&rewardId=${id}`);
  expect(accountPageReturnPath("/account/wallet", { reward: "samsung-m70h-tv", rewardId: [id, id] })).toBe("/account/wallet");
  expect(accountPageReturnPath("/account/wallet", { reward: "samsung-m70h-tv", rewardId: "bad" })).toBe("/account/wallet");
});
