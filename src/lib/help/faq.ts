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
};

// Product guidance for the current MVP, not a substitute for published terms.
// Keep these answers aligned with the server-enforced flows, not planned features.
export const faqItems: FaqItem[] = [
  {
    id: "enter-a-prize", category: "entries", question: "What is the quickest way to enter a prize?",
    answer: "Open a prize in the marketplace and use its entry controls. Choose your quantity, check the displayed total, and submit. If you need to sign in or create an account, the selected prize is kept so you can return to it afterward.",
    keywords: "ticket tickets enter one dollar signup sign up", action: { label: "Browse prizes", href: "/browse" },
  },
  {
    id: "multiple-entries", category: "entries", question: "Can I enter more than one ticket at a time?",
    answer: "Yes. Use the quantity controls on the prize page. The total updates before you submit. The available quantity depends on the prize’s remaining spaces and your playable balance; the server checks both again when you submit.",
    keywords: "multiple tickets quantity total price cost slots", action: { label: "Find a prize", href: "/browse?sort=ending-soon" },
  },
  {
    id: "undo-entry", category: "entries", question: "I entered by accident. Can I undo it?",
    answer: "Use Undo entry during the 30-second pending window. For a multiple-ticket submission, Undo all entries cancels that whole submission. A successful undo releases the reserved amount back to your playable balance—not to your payment card. After the window ends, check My Activity for the saved result. If something went wrong, contact support.",
    keywords: "cancel cancellation mistake accidental refund countdown reservation", action: { label: "Check My Activity", href: "/account/entries" },
  },
  {
    id: "purchase-options", category: "entries", question: "Where do I find what I can still purchase?",
    answer: "Open Purchase Options in My Activity. Select an available option to see the amount already applied, the remaining amount, and its decision deadline. Completing the purchase is a separate choice; entering does not automatically purchase the gift card. Completed activity remains in your history.",
    keywords: "completion non selected buy remaining paid difference deadline", action: { label: "Review purchase options", href: "/account/entries?filter=completion" },
  },
  {
    id: "purchase-meaning", category: "entries", question: "Does completing a purchase order the pictured product?",
    answer: "The current purchase-option flow provides a retailer gift card for the advertised value after you pay the remaining amount. It does not reserve or ship the pictured product. Review the option before confirming; product availability, variants, and any cost above the gift-card value are controlled by the retailer.",
    keywords: "shipping size color exact item inventory retailer", action: { label: "Review my options", href: "/account/entries?filter=completion" },
  },
  {
    id: "entry-status", category: "entries", question: "How do I know my entry went through?",
    answer: "Wait for the saved confirmation, then check My Activity. Still Open shows active entries; other filters show winning outcomes, purchase options, and completed activity. If the connection drops, check the saved result instead of starting another purchase just to see whether the first one worked.",
    keywords: "success confirmation pending missing duplicate retry refresh", action: { label: "See my open entries", href: "/account/entries?filter=active" },
  },
  {
    id: "add-funds", category: "wallet", question: "How do I add funds?",
    answer: "Open Add funds in Wallet & Transactions, choose the amount, and review the confirmation. You must re-enter your account password and confirm how the deposit can be used. In this MVP, funding uses the provided demo payment method and simulated money; do not enter real payment-card details.",
    keywords: "deposit top up topup money password card payment", action: { label: "Go to Add funds", href: "/account/wallet?view=history#add-funds" },
  },
  {
    id: "insufficient-balance", category: "wallet", question: "What if I do not have enough balance for my entries?",
    answer: "The entry panel shows an insufficient-balance message with an Add funds shortcut. You can add funds and return to that same prize, or reduce the quantity before trying again. An insufficient-balance message is not an entry confirmation.",
    keywords: "low balance insufficient total tickets not enough money", action: { label: "Check my balance", href: "/account/wallet?view=history" },
  },
  {
    id: "funding-status", category: "wallet", question: "My funding looks pending. Should I add it again?",
    answer: "Check the funding request in Wallet & Transactions first. Use Finish / check or Retry same request when offered, so the existing request is checked rather than creating another one. If it needs review or still looks wrong, open support from that transaction.",
    keywords: "deposit missing duplicate charged twice processing payment retry", action: { label: "Check funds & history", href: "/account/wallet?view=history" },
  },
  {
    id: "withdrawals", category: "wallet", question: "Can I withdraw a deposit or request a refund?",
    answer: "Deposits are intended to stay in your Zero Loss balance and cannot normally be withdrawn. Exceptional refund requests are reviewed separately. This does not limit rights for unauthorized charges or payment errors. An entry undone within its pending window returns to your playable balance, not your payment card. To report an issue, use Get help on the relevant wallet transaction.",
    keywords: "cash out child kid stolen chargeback refund accidental", action: { label: "Find the transaction", href: "/account/wallet?view=history" },
  },
  {
    id: "open-reward", category: "rewards", question: "Where is my prize or gift-card number?",
    answer: "Open Gift Cards & Rewards and select the reward. If it still needs to be claimed, follow Claim reward first. When the reward is ready and claimed, its details show the number and the available presentation tools. A reward notification also opens that specific reward directly.",
    keywords: "barcode code won winner redeem redemption wallet", action: { label: "Open my rewards", href: "/account/wallet" },
  },
  {
    id: "reward-restrictions", category: "rewards", question: "Do I have to use the gift card on the pictured item?",
    answer: "A retailer gift card is not restricted to the featured item. You can use it toward eligible purchases with that retailer, subject to the retailer’s gift-card rules. Check the retailer, value, and status in your reward details before using it.",
    keywords: "different product retailer store item eligible", action: { label: "View reward details", href: "/account/wallet" },
  },
  {
    id: "reward-unavailable", category: "rewards", question: "Why is a reward not ready, or no longer usable?",
    answer: "Open its details to check the current status and any claim deadline. Rewards that are redeemed, expired, cancelled, or still being issued stay in reward history. A pending or unavailable reward does not have a usable code; contact support if the status needs attention.",
    keywords: "failed issuance expired cancelled redeemed missing barcode history", action: { label: "Open reward history", href: "/account/wallet?rewards=history" },
  },
  {
    id: "demo-identity", category: "rewards", question: "What happens in the identity-check preview?",
    answer: "The guided preview demonstrates sample ID front and back images, a simulated face check, and a review step using demo data. It is not a real identity or tax check. Do not upload your real ID or enter a Social Security number into the MVP. Where available, open Preview identity check from a winning reward.",
    keywords: "kyc selfie face video camera ssn social security verification documents", action: { label: "Go to my rewards", href: "/account/wallet" },
  },
  {
    id: "gift-transfers", category: "rewards", question: "Can I send a reward or gift card to someone else?",
    answer: "Sending and transferring rewards is not enabled in the current MVP. Crew sharing shows activity; it does not transfer ownership of a reward. Do not send a gift-card number through Crew or support messages. Contact support if you need help with a reward.",
    keywords: "gifting gift email friend transfer send recipient ownership", action: { label: "Ask about a reward", href: "/contact#message" },
  },
  {
    id: "password", category: "account", question: "I cannot sign in. How do I reset my password?",
    answer: "Use Forgot your password and enter your account email. Open the newest reset email, choose a new password, and then sign in. If a link is expired or already used, request a new one. If you are already signed in and know your current password, use Change password in Account & Security.",
    keywords: "login log in forgot expired email reset security", action: { label: "Reset my password", href: "/forgot-password" },
  },
  {
    id: "crew-sharing", category: "account", question: "Who can see what I share with my Crew?",
    answer: "Real Crew connections require approval, and sharing is your choice. Manage invitations and your sharing preferences in Your Crew. On the homepage, See prizes opens the selected person’s shared items underneath their profile without taking you to another page. Sample profiles and activity remain part of the MVP walkthrough.",
    keywords: "privacy friends maya daniel ari leo shared picks phone contacts", action: { label: "Manage Crew sharing", href: "/account/crew?tab=picks#sharing" },
  },
  {
    id: "notifications", category: "account", question: "Where do I see updates that need my attention?",
    answer: "Open Notifications for account activity, reward updates, Crew requests, and support updates. Select the action on a notification to open the related entry, reward, transaction, request, or support conversation. Read status is saved to your account.",
    keywords: "alerts unread messages badge updates status", action: { label: "Open notifications", href: "/account/notifications" },
  },
  {
    id: "support-case", category: "support", question: "How do I contact support or follow up on a message?",
    answer: "Sign in and send a message from Contact or Help Center. Your request is saved as a private case, and you can open that same conversation to add details or read replies. Case updates also appear in Notifications. The current preview does not send support emails, so check your saved conversation for the response.",
    keywords: "contact help service email reply case issue complaint", action: { label: "Contact support", href: "/contact#message" },
  },
  {
    id: "request-product", category: "support", question: "Can I suggest a product or retailer?",
    answer: "Yes. Send a product request with the item or retailer you would like to see and any useful details. Requests are saved for review; submitting a suggestion does not reserve an item or guarantee it will be added.",
    keywords: "catalog search cannot find brand suggestion recommend", action: { label: "Suggest a product", href: "/contact#product-request" },
  },
  {
    id: "mvp", category: "support", question: "Are the money and gift-card codes in this MVP real?",
    answer: "This is a working demonstration with simulated funding, test entries, illustrative activity, and sample rewards. Codes marked Sample — not redeemable cannot be used at a retailer. Some actions are saved to your demo account so you can follow the complete flow, but the MVP does not process real purchases or fulfill real prizes.",
    keywords: "demo preview test fake real money sample experience", action: { label: "Explore the marketplace", href: "/browse" },
  },
];

export function filterFaqs(query: string, category: FaqCategory): FaqItem[] {
  const normalize = (value: string) => value.toLocaleLowerCase("en-US").replaceAll("’", "'").replaceAll("can't", "cannot");
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const questionScore = (item: FaqItem) => words.filter(word => normalize(item.question).includes(word)).length;
  return faqItems.filter(item => (category === "all" || item.category === category) && words.every(word =>
    normalize(`${item.question} ${item.answer} ${item.keywords}`).includes(word)))
    .sort((left, right) => questionScore(right) - questionScore(left));
}
