import { readyWalletRewards, walletHistoryHref, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import { accountRoutes } from "@/lib/account/navigation";
import { StatusTicket } from "./StatusTicket";
import styles from "./account-status-strip.module.css";

export type AccountSettingsOverview = { balanceLabel: string; fundingEnabled: boolean; activity: AccountActivity };

export function AccountSettingsStatusStrip({ overview }: { overview: AccountSettingsOverview }) {
  const rewards = readyWalletRewards(overview.activity);
  const singleReward = rewards.length === 1 ? rewards[0] : null;
  const optionCount = overview.activity.source === "unavailable" ? null : overview.activity.activity.filter((item) => item.status === "completion").length;
  return <div className={styles.row} aria-label="Your account overview">
    <StatusTicket variant="wallet" size="top" label="Playable Wallet" value={overview.balanceLabel} action="Add funds" href={walletHistoryHref} actionHref={overview.fundingEnabled ? `${walletHistoryHref}#add-funds` : undefined} actionDisabled={!overview.fundingEnabled} />
    <StatusTicket variant="reward" size="top" label="Prize Ready" value={overview.activity.source === "unavailable" ? "Unavailable" : String(rewards.length)} action={singleReward ? "View reward" : "View rewards"} href={singleReward ? walletRewardHref(singleReward) : accountRoutes.rewards} />
    <StatusTicket variant="option" size="top" label="Purchase Options" value={optionCount === null ? "Unavailable" : String(optionCount)} action="Review options" href={accountRoutes.purchaseOptions} />
  </div>;
}
