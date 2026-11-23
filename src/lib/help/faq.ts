import { walletDepositsHref, walletTransactionsHref } from "@/lib/account/activity";

export const faqCategories = [
  ["all", "All questions"],
  ["entries", "Entries & purchases"],
  ["wallet", "Wallet & funding"],
  ["rewards", "Prizes & gift cards"],
  ["account", "Account & Crew"],
  ["support", "Getting help"],
] as const;

export type FaqCategory = typeof faqCategories[number][0];
export type FaqItem = {
  id: string;
  category: Exclude<FaqCategory, "all">;
  question: string;
  answer: string;
  keywords: string;
  action: { label: string; href: string };
  followUpAction?: { label: string; href: string };
  issuerTerms?: Array<{ label: string; href: string }>;
};

// Product guidance for the current MVP, not a substitute for published terms.
// Keep these answers aligned with the server-enforced flows, not planned features.
export const faqItems: FaqItem[] = [
  {
    id: "default-card", category: "wallet", question: "How do I change my default payment card?",
    answer: "Open Payment methods and choose the default payment method on the saved sample card you want to use. You can still choose a different card when adding demo funds.",
    keywords: "set choose change switch default preferred card funding",
    action: { label: "Open Payment methods", href: "/account/wallet?view=history&panel=methods#payment-methods" },
  },
  {
    id: "delete-card", category: "wallet", question: "How do I delete a saved payment card?",
    answer: "Open Payment methods and find the saved sample card by its name and last four digits. To remove it, choose Delete Card and review the card before confirming. If you meant to use a different saved card, choose it in Add funds or change your default payment method.",
    keywords: "delete remove saved payment debit credit card",
    action: { label: "Manage saved cards", href: "/account/wallet?view=history&panel=methods#payment-methods" },
  },
  {
    id: "pool-completion", category: "entries", question: "When does a pool close and post its outcome?",
    answer: "In the demo, a pool resolves when its entries fill. Open Entries shows your active entries and the current pool status. You can find posted outcomes in My Activity.",
    keywords: "drawing date end close completion outcome when pick winner",
    action: { label: "See Open Entries", href: "/account/entries?filter=active#my-activity-filters" },
  },
  {
    id: "change-phone", category: "account", question: "How do I change my phone number?",
    answer: "Open Contact details in Profile, update the phone number, and save your changes. To control whether someone can find you by that number, open Privacy in Your Crew and change phone discovery.",
    keywords: "change update edit contact cell mobile phone number",
    action: { label: "Open Contact details", href: "/account/profile?section=contact#contact-details-heading" },
  },
  {
    id: "profile-photo", category: "account", question: "How do I change my profile photo?",
    answer: "Open Profile and choose the photo control. Select a picture, adjust the crop, and save it. To hide the picture in your account menu, turn off Show my photo in the account menu under Where to show your photo.",
    keywords: "change add upload replace avatar profile picture photo",
    action: { label: "Open Profile", href: "/account/profile" },
  },
  {
    id: "email-alert-preferences", category: "account", question: "How do I stop email alerts?",
    answer: "Open Email choices in Notifications. Turn off the email alerts you want to stop, then save each preference. In-app alerts have their own settings.",
    keywords: "unsubscribe stop turn off email alerts notification emails preferences",
    action: { label: "Open Email choices", href: "/account/notifications?section=email#email-choices" },
  },
  {
    id: "privacy-requests", category: "account", question: "How do I request my data or close my account?",
    answer: "Read Your choices and requests in the Privacy Policy. Sign in and send a private Support message to request access, correction, account closure, or deletion.",
    keywords: "download export access delete erase close account data privacy",
    action: { label: "Read privacy choices and requests", href: "/privacy#choices" },
  },
  {
    id: "support-case-number", category: "support", question: "Where is my Support case number?",
    answer: "Open My support cases or select a case to view the conversation. The case number appears on the case record.",
    keywords: "case number reference ticket support case id",
    action: { label: "Open My support cases", href: "/support#case-list" },
  },
  {
    id: "crew-phone", category: "account", question: "Can I add someone to Crew by phone?",
    answer: "Open Add people in Your Crew. Enter their verified phone number, including the country code, or choose one contact on a browser that supports the phone contact picker.",
    keywords: "invite contact add people friend lookup phone number crew",
    action: { label: "Open Add people", href: "/account/crew?tab=add#crew-intro" },
  },
  {
    id: "crew-leave-group", category: "account", question: "How do I leave a Crew group from a shared prize?",
    answer: "Open a prize shared from that group and use its Leave control. The confirmation identifies the group before you make the change.",
    keywords: "leave quit exit group sharing from a shared prize",
    action: { label: "Open Shared with You", href: "/account/favorites?tab=shared" },
  },
  {
    id: "crew-discoverability", category: "account", question: "How do I hide my name from Crew search?",
    answer: "Open Privacy in Your Crew. Under Can people find me?, turn off name discovery and save. You can manage searches by email and phone separately.",
    keywords: "hide discoverability name search find private visibility",
    action: { label: "Open Crew Privacy", href: "/account/crew?tab=privacy#crew-privacy" },
  },
  {
    id: "time-zone", category: "account", question: "How do I change my time zone?",
    answer: "Open Profile and update your mailing address. Zero Loss uses the address to determine your time zone. If the address matches more than one zone, choose the correct one before saving.",
    keywords: "timezone time zone local time change clock date deadline address profile",
    action: { label: "Open mailing address settings", href: "/account/profile?section=mailing#mailing-address-heading" },
  },
  {
    id: "change-email", category: "account", question: "Can I change my email address?",
    answer: "If you can still sign in, contact Support from your signed-in account to request an email change. If you’re locked out and can’t access that inbox, recover the mailbox through your email provider first. Once you have access again, use Forgot password on the sign-in page if you need a reset link.",
    keywords: "update replace edit login email lost access mailbox inbox", action: { label: "Ask Support about my email", href: "/support?topic=email#report-problem" },
  },
  {
    id: "balance-discrepancy", category: "wallet", question: "What if my wallet balance is wrong?",
    answer: "Compare your balance with Transaction history. If a deposit is missing or your balance didn’t update, open its receipt in Payment deposits and select View wallet credit when available. To report an unexpected charge or credit, choose Report a problem on that exact transaction.",
    keywords: "wrong balance incorrect discrepancy missing deposit credit", action: { label: "Check transaction history", href: walletTransactionsHref },
  },
  {
    id: "order-receipt", category: "rewards", question: "Where are my orders and how do I get a receipt?",
    answer: "Open Orders & Fulfillment. Choose Order details for a purchase or Reward details for a win. The record shows the reference and date. Use Copy order number on an order or copy the reward reference on a win.",
    keywords: "receipt orders confirmation fulfillment proof", action: { label: "Open Orders & Fulfillment", href: "/account/orders?filter=all#fulfillment-records" },
  },
  {
    id: "decline-and-revive", category: "entries", question: "What happens if I decline an offer?",
    answer: "The offer moves to Declined Offers and the entry payment stays in your history. You can undo during the countdown or revive a declined offer for free before its original deadline. After that deadline, the offer can no longer be revived.",
    keywords: "decline declined restore revive purchase option undo refund", action: { label: "Open Declined Offers", href: "/account/declined-offers" },
  },
  {
    id: "stop-sharing", category: "account", question: "How do I stop sharing a pick?",
    answer: "Open Shared Picks & Cleanup. Choose Your Crew or a group, then open the prize and stop sharing an entry. Use Clean up sharing to review several older picks for that audience at once.",
    keywords: "unshare remove cleanup stop sharing privacy", action: { label: "Open Shared Picks & Cleanup", href: "/account/crew?tab=picks#sharing" },
  },
  {
    id: "free-entry", category: "entries", question: "How do I enter without a purchase?",
    answer: "Open the mail-in instructions for the prize you want to enter. The instructions explain how to prepare and print the sample insert.",
    keywords: "free entry mail in mail-in postcard print insert without purchase",
    action: { label: "Read the free-entry instructions", href: "/free-entry?origin=faq#free-entry-intro" },
  },
  {
    id: "remove-crew-member", category: "account", question: "How do I remove someone from Crew?",
    answer: "Open Your Crew and choose the connection you want to manage. Use the remove action for that connection.",
    keywords: "remove someone disconnect person people crew management friends",
    action: { label: "Open Your Crew", href: "/account/crew#crew-intro" },
  },
  {
    id: "enter-a-prize", category: "entries", question: "What is the quickest way to enter a prize?",
    answer: "You can browse the marketplace and open prize details without an account. To submit a demo entry, sign in or create an account and use the prize’s entry controls. Choose your quantity, check the displayed total, and submit. If you need to sign in or create an account, the selected prize is kept so you can return to it afterward.",
    keywords: "ticket tickets enter one dollar signup sign up", action: { label: "Browse prizes", href: "/browse" },
  },
  {
    id: "multiple-entries", category: "entries", question: "Can I enter more than one ticket at a time?",
    answer: "Yes. Use the quantity controls on the prize page. The total updates before you submit. The available quantity depends on the prize’s remaining spaces and your playable balance; the server checks both again when you submit.",
    keywords: "multiple tickets quantity total price cost slots", action: { label: "Find a prize", href: "/browse?sort=ending-soon" },
  },
  {
    id: "undo-entry", category: "entries", question: "I entered by accident. Can I undo it?",
    answer: "Use Undo entry during the 30-second pending window. If you submitted several entries together, the button shows how many it will undo, such as Undo all 6 entries. A successful undo releases the reserved amount back to your playable balance—not to your payment card. After the window ends, check My Activity for the saved result. If something went wrong, contact support.",
    keywords: "cancel cancellation mistake accidental refund countdown reservation", action: { label: "Check My Activity", href: "/account/entries" },
  },
  {
    id: "purchase-options", category: "entries", question: "Where do I find what I can still purchase?",
    answer: "If your entry isn’t selected, check Purchase Options in My Activity for any eligible offers. Open an offer to see the amount already applied, how much is left to pay, and when it expires. Each eligible entry has its own option and options cannot be combined. Completing the purchase is a separate choice. Completed activity remains in your history.",
    keywords: "purchase option purchase options completion non selected buy remaining paid difference deadline", action: { label: "Continue with Purchase", href: "/account/entries?filter=completion#my-activity-filters" },
  },
  {
    id: "purchase-meaning", category: "entries", question: "Does completing a purchase order the pictured product?",
    answer: "The current purchase-option flow provides a retailer gift card for the advertised value after you pay the remaining amount. It does not reserve or ship the pictured product. Review the option before confirming; product availability, variants, and any cost above the gift-card value are controlled by the retailer.",
    keywords: "shipping size color exact item inventory retailer", action: { label: "Review my options", href: "/account/entries?filter=completion#my-activity-filters" },
  },
  {
    id: "entry-status", category: "entries", question: "How do I know my entry went through?",
    answer: "Wait for the saved confirmation, then check My Activity. See Open Entries shows active entries; other filters show winning outcomes, purchase options, and completed activity. If the connection drops, check the saved result instead of starting another purchase just to see whether the first one worked.",
    keywords: "success confirmation pending missing duplicate retry refresh", action: { label: "See my open entries", href: "/account/entries?filter=active#my-activity-filters" },
  },
  {
    id: "add-funds", category: "wallet", question: "How do I add funds?",
    answer: "Open Add funds in Wallet & Transactions, choose a saved sample card and a whole-dollar amount of at least $1, then review and confirm the deposit. In this MVP, funding uses supplied sample cards and simulated money. Apple Pay and PayPal are unavailable. Do not enter real payment-card details.",
    keywords: "deposit top up topup money wallet card payment", action: { label: "Go to Add funds", href: "/account/wallet?view=history&panel=funding#add-funds" },
  },
  {
    id: "insufficient-balance", category: "wallet", question: "What if I do not have enough balance for my entries?",
    answer: "The entry panel shows an insufficient-balance message with an Add funds shortcut. You can add funds and return to that same prize, or reduce the quantity before trying again. An insufficient-balance message is not an entry confirmation.",
    keywords: "low balance insufficient total tickets not enough money", action: { label: "Check my balance", href: "/account/wallet?view=history" },
  },
  {
    id: "funding-status", category: "wallet", question: "My funding looks pending. Should I add it again?",
    answer: "If a deposit is pending, declined, or interrupted, check the existing request in Wallet & Transactions first. Use Finish / check or Retry same request when offered. If the request needs review or the balance still looks wrong, open Support from that transaction before starting another deposit.",
    keywords: "deposit missing duplicate charged twice processing payment retry", action: { label: "Check funds & history", href: walletDepositsHref },
  },
  {
    id: "wallet-history", category: "wallet", question: "Where can I see my wallet transactions?",
    answer: "Open Transaction history in Wallet & Transactions. Search or use the category and date filters to find a deposit, entry, purchase, or refund. To find purchases from last week, choose Purchases and enter the start and end dates.",
    keywords: "wallet ledger activity records history", action: { label: "Open transaction history", href: walletTransactionsHref },
  },
  {
    id: "withdrawals", category: "wallet", question: "Can I withdraw a deposit or request a refund?",
    answer: "Deposits are intended to stay in your Zero Loss balance and cannot normally be withdrawn. Exceptional refund requests are reviewed separately. This does not limit rights for unauthorized charges or payment errors. An entry undone within its pending window returns to your playable balance, not your payment card. To report an issue, use Report a problem on the relevant wallet transaction.",
    keywords: "cash out money child kid stolen chargeback refund accidental", action: { label: "Find the transaction", href: walletTransactionsHref },
  },
  {
    id: "open-reward", category: "rewards", question: "Where is my prize or gift-card number?",
    answer: "Open Gift Cards & Rewards and select the reward. If it still needs to be claimed, follow Claim reward first. When the reward is ready and claimed, its details show the number and the available presentation tools. A reward notification also opens that specific reward directly.",
    keywords: "barcode code pin won winner winnings check redeem redemption wallet", action: { label: "Open my rewards", href: "/account/wallet" },
  },
  {
    id: "reward-restrictions", category: "rewards", question: "Do I have to use the gift card on the pictured item?",
    answer: "A retailer gift card is not restricted to the featured item. You can use it toward eligible purchases with that retailer, subject to the retailer’s gift-card rules. Check the retailer, value, and status in your reward details before using it.",
    keywords: "different product retailer store item eligible", action: { label: "View reward details", href: "/account/wallet" },
    issuerTerms: [
      { label: "Walmart gift-card terms", href: "https://www.walmart.com/help/article/gift-card-terms-and-conditions/90f9e217278146898946c1d786bedea3" },
      { label: "Best Buy gift-card terms", href: "https://www.bestbuy.com/site/gift-cards/gift-card-help/pcmcat203400050004.c" },
    ],
  },
  {
    id: "reward-unavailable", category: "rewards", question: "Why is a reward not ready, or no longer usable?",
    answer: "Open the exact reward in Gift Cards & Rewards and check its status and claim deadline. Redeemed, expired, cancelled, and pending rewards stay in reward history. If a gift card shows as used and you don’t recognize that activity, open Support from the reward and describe the issue without sharing the gift-card code.",
    keywords: "failed issuance expired cancelled redeemed missing barcode history", action: { label: "Open reward history", href: "/account/wallet?rewards=history#reward-history" },
  },
  {
    id: "demo-identity", category: "rewards", question: "What happens in the identity-check preview?",
    answer: "The guided preview demonstrates sample ID front and back images, a simulated face check, and a review step using demo data. It is not a real identity or tax check. Do not upload your real ID or enter a Social Security number into the MVP. Where available, open Preview identity check from a winning reward.",
    keywords: "kyc selfie face video camera ssn social security verification documents", action: { label: "Go to my rewards", href: "/account/wallet" },
  },
  {
    id: "gift-transfers", category: "rewards", question: "Can I send a reward or gift card to someone else?",
    answer: "Sending and transferring rewards is not enabled in the current MVP. Crew sharing shows activity; it does not transfer ownership of a reward. Do not send a gift-card number through Crew or support messages. Contact support if you need help with a reward.",
    keywords: "gifting gift email friend transfer send recipient ownership", action: { label: "Ask about a reward", href: "/support?topic=reward#report-problem" },
  },
  {
    id: "password", category: "account", question: "I cannot sign in. How do I reset my password?",
    answer: "Use Forgot your password and enter your account email. Open the newest reset email, choose a new password, and then sign in. If a link is expired or already used, request a new one. If you are already signed in and know your current password, use Change password in Account & Security.",
    keywords: "login log in forgot expired email reset security", action: { label: "Reset my password", href: "/forgot-password" },
  },
  {
    id: "crew-sharing", category: "account", question: "Who can see what I share with my Crew?",
    answer: "Only the connected Crew members you share a pick with can see it. When you choose Add to Crew, you connect automatically if the other person’s account allows it. Either person can leave at any time and choose what to share back. Manage sharing in Your Crew. On the homepage, See prizes shows a person’s shared picks, including examples from the fictional sample profiles.",
    keywords: "privacy friends maya daniel ari leo shared picks phone contacts", action: { label: "Manage Crew sharing", href: "/account/crew?tab=picks#sharing" },
  },
  {
    id: "notifications", category: "account", question: "Where do I see updates that need my attention?",
    answer: "Open Notifications for account activity, reward updates, Crew requests, and support updates. Select the action on a notification to open the related entry, reward, transaction, request, or support conversation. Use Alert settings to choose which in-app alerts appear. To clear unread indicators together, select Mark all as read. Read status is saved to your account.",
    keywords: "email alerts unread messages badge updates status", action: { label: "Open notifications", href: "/account/notifications" },
    followUpAction: { label: "Open Alert settings", href: "/account/notifications?section=alerts#alert-settings" },
  },
  {
    id: "support-case", category: "support", question: "How do I contact support or follow up on a message?",
    answer: "Sign in and send a message from Contact or Help Center. Your request is saved as a private case, and you can open that same conversation to add details or read replies. Case updates also appear in Notifications. The current preview does not send support emails, so check your saved conversation for the response.",
    keywords: "contact help service email reply case issue complaint", action: { label: "Contact support", href: "/contact#message" },
    followUpAction: { label: "Follow up on a case", href: "/support#case-list" },
  },
  {
    id: "request-product", category: "support", question: "Can I suggest a product or retailer?",
    answer: "Yes. Send a product request with the item or retailer you would like to see and any useful details. Requests are saved for review; submitting a suggestion does not reserve an item or guarantee it will be added.",
    keywords: "catalog search cannot find brand suggestion recommend", action: { label: "Suggest a product", href: "/contact/product-request?origin=faq#requested-item" },
  },
  {
    id: "mvp", category: "support", question: "Are the money and gift-card codes in this MVP real?",
    answer: "This is a working demonstration with simulated funding, test entries, illustrative activity, and sample rewards. Codes marked Sample — not redeemable cannot be used at a retailer. Some actions are saved to your demo account so you can follow the complete flow, but the MVP does not process real purchases or fulfill real prizes.",
    keywords: "demo preview test fake real money sample experience", action: { label: "Explore the marketplace", href: "/browse" },
  },
  {
    id: "display-name", category: "account", question: "How do I change my display name?",
    answer: "Open Personal information in Profile, edit your display name or alias, and save your changes.",
    keywords: "edit change nickname alias display name", action: { label: "Open Personal information", href: "/account/profile?section=personal#personal-details-heading" },
  },
  {
    id: "top-menu", category: "account", question: "How do I change my top menu?",
    answer: "Open Personalize your top menu in Profile to choose the layout for your menu and search.",
    keywords: "appearance edit header navigation change customize menu", action: { label: "Personalize your top menu", href: "/account/profile?section=appearance#personalize-menu-heading" },
  },
  {
    id: "entry-receipt", category: "entries", question: "Where can I find the receipt for an entry?",
    answer: "Open the entry in My Activity to see its ticket details. Use Transaction history in Wallet to find the associated payment record.",
    keywords: "entry receipt payment record proof ticket", action: { label: "Open Transaction history", href: "/account/wallet?view=history&panel=transactions#transactions" },
  },
  {
    id: "group-members", category: "account", question: "How do I remove someone from my Crew group?",
    answer: "If you manage the group, open Groups in Your Crew and edit its members. This leaves the person's Crew connection in place. To end the connection, open that person in Your Crew instead.",
    keywords: "remove person someone member group edit", action: { label: "Open Crew groups", href: "/account/crew?tab=groups#crew-groups" },
  },
  {
    id: "share-outside-crew", category: "account", question: "Can I share a prize with someone outside Crew?",
    answer: "Open Share on the prize and choose Text, Email, or Copy link. These options send a product link. Shared Crew activity and reward ownership are separate.",
    keywords: "share product outside crew friend link text email", action: { label: "Browse prizes", href: "/browse" },
  },
  {
    id: "verification-email", category: "account", question: "What if my verification email did not come?",
    answer: "Use Resend verification email from Create account with the address you registered. Check your spam folder for the new message. Use the separate sign-in recovery option if you forgot your sign-in details.",
    keywords: "missing verification email resend verify confirm signup", action: { label: "Resend verification email", href: "/signup?verify=resend#resend-verification" },
  },
];

const faqFiller = new Set(["a", "an", "are", "can", "could", "do", "does", "find", "how", "i", "if", "is", "it", "me", "my", "please", "the", "to", "what", "when", "where", "who", "would", "you", "your"]);

const normalizeFaq = (value: string) => value.toLocaleLowerCase("en-US").replaceAll("’", "'").replace(/\bcan'?t\b/g, "cannot");
const faqIntents: readonly [RegExp, string][] = [
  [/\b(?:wrong|incorrect)\b.*\b(?:sample |payment |debit |credit )?card\b.*\b(?:wallet|saved|payment method)\b/, "delete-card"],
  [/\b(?:card|deposit|funding)\b.*\b(?:declined|rejected)\b/, "funding-status"],
  [/\bbalance\b.*\b(?:not updating|did not update|stayed the same|unchanged)\b/, "balance-discrepancy"],
  [/\brefund\s+policy\b/, "withdrawals"],
  [/\bcancel\b.*\b(?:my|last|recent|previous)\b.*\b(?:entr(?:y|ies)|tickets?)\b/, "undo-entry"],
  [/\b(?:tickets?|entr(?:y|ies))\b.*\b(?:missing|nothing happened)\b|\b(?:clicked|pressed|tapped)\s+enter\b.*\bnothing happened\b/, "entry-status"],
  [/\b(?:missing|cannot find)\b.*\bpurchase options?\b/, "purchase-options"],
  [/\b(?:purchase options?|offers?)\b.*\b(?:expired|revive)\b|\blose\b.*\bmoney\b.*\bdecline\b/, "decline-and-revive"],
  [/\b(?:find|where|copy|view)\b.*\border (?:number|ref(?:erence)?)\b/, "order-receipt"],
  [/\bgift[ -]?card\b.*\b(?:says used|i never used|does(?:n't| not) work)\b/, "reward-unavailable"],
  [/\b(?:get|send|buy|give)\b.*\bgift[ -]?card\b.*\b(?:for|to)\s+(?:someone else|another person|a friend)\b/, "gift-transfers"],
  [/\b(?:see|read|find|view)\b.*\breplies?\b.*\b(?:support|case|ticket)\b|\badd (?:more )?details?\b.*\b(?:support|case|ticket)\b/, "support-case"],
  [/\b(?:unsubscribe|opt out)\b.*\b(?:e-?mails?|email alerts?)\b/, "email-alert-preferences"],
  [/\bhide\b.*\bname\b.*\bcrew\b/, "crew-discoverability"],
  [/\b(?:lost access to|(?:cannot|could not|no longer)\s+(?:access|open|use))\s+(?:(?:my|the|that|old)\s+)*(?:e-?mail|mailbox|inbox)\b/, "change-email"],
  [/\b(?:cancel|undo)\b(?=.*\b(?:tickets?|entr(?:y|ies))\b)(?=.*\b(?:accident|mistake|bought|purchased|entered)\b)/, "undo-entry"],
  [/\b(?:get|have|take)\b.*\b(?:deposit|deposited funds)\b.*\bback\b/, "withdrawals"],
  [/\b(?:took|deducted|charged|billed)\b.*\b(?:money|payment|wallet|card)\b.*\b(?:twice|two times)\b/, "funding-status"],
  [/\b(?:used up|ran out of|out of|no)\b.*\bbalance\b.*\benter\b/, "insufficient-balance"],
  [/\b(?:hold|reservation)\b.*\b(?:turned into|became|converted to)\b.*\b(?:ticket|entry)\b/, "entry-status"],
  [/\b(?:itemized|receipt)\b.*\b(?:one|my|a|this)\s+ticket\b/, "entry-receipt"],
  [/\b(?:checkout|purchase)\b.*\b(?:send|ship|deliver|get)\b.*\bprize\b.*\bgift[ -]card\b/, "purchase-meaning"],
  [/\b(?:settings?|change|control)\b.*\b(?:in[ -]app alerts?|alerts? (?:inside|on|in) (?:the )?(?:website|site|app))\b/, "notifications"],
  [/\b(?:gift[ -]card|reward)\b.*\b(?:issuing|being issued|pending issuance)\b/, "reward-unavailable"],
  [/\b(?:open|find|view)\b.*\b(?:existing|previous)\b.*\b(?:support|help)\s+(?:case|conversation)\b/, "support-case"],
  [/\b(?:give|send|submit|share)\b.*\b(?:idea|suggestion)\b.*\b(?:product|prize|retailer)\b/, "request-product"],
  [/\bgift[ -]card\b.*\bdemo\b.*\b(?:spendable|redeemable|usable|real)\b/, "mvp"],
  [/\b(?:loading|add(?:ing)?|deposit(?:ing)?)\b.*\bapple pay\b|\bapple pay\b.*\b(?:wallet|funding|deposit)\b/, "add-funds"],
  [/\b(?:draw|drawing|pool)\b.*\b(?:wait|close)\b.*\b(?:every|all)\b.*\b(?:spots?|tickets?|entries)\b/, "pool-completion"],
  [/\b(?:use|browse|see)\b.*\bwithout (?:an account|signing in)\b/, "enter-a-prize"],
  [/\b(?:never got|did not get|missing|resend)\b.*\bconfirmation message\b/, "verification-email"],
  [/\b(?:send|new|resend|expired)\b.*\b(?:password )?reset link\b/, "password"],
  [/\b(?:delete|remove)\b.*\b(?:debit|payment|credit)\s+card\b|\bmanage\b.*\b(?:stored|saved)\s+billing cards\b/, "delete-card"],
  [/\bundo\b.*\b(?:only|one)\b.*\b(?:entries|tickets)\b/, "undo-entry"],
  [/\bpay(?:ing)?\s+the\s+rest\b.*\bcombine\b.*\b(?:entries|tickets)\b/, "purchase-options"],
  [/\bhow long\b.*\bdeclined offer\b/, "decline-and-revive"],
  [/\bdeposit\b.*\b(?:twice|duplicate|two times)\b|\b(?:charged|billed)\b.*\b(?:twice|two times|no wallet credit)\b/, "funding-status"],
  [/\b(?:change|update|edit)\b.*\b(?:delivery|mailing)\s+address\b/, "time-zone"],
  [/\bhide\b.*\bname search\b.*\bcrew\b/, "crew-discoverability"],
  [/\btake\b.*\bout of\b.*\b(?:my|own)\b.*\bgroup\b/, "group-members"],
  [/\bsupport\b.*\btracking (?:reference|number)\b/, "support-case-number"],
  [/\b(?:show|find|view)\b.*\bpurchases\b.*\b(?:last week|date range)\b/, "wallet-history"],
  [/\bchange\b.*\bnumber\b.*\bfriends?\s+(?:can\s+)?find\b/, "change-phone"],
  [/\b(?:announce|reveal)\b.*\b(?:who got picked|winner|outcome)\b/, "pool-completion"],
  [/\b(?:upload|change|edit|replace)\b.*\bavatar\b/, "profile-photo"],
  [/\b(?:stop|disable|turn off)\b.*\b(?:notifications?|alerts?)\b.*\binbox\b/, "email-alert-preferences"],
  [/\b(?:erase|delete|remove)\b.*\bpersonal information\b/, "privacy-requests"],
  [/\b(?:find|add|invite|look up)\b.*\b(?:cell|cellphone|mobile)\s+number\b/, "crew-phone"],
  [/\b(?:wallet|balance)\b.*\b(?:incorrect|inaccurate|looks wrong)\b/, "balance-discrepancy"],
  [/\b(?:revoke|disable)\b.*\b(?:shared|sharing)\s+link\b/, "stop-sharing"],
  [/\bpostal\b.*\bentr(?:y|ies)\b|\bentr(?:y|ies)\b.*\bpostal\b/, "free-entry"],
  [/\b(?:several|multiple)\s+tickets\b.*\b(?:together|at once)\b/, "multiple-entries"],
  [/\b(?:check|confirm)\b.*\bentr(?:y|ies)\b.*\b(?:posted|went through)\b/, "entry-status"],
  [/\btop[ -]?up\b.*\b(?:wallet|balance)\b/, "add-funds"],
  [/\b(?:unused|unspent)\s+funds\b.*\b(?:back|bank|withdraw)\b/, "withdrawals"],
  [/\bbuy\b.*\b(?:something else|a different item)\b.*\b(?:reward|gift[ -]?card)\b/, "reward-restrictions"],
  [/\b(?:(?:voucher|gift[ -]?card|reward)\b.*\bexpired|expired\s+(?:voucher|gift[ -]?card|reward))\b/, "reward-unavailable"],
  [/\b(?:add funds|deposit|funding)\b.*\b(?:minimum|\d+\.\d{2})\b|\bpaypal\b/, "add-funds"],
  [/\b(?:real card was charged|unexpected charge)\b/, "balance-discrepancy"],
  [/\b(?:money|balance)\b.*\b(?:missing|short)\b.*\bbalance\b|\b(?:wallet|playable)\s+balance\b.*\b(?:missing|short)\b/, "balance-discrepancy"],
  [/\b(?:will|would|does)\b.*\breal\s+(?:payment\s+)?card\b.*\bcharg(?:e|ed)\b/, "mvp"],
  [/\b(?:without paying|without a purchase)\b/, "free-entry"],
  [/\bdeclin(?:e|ed)\b.*\b(?:by mistake|offer back)\b/, "decline-and-revive"],
  [/\bverification link\b.*\b(?:expired|expire)\b/, "verification-email"],
  [/\b(?:copy|download)\b(?=.*\breceipt\b)(?=.*\b(?:entry|entries|tickets?)\b)/, "entry-receipt"],
  [/\b(?:copy|download)\b.*\b(?:order\s+)?receipt\b/, "order-receipt"],
  [/\breceipt\b.*\bentr(?:y|ies)\b|\bentry receipt\b/, "entry-receipt"],
  [/\bproof\b.*\b(?:paid|payment)\b.*\b(?:tickets?|entry|entries)\b/, "entry-receipt"],
  [/\b(?:tickets?|entry|entries)\b.*\breserv(?:ed|ation)\b|\breserv(?:ed|ation)\b.*\b(?:tickets?|entry|entries)\b/, "entry-status"],
  [/\b(?:buy|enter|add)\s+(?:\d+|two|three|four|five|six|seven|eight|nine|ten|several|multiple)\s+(?:tickets?|entries)\b/, "multiple-entries"],
  [/\b(?:ship|shipping|shipped)\b.*\b(?:me|item|product)\b/, "purchase-meaning"],
  [/\b(?:merge|combine)\b.*\bpurchase options?\b/, "purchase-options"],
  [/\bentry\b.*\brefund(?:ed)?\b.*\bbank\b/, "undo-entry"],
  [/\balready\b.*\b(?:used|redeemed)\b.*\bcard\b/, "reward-unavailable"],
  [/\b(?:gift[ -]?card|reward)\b.*\bcancell?ed\b/, "reward-unavailable"],
  [/\b(?:spend|use|redeem)\b.*\bcard\b.*\b(?:in[ -]store|at the store)\b|\bbuy\b.*\b(?:same|pictured|featured)\s+(?:item|product)\b/, "reward-restrictions"],
  [/\bclaim\b.*\b(?:my|a|the)\s+win\b/, "open-reward"],
  [/\b(?:need|require|upload|provide)\b.*\bid\b.*\bclaim\b|\bclaim\b.*\b(?:need|require|upload|provide)\b.*\bid\b/, "demo-identity"],
  [/\b(?:give|send|transfer)\b.*\bwinnings\b.*\b(?:friend|someone)\b/, "gift-transfers"],
  [/\b(?:change my mind after declining|get my declined offer back)\b/, "decline-and-revive"],
  [/\btransfer\b.*\b(?:wallet|balance)\b.*\bbank\b/, "withdrawals"],
  [/\b(?:add|suggest|request)\b.*\b(?:another|new)\s+(?:store|retailer)\b/, "request-product"],
  [/\b(?:switch|change|choose)\b.*\bwhich card\b.*\b(?:pay|pays|used|charged)\b/, "default-card"],
  [/\bmark\b.*\ball\b.*\bread\b/, "notifications"],
  [/\b(?:stop receiving|stop seeing)\b.*\bgroup\b.*\bpicks\b/, "crew-leave-group"],
  [/\bhide\b.*\b(?:photo|picture|avatar)\b.*\bmenu\b/, "profile-photo"],
  [/\b(?:wrong|incorrect)\s+time[ -]?zone\b/, "time-zone"],
  [/\b(?:change|edit|update)\b.*\bdisplay name\b/, "display-name"],
  [/\b(?:change|edit|customize|personalize)\b.*\btop menu\b/, "top-menu"],
  [/\bremove\b.*\b(?:from|in)\b.*\bgroup\b/, "group-members"],
  [/\bshare\b.*\b(?:outside|not in)\b.*\bcrew\b/, "share-outside-crew"],
  [/\b(?:reply|respond|follow up)\b.*\b(?:ticket|case)\b/, "support-case"],
  [/\b(?:verification email|activation link)\b/, "verification-email"],
  [/\b(?:deposit|funding)\b.*\bpending\b|\bpending\b.*\b(?:deposit|funding)\b|\bfunds?\s+missing\b/, "funding-status"],
  [/\b(?:gift[ -]card|reward)\b.*\b(?:missing|not showing|not arrived)\b/, "reward-unavailable"],
  [/\b(?:what happens if i lose|purchase option expiration|how much is left to pay)\b/, "purchase-options"],
  [/\bentr(?:y|ies)\b.*\b(?:not showing|missing|did not post)\b/, "entry-status"],
  [/\b(?:hide|stop showing)\b.*\bpicks\b/, "stop-sharing"],
  [/\b(?:download|delete|export|access)\b.*\b(?:my\s+)?data\b|\bclose\b.*\bmy account\b/, "privacy-requests"],
];

export function faqSearchWords(query: string) {
  const normalized = normalizeFaq(query)
    .replace(/\be-mail\b/g, "email")
    .replace(/\bchang(?:ing|ed)\b/g, "change")
    .replace(/\b(?:mail[ -]in|free[ -]entr(?:y|ies))\b/g, "mail-in free entry")
    .replace(/\b(where|what|how|when|who|there)'s\b/g, "$1 is")
    .replace(/\bopt out of sharing\b/g, "stop sharing")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\b(?:get\s+)?(?:my\s+)?money\s+back\b/g, "refund")
    .replace(/\b(?:contact\s+)?customer\s+(?:service|support)\b/g, "support");
  return normalized.trim().split(/[\s-]+/).filter(word => word && !faqFiller.has(word));
}

export function isPasswordChangeQuery(query: string) {
  const text = normalizeFaq(query);
  return /\b(?:change|update|edit|replace)\b.*\bpassword\b/.test(text)
    && !/\b(?:forgot|forgotten|reset|cannot sign in|cannot log in)\b/.test(text);
}

export function filterFaqs(query: string, category: FaqCategory): FaqItem[] {
  const words = faqSearchWords(query);
  const normalized = normalizeFaq(query);
  const intent = isPasswordChangeQuery(query) ? "password" : faqIntents.find(([pattern]) => pattern.test(normalized))?.[1];
  const related = intent === "delete-card" && /\b(?:wrong|incorrect)\b/.test(normalized) ? "default-card" : null;
  const singular = (word: string) => word.length > 3 && !word.endsWith("ss") ? word.replace(/ies$/, "y").replace(/(?<!u)s$/, "") : word;
  const matches = (value: string, word: string) => {
    const text = normalizeFaq(value);
    return (word.length > 3 && text.includes(word)) || (text.match(/[a-z0-9]+/g) ?? []).some(token => singular(token) === singular(word));
  };
  if (words.join(" ") === "order history") return category === "all" || category === "rewards" ? faqItems.filter(item => item.id === "order-receipt") : [];
  const questionScore = (item: FaqItem) => words.filter(word => matches(item.question, word)).length;
  return faqItems.filter(item => (category === "all" || item.category === category) && (item.id === intent || item.id === related || words.every(word =>
    matches(`${item.question} ${item.answer} ${item.keywords}`, word))))
    .sort((left, right) => Number(right.id === intent) - Number(left.id === intent) || questionScore(right) - questionScore(left));
}
