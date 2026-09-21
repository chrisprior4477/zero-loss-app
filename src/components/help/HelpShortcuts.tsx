import Link from "next/link";
import { activityHref, readyWalletRewards, walletRewardHref, type AccountActivity } from "@/lib/account/activity";

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
  return <nav aria-label="Quick account shortcuts" className="my-6 grid grid-cols-3 gap-2 sm:my-7 sm:gap-3">
    {helpShortcuts(activity).map(item => <Link key={item.label} href={item.href} className="group flex min-h-20 min-w-0 items-center justify-between gap-3 rounded-2xl border border-cyan-300/25 bg-[#082e52] p-3 transition-colors hover:border-cyan-300 hover:bg-[#0c3d64] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 sm:p-5">
      <span className="min-w-0"><strong className={`block text-sm sm:text-base ${item.tone}`}>{item.label}</strong><span className="mt-1 hidden text-sm leading-5 text-white/65 sm:block">{item.detail}</span></span><span aria-hidden="true" className="hidden shrink-0 text-xl text-cyan-300 sm:inline">→</span>
    </Link>)}
  </nav>;
}
