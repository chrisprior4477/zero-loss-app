export type WalletPanel = "balance" | "transactions" | "cards" | "add-funds";
export function walletPanel(value: unknown): WalletPanel {
  return value === "transactions" || value === "cards" || value === "add-funds" ? value : "balance";
}
export function walletPanelFromLocation(search: string, hash = ""): WalletPanel {
  if (hash === "#add-card") return "cards";
  if (hash === "#add-funds") return "add-funds";
  if (hash === "#transactions" || hash.startsWith("#transaction-")) return "transactions";
  const query = new URLSearchParams(search);
  if (hash === "#balance") return "balance";
  if (query.has("transaction")) return "transactions";
  return walletPanel(query.get("panel"));
}
export function walletPanelHref(panel: WalletPanel, search = ""): string {
  const query = new URLSearchParams(search);
  query.set("view", "history"); query.set("panel", panel);
  query.delete("reward"); query.delete("rewardId"); query.delete("rewards");
  if (panel !== "transactions") query.delete("transaction");
  return `/account/wallet?${query}#wallet-content`;
}
