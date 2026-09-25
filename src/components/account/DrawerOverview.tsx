import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { StatusTicket } from "./StatusTicket";
import styles from "./drawer.module.css";
import { accountRoutes } from "@/lib/account/navigation";

/** Navigation shortcuts only; amounts and ownership remain server-authorized. */
export function DrawerOverview({ state, balanceLabel, fundingEnabled, onNavigate }: {
  state: AccountActivity; balanceLabel: string | null; fundingEnabled: boolean; onNavigate: () => void;
}) {
  const rewards = readyWalletRewards(state);
  const count = state.source === "unavailable" ? null : rewards.length;
  const single = count === 1 ? rewards[0] : null;
  const optionCount = state.source === "unavailable" ? null : state.activity.filter(item => item.status === "completion").length;
  return <div aria-label="Your Zero Loss overview" className={styles.overview}>
    <StatusTicket variant="wallet" label="Playable Wallet" value={balanceLabel ?? "Unavailable"} valueTestId="drawer-balance" action="Add funds" href={walletHistoryHref} actionHref={fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!fundingEnabled} onNavigate={onNavigate} />
    <StatusTicket variant="reward" label="Prize Ready" value={count === null ? "Unavailable" : String(count)} action={single ? "Show barcode" : "View rewards"} href={single ? walletRewardHref(single) : accountRoutes.rewards} ariaLabel={`Prize Ready — ${count === null ? "Reward count unavailable" : `${count} ${count === 1 ? "reward" : "rewards"}`}`} onNavigate={onNavigate} />
    <StatusTicket variant="option" label="Purchase Options" value={optionCount === null ? "Unavailable" : String(optionCount)} action="Review options" href={accountRoutes.purchaseOptions} ariaLabel={`Purchase Options — ${optionCount === null ? "Count unavailable" : `${optionCount} available`}`} tooltip="Time-limited choices" onNavigate={onNavigate} />
  </div>;
}
