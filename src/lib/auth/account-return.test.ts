import { expect, test } from "vitest";
import { accountPageReturnPath, accountReturnPath } from "./account-return";
import { authNavigationHref, signInReturnPath, signupVerificationPath } from "./entry-return";
const id = "11111111-1111-4111-8111-111111111111";
const destinations = [
  `/account/favorites?tab=shared&share=${id}&view=declined`, "/account/favorites?tab=shared&view=declined",
  "/account/wallet?rewards=ready#ready-rewards", "/account/wallet?rewards=used#reward-history",
  "/account/wallet?rewards=expired#reward-history", "/account/wallet?rewards=history#reward-history",
  "/account/crew?tab=privacy#crew-privacy",
  `/account/orders?order=ord_123&support=report#order-ord_123`,
  `/account/orders?order=ord_123#order-ord_123`,
  `/account/orders?filter=fulfilled&rewardId=${id}#fulfillment-records`,
  "/account/wallet?view=history&panel=methods#payment-methods",
  "/account/wallet?view=history&panel=card#wallet-add-card",
  "/account/entries/ent_11111111111111111111111111111111?quantity=7&review=entry#additional-entry-checkout",
  "/account/entries/ent_11111111111111111111111111111111?filter=active&entries=open#saved-entry-rail",
  `/account/declined-offers?offer=${id}#declined-offer-${id}`,
  "/account/notifications?filter=account#notification-tickets-filters",
  "/contact", "/contact#message", "/account/purchase-options/publix",
  `/account/purchase-options/publix?option=ent_11111111111111111111111111111111&resume=wallet&choice=${id}`,
  `/account/purchase-options/publix?resume=wallet&choice=${id}`,
  "/account/purchase-options/publix?decline=confirm",
  `/account/wallet?reward=publix&rewardId=${id}&via=purchase#reward-pass`,
  `/account/wallet?reward=publix&rewardId=${id}&via=completed`,
  `/account/wallet?reward=publix&rewardId=${id}&transaction=${id}&walletView=1`,
  "/account/entries?filter=completed&viewed=ent_11111111111111111111111111111111#my-activity-filters",
  `/account/wallet?reward=samsung-m70h-tv&rewardId=${id}`,
  `/account/wallet?rewardId=${id}`, "/account/wallet", "/account/wallet?rewards=history", "/account/wallet?view=card",
  `/account/wallet?view=history&transaction=${id}#transaction-${id}`,
  "/account/entries?item=nike-court-shot-shoes&entry=ent_123&filter=completion",
  "/account/entries?item=nike-court-shot-shoes&entry=ent_123&filter=completion&from=purchase-options",
  "/account/entries?item=nike-court-shot-shoes&entry=ent_123&filter=completion&resume=purchase",
  "/account/entries?filter=active", "/account/favorites", "/account/orders", "/account/security", "/account/profile", "/account/notifications",
  `/account/favorites?tab=shared&share=${id}`, "/account/favorites?item=nike-court-shot-shoes", "/account/favorites#saved-items-heading",
  "/account/entries/ent_11111111111111111111111111111111", "/account/entries?viewed=ent_11111111111111111111111111111111",
  `/account/crew?tab=requests&request=${id}#crew-request-${id}`, "/account/crew?tab=picks#sharing", "/account/crew?tab=groups#crew-groups",
  `/account/crew?member=${id}`, `/account/crew?invite=${id}`, `/support?case=${id}#conversation`, `/support?transaction=${id}`,
  `/support?rewardId=${id}#report-problem`,
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
  "/account/favorites?tab=shared&view=unknown", "/account/favorites?tab=shared&view=available&view=declined",
  "/account/wallet?rewards=admin#reward-history", "/account/wallet?rewards=used&rewards=expired#reward-history",
  "/account/crew?tab=privacy&tab=crew#crew-privacy", "/account/crew?tab=privacy#outside",
  "/account/orders?order=ord_1&support=https%3A%2F%2Fevil.test", "/account/orders?order=ord_1&support=report&support=report",
  "/account/orders?order=ord_1&order=ord_2", "/account/orders?order=https%3A%2F%2Fevil.test", "/account/orders?rewardId=bad", "/account/orders?filter=admin",
  "/account/wallet?panel=methods", "/account/wallet?view=history&panel=admin", "/account/wallet?view=history&panel=methods&panel=card",
  "/account/entries/ent_11111111111111111111111111111111?quantity=7&quantity=9&review=entry",
  "https://evil.test/account/wallet", "//evil.test/account/wallet", "/\\evil.test/account/wallet",
  "/account/../support", "/account/%2e%2e/support", "/account/wallet\n", "/account/wallet?next=https://evil.test",
  "/account/wallet?rewardId=bad", `/account/wallet?rewardId=${id}&rewardId=${id}`,
  "/account/wallet?view=history&from=https%3A%2F%2Fevil.test", "/account/wallet#javascript:alert(1)",
  "/support?case=bad", "/support?view=admin", "/support?page=-1", "/support?page=1.5", "/support?token=secret",
  "/contact?next=https://evil.test", "/contact#unknown",
  "/account/purchase-options/publix?resume=outside", "/account/purchase-options/publix?choice=bad",
  "/account/purchase-options/publix?option=ent_11111111111111111111111111111111&choice=bad",
  "/account/purchase-options/publix?decline=confirm&decline=confirm", "/account/purchase-options/publix?next=https://outside.test",
  "/account/favorites?tab=other", "/account/favorites?share=bad", "/account/favorites?tab=shared&tab=favorites",
  "/account/entries?entry=%0A", "/account/entries?filter=unknown", "/account/favorites?next=https://evil.test", "/account/crew?tab=admin", "/account/crew?invite=bad", "/api/admin", "/auth/confirm",
  "/account/entries/ent_bad", "/account/entries/ent_11111111111111111111111111111111?next=evil",
  null, ["/account/wallet"], "javascript:alert(1)", "/account/wallet?constructor=x",
])("rejects malformed, foreign or unsupported auth return: %s", value => expect(signInReturnPath(value)).toBeNull());
test("page builders forward only approved selectors and reject ambiguous selectors", () => {
  expect(accountPageReturnPath("/account/wallet", { reward: "samsung-m70h-tv", rewardId: id, token: "do-not-forward" }))
    .toBe(`/account/wallet?reward=samsung-m70h-tv&rewardId=${id}`);
  expect(accountPageReturnPath("/account/wallet", { reward: "samsung-m70h-tv", rewardId: [id, id] })).toBe("/account/wallet");
  expect(accountPageReturnPath("/account/wallet", { reward: "samsung-m70h-tv", rewardId: "bad" })).toBe("/account/wallet");
});
test("ticket count is carried only with a specific funding return", () => {
  const destination = "/account/wallet?view=history&from=samsung-m70h-tv&quantity=4#add-funds";
  expect(signInReturnPath(destination)).toBe(destination);
  expect(accountPageReturnPath("/account/wallet", { view: "history", from: "samsung-m70h-tv", quantity: "4" }, "#add-funds")).toBe(destination);
  for (const invalid of ["/account/wallet?quantity=4", "/account/wallet?from=samsung-m70h-tv&quantity=4", "/account/wallet?view=history&from=samsung-m70h-tv&quantity=2147483648", "/account/wallet?view=history&from=samsung-m70h-tv&entry=ent_11111111111111111111111111111111&quantity=4"]) {
    expect(signInReturnPath(invalid)).toBeNull();
  }
});

test("Crew review links survive sign-in only for one of the eight known designs", () => {
  expect(accountPageReturnPath("/account/crew", { design: "8" })).toBe("/account/crew?design=8");
  expect(accountReturnPath("/account/crew?design=1")).toBe("/account/crew?design=1");
  expect(accountReturnPath("/account/crew?design=9")).toBeNull();
  expect(accountReturnPath("/account/crew?design=1&design=8")).toBeNull();
  expect(accountReturnPath("/account/crew?design=https://outside.test")).toBeNull();
});

test("Crew's exact person and pick survive sign-in with no new data access", () => {
  for (const member of [id, "sample-Daniel"]) {
    const path = `/account/crew?member=${member}&pick=dyson-v8-cordless-vacuum#crew-intro`;
    expect(signInReturnPath(path)).toBe(path);
    expect(accountPageReturnPath("/account/crew", { member, pick: "dyson-v8-cordless-vacuum" }, "#crew-intro")).toBe(path);
  }
  expect(signInReturnPath("/account/crew?member=sample-Unknown&pick=dyson-v8-cordless-vacuum#crew-intro")).toBeNull();
  expect(signInReturnPath(`/account/crew?member=${id}&pick=..%2Fwallet#crew-intro`)).toBeNull();
});


test("card-editor sign-in retains a valid purchase snapshot and rejects unrelated use", () => {
  const query = { view: "history", panel: "card", from: "nintendo-switch", entry: "ent_11111111111111111111111111111111", choice: id };
  const path = accountPageReturnPath("/account/wallet", query, "#wallet-add-card");
  expect(new URL(path, "https://example.test").searchParams.get("choice")).toBe(id);
  expect(signInReturnPath(path)).toBe(path);
  expect(accountReturnPath('/account/wallet?view=history&choice=' + id)).toBeNull();
  expect(accountReturnPath(path.replace('&entry=' + query.entry, ''))).toBeNull();
});
