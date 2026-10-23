import Link from "next/link";
import { activityHref, readyWalletRewards, walletRewardHref, type AccountActivity } from "@/lib/account/activity";
import styles from "./help-tickets.module.css";

/** Use only the caller's authorized activity. A single result skips the collection page. */
export function helpShortcuts(activity?: AccountActivity) {
  const rewards = activity ? readyWalletRewards(activity) : [];
  const options = activity?.source === "stored" ? activity.activity.filter(item => item.status === "completion" && item.completionOptionStatus === "available") : [];
  return [
    { label: rewards.length === 1 ? "Open my reward" : "My rewards", detail: rewards.length === 1 ? rewards[0].title : "Gift cards & prize details", href: rewards.length === 1 ? walletRewardHref(rewards[0]) : "/account/wallet", tone: "text-[#67ff42]" },
    { label: options.length === 1 ? "Review my purchase option" : "Purchase options", detail: options.length === 1 ? options[0].title : "See what you can complete", href: options.length === 1 ? activityHref(options[0], "/account/entries", "completion") : "/account/entries?filter=completion", tone: "text-[#ff9b62]" },
    { label: "Wallet & transactions", detail: "Balance, funding & payment help", href: "/account/wallet?view=history", tone: "text-cyan-300" },
  ];
}

export function HelpShortcuts({ activity }: { activity?: AccountActivity }) {
  return <nav aria-label="Quick account shortcuts" className={styles.shortcuts}>
    {helpShortcuts(activity).map((item, index) => <Link key={item.label} href={item.href} data-tone={["reward", "purchase", "wallet"][index]} className={`${styles.ticket} ${styles.button} ${styles.shortcut}`}>
      <span className="min-w-0"><strong className="block">{item.label}</strong><span className={styles.detail}>{item.detail}</span></span><span aria-hidden="true">→</span>
    </Link>)}
  </nav>;
}
