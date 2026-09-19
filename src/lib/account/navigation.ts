/** Stable account destinations. Visible labels may evolve without breaking saved links. */
export const accountRoutes = {
  dashboard: "/account/entries",
  activity: "/account/entries",
  openEntries: "/account/entries?filter=active",
  purchaseOptions: "/account/entries?filter=completion",
  rewards: "/account/wallet",
  walletHistory: "/account/wallet?view=history",
  orders: "/account/orders",
  crew: "/account/crew",
  notifications: "/account/notifications",
  security: "/account/security",
} as const;

export const accountNavigation = [
  ["My Activity", accountRoutes.activity, "layers"],
  ["Gift Cards & Rewards", accountRoutes.rewards, "gift"],
  ["Wallet & Transactions", accountRoutes.walletHistory, "wallet"],
  ["Orders & Fulfillment", accountRoutes.orders, "orders"],
  ["Your Crew", accountRoutes.crew, "crew"],
  ["Notifications", accountRoutes.notifications, "bell"],
  ["Account & Security", accountRoutes.security, "security"],
] as const;
