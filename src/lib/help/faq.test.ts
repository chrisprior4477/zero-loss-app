import { expect, test } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { faqCategories, faqItems, filterFaqs } from "./faq";

test.each([
  ["where do I find a reply to my report", "support-case"],
  ["one of my gift cards is missing after purchase", "order-issuance"],
  ["purchase payment succeeded but still processing", "order-issuance"],
  ["I do not want a purchase offer anymore", "decline-and-revive"],
  ["buy this prize without entering", "purchase-without-entry"],
  ["get refunded after I cancel a deposit", "deposit-cancellation"],
  ["favourite a prize from search", "favorites"],
  ["which products did I save", "favorites"],
  ["how do I remove a favorite", "favorites"],
  ["how do I see what my Crew sent", "crew-shared-with-you"],
  ["how do I find my group again", "crew-groups"],
  ["how to stop sharing future picks", "crew-future-sharing"],
  ["how do I edit my address", "mailing-address"],
  ["time shown in my transactions is wrong", "time-zone"],
  ["close the confirmation from Add funds", "deposit-cancellation"],
  ["what is posted vs pending", "posted-and-pending"],
  ["did not receive my signup email", "verification-email"],
  ["why did the store cancel my card order", "order-issuance"],
  ["how do I know gift card value vs what I paid", "order-receipt"],
  ["what if my prize filled while I was checking out", "entry-status"],
  ["not enough wallet balance for my tickets", "insufficient-balance"],
  ["deposit went through but my balance is still zero", "balance-discrepancy"],
  ["I entered and got charged but no ticket", "entry-status"],
  ["paid for item but no order", "order-receipt"],
  ["order confirmation never came", "order-receipt"],
  ["can I pay with two cards", "add-funds"],
  ["I selected the wrong saved card", "choose-deposit-card"],
  ["refund after purchase", "purchase-refund"],
  ["why did my saved offer disappear", "purchase-options"],
  ["how can I reactivate a declined offer", "decline-and-revive"],
  ["claim deadline has passed", "reward-unavailable"],
  ["where can I find the money I got for my unclaimed win", "reward-unavailable"],
  ["I did not receive my password reset email", "password"],
  ["the link to confirm my email expired", "verification-email"],
  ["changed my email and cannot sign in", "change-email"],
  ["close out my entire account", "privacy-requests"],
  ["remove my photo", "profile-photo"],
  ["stop notifications in the app", "notifications"],
  ["stop getting emails for favorites", "favorite-watchlist-emails"],
  ["stop sharing my own picks with a group", "stop-sharing"],
  ["how do I copy the order ID", "order-receipt"],
  ["see how much I spent on a prize", "wallet-history"],
  ["my gift card has no PIN", "open-reward"],
  ["where is the retailer redemption link", "open-reward"],
  ["why does my wallet say balance unavailable", "wallet-unavailable"],
  ["I entered twice by mistake", "undo-entry"],
  ["I did not make this purchase", "unauthorized-transaction"],
  ["funds taken twice", "funding-status"],
  ["report an unrecognized sign-in", "unrecognized-sign-in"],
  ["sign me out of all devices", "unrecognized-sign-in"],
  ["forgot my sign-in email", "forgot-sign-in-email"],
  ["select a different payment card", "choose-deposit-card"],
  ["change name on saved card", "edit-card-name"],
  ["credit after canceling my entry", "undo-entry"],
  ["will gift cards expire", "reward-unavailable"],
  ["get the card number again", "open-reward"],
  ["more than one entry", "multiple-entries"],
  ["expiration on purchase option", "purchase-options"],
  ["pool is full", "pool-completion"],
  ["turn notifications back on", "notifications"],
  ["stop someone sharing prizes with me", "stop-receiving-shares"],
  ["export my personal information", "privacy-requests"],
  ["how do i get a receipt for adding funds", "deposit-receipt"],
  ["which card did i use for a deposit", "deposit-receipt"],
  ["can i use a debit card", "add-funds"],
  ["can i change my default bank card", "default-card"],
  ["where do my declined options go", "decline-and-revive"],
  ["how do I stop people finding me by phone", "crew-discoverability"],
  ["turn off outcome emails", "email-alert-preferences"],
  ["stop reminders about a purchase option", "email-alert-preferences"],
  ["change email notification settings", "email-alert-preferences"],
  ["i lost my order number", "order-receipt"],
  ["where is my entry reference", "entry-reference"],
  ["why do i have two $25 netflix cards", "matching-rewards"],
  ["my birthdate is wrong", "birth-date"],
  ["i put the wrong card on my wallet", "delete-card"],
  ["why is my card declined", "funding-status"],
  ["payment went through but balance stayed the same", "balance-discrepancy"],
  ["what is my refund policy", "withdrawals"],
  ["can i cancel my last entry", "undo-entry"],
  ["why are my tickets missing", "entry-status"],
  ["I clicked enter but nothing happened", "entry-status"],
  ["missing a purchase option", "purchase-options"],
  ["a purchase option expired can I revive it", "decline-and-revive"],
  ["do I lose my money if I decline", "decline-and-revive"],
  ["copy my order number", "order-receipt"],
  ["the gift card says used but I never used it", "reward-unavailable"],
  ["get a gift card for someone else", "gift-transfers"],
  ["where can I see replies to my support ticket", "support-case"],
  ["can I add more detail to my support request", "support-case"],
  ["unsubscribe from prize emails", "email-alert-preferences"],
  ["hide my real name from crew", "crew-discoverability"],
  ["lost access to my email", "change-email"],
  ["can’t access my email", "change-email"],
  ["I used up my balance can I still enter", "insufficient-balance"],
  ["how do I tell if a hold turned into a ticket", "entry-status"],
  ["where can I get an itemized receipt for one ticket", "entry-receipt"],
  ["will the checkout send the prize or a gift card", "purchase-meaning"],
  ["which setting changes alerts inside the website", "notifications"],
  ["my gift card still says issuing", "reward-unavailable"],
  ["open an existing help conversation", "support-case"],
  ["how do I give you an idea for a product", "request-product"],
  ["is the gift card in this demo spendable", "mvp"],
  ["do you support loading funds with Apple Pay", "add-funds"],
  ["does the draw wait for every spot to sell", "pool-completion"],
])("routes %s to %s", (query, answer) => {
  expect(filterFaqs(query, "all")[0]?.id).toBe(answer);
});

test("every answer has a unique id, a topic and an existing local destination", () => {
  expect(new Set(faqItems.map(item => item.id)).size).toBe(faqItems.length);
  for (const item of faqItems) {
    expect(faqCategories.some(([id]) => id === item.category)).toBe(true);
    const url = new URL(item.action.href, "https://app.test");
    expect(url.origin).toBe("https://app.test");
    expect(existsSync(join(process.cwd(), "src/app", url.pathname, "page.tsx")) ||
      (["/account/security", "/account/orders", "/account/declined-offers"].includes(url.pathname) && existsSync(join(process.cwd(), "src/app/account/[section]/page.tsx")))).toBe(true);
    expect(item.answer.length).toBeGreaterThan(50);
  }
});
test("search is case insensitive, includes aliases and matches multiple words", () => {
  expect(filterFaqs("  UNDO  ", "all").some(item => item.id === "undo-entry")).toBe(true);
  expect(filterFaqs("KYC", "all").map(item => item.id)).toEqual(["demo-identity"]);
  expect(filterFaqs("gift card", "rewards").every(item => item.category === "rewards")).toBe(true);
  expect(filterFaqs("not-a-known-answer", "all")).toEqual([]);
});
test("answers distinguish demo capabilities and do not promise a gift transfer or support email", () => {
  expect(faqItems.find(item => item.id === "gift-transfers")?.answer).toContain("not enabled");
  expect(faqItems.find(item => item.id === "support-case")?.answer).toContain("does not send support emails");
  expect(faqItems.find(item => item.id === "undo-entry")?.answer).toContain("30-second");
  expect(faqItems.find(item => item.id === "demo-identity")?.answer).toContain("Do not upload your real ID");
});
test("question matches rank before incidental mentions and common apostrophes work", () => {
  expect(filterFaqs("password", "all")[0].id).toBe("password");
  expect(filterFaqs("password", "wallet")).toEqual([]);
  expect(filterFaqs("can’t sign in", "all")[0].id).toBe("password");
});

test("common wallet questions return relevant help in ordinary language", () => {
  expect(filterFaqs("Can I get my money back?", "all")[0]?.id).toBe("withdrawals");
  expect(filterFaqs("refunds", "all").some(item => item.id === "withdrawals")).toBe(true);
  expect(filterFaqs("Where can I see my wallet transactions?", "all")[0]?.id).toBe("wallet-history");
});

test("wallet answers use the live transaction button name and the exact reward-history section", () => {
  const refund = faqItems.find(item => item.id === "withdrawals")!;
  expect(refund.answer).toContain("use Report a problem on the relevant wallet transaction");
  expect(refund.answer).not.toContain("Get help");
  expect(faqItems.find(item => item.id === "reward-unavailable")!.action.href).toBe("/account/wallet?rewards=history#reward-history");
});

test.each([
  ["why is my deposit pending", "funding-status"],
  ["change default card", "default-card"],
  ["delete payment card", "delete-card"],
  ["my gift card is missing", "reward-unavailable"],
  ["what happens if i lose", "purchase-options"],
  ["entry not showing", "entry-status"],
  ["drawing date", "pool-completion"],
  ["change phone number", "change-phone"],
  ["how to change profile photo", "profile-photo"],
  ["stop email alerts", "email-alert-preferences"],
  ["download my data", "privacy-requests"],
  ["close my account", "privacy-requests"],
  ["where is my case number", "support-case-number"],
  ["hide my picks", "stop-sharing"],
  ["can i invite by phone", "crew-phone"],
  ["leave a group", "crew-leave-group"],
  ["how much is left to pay", "purchase-options"],
  ["purchase option expiration", "purchase-options"],
])("returns the appropriate help for %s", (query, id) => {
  expect(filterFaqs(query, "all")[0]?.id).toBe(id);
});

test.each([
  ["add funds minimum", "add-funds"],
  ["can I deposit $12.50", "add-funds"],
  ["pay by PayPal", "add-funds"],
  ["real card was charged", "balance-discrepancy"],
  ["copy my receipt", "order-receipt"],
  ["download order receipt", "order-receipt"],
  ["receipt for an entry", "entry-receipt"],
  ["will the item ship to me", "purchase-meaning"],
  ["can i merge purchase options", "purchase-options"],
  ["entry refunded to my bank", "undo-entry"],
  ["already used my card", "reward-unavailable"],
  ["change my display name", "display-name"],
  ["change my top menu", "top-menu"],
  ["remove someone in my group", "group-members"],
  ["share with someone who is not in Crew", "share-outside-crew"],
  ["respond to support ticket", "support-case"],
  ["my verification email did not come", "verification-email"],
  ["are my tickets reserved", "entry-status"],
  ["proof I paid for a ticket", "entry-receipt"],
  ["can I spend the card in store", "reward-restrictions"],
  ["do I have to buy the same item", "reward-restrictions"],
  ["where do I claim my win", "open-reward"],
  ["my gift card says canceled", "reward-unavailable"],
  ["can I give my winnings to a friend", "gift-transfers"],
  ["change my mind after declining", "decline-and-revive"],
  ["can I transfer wallet money to my bank", "withdrawals"],
  ["can you add another store", "request-product"],
  ["resend the activation link", "verification-email"],
  ["switch which card pays", "default-card"],
  ["why do I need ID to claim", "demo-identity"],
  ["buy two tickets", "multiple-entries"],
  ["stop receiving a group’s picks", "crew-leave-group"],
  ["how do I mark all read", "notifications"],
  ["will my real card be charged", "mvp"],
  ["hide my photo in the menu", "profile-photo"],
  ["money missing from my balance", "balance-discrepancy"],
  ["my times are showing the wrong time zone", "time-zone"],
])("answers the help search %s", (query, id) => {
  expect(filterFaqs(query, "all")[0]?.id).toBe(id);
});

test.each([
  ["when do they announce who got picked", "pool-completion"],
  ["where do I upload a new avatar", "profile-photo"],
  ["stop notifications coming to my inbox", "email-alert-preferences"],
  ["erase my personal information", "privacy-requests"],
  ["can I find a friend by their cell number", "crew-phone"],
  ["my balance looks incorrect", "balance-discrepancy"],
  ["revoke a shared link", "stop-sharing"],
  ["postal method of entry", "free-entry"],
  ["can I put in several tickets together", "multiple-entries"],
  ["check whether my entry posted", "entry-status"],
  ["top up my playable wallet", "add-funds"],
  ["get unused funds back to my bank", "withdrawals"],
  ["can I buy something else with the reward", "reward-restrictions"],
  ["my voucher has expired", "reward-unavailable"],
  ["expired gift card", "reward-unavailable"],
  ["why was I charged twice", "funding-status"],
  ["can I use the website without an account", "enter-a-prize"],
  ["never got the confirmation message", "verification-email"],
  ["send me a new reset link", "password"],
  ["delete old debit card", "delete-card"],
  ["what happens if I undo only one of my entries", "undo-entry"],
  ["does paying the rest combine my earlier entries", "purchase-options"],
  ["how long is the declined offer held", "decline-and-revive"],
  ["why did my wallet deposit show twice", "funding-status"],
  ["credit card charged but no wallet credit", "funding-status"],
  ["how to change my delivery address", "time-zone"],
  ["hide me from name search in crew", "crew-discoverability"],
  ["take somebody out of my own group", "group-members"],
  ["support tracking reference", "support-case-number"],
  ["show purchases from last week", "wallet-history"],
  ["change number that friends find me by", "change-phone"]
])("answers the customer question %s", (query, id) => {
  expect(filterFaqs(query, "all")[0]?.id).toBe(id);
});
