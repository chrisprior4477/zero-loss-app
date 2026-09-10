export const investorDemoAccount = {
  customerName: "Chris P.",
  accountLabel: "Investor demo account",
  playableBalance: "$24.00",
  activeEntries: 12,
  resultsReady: 2,
  orderCount: 1,
  notificationCount: 3,
} as const;

export const accountPreviewDestinations = {
  entries: {
    title: "My Entries",
    description: "Entry history and pool progress will appear here as the catalog journey is built.",
  },
  orders: {
    title: "Orders & Fulfillment",
    description: "Prize claims, completion purchases, and fulfillment updates will appear here.",
  },
  wallet: {
    title: "Wallet & Transactions",
    description: "This preview will connect Playable Balance and ledger-derived transaction history without combining entry-bound completion options.",
  },
  notifications: {
    title: "Notifications",
    description: "Account, entry-result, and fulfillment notifications will appear here.",
  },
  security: {
    title: "Account & Security",
    description: "Identity, sign-in, and security controls will appear here after their authoritative data sources are connected.",
  },
  results: {
    title: "Results Ready",
    description: "Result details and entry-bound next steps will appear here. No completion option is added to Playable Balance.",
  },
  "official-rules": {
    title: "Official Rules & Free Entry",
    description: "Draft destination for the official rules and free-entry method. Content is subject to legal review and is not final.",
  },
} as const;

export type AccountPreviewSlug = keyof typeof accountPreviewDestinations;

export function isAccountPreviewSlug(value: string): value is AccountPreviewSlug {
  return value in accountPreviewDestinations;
}
