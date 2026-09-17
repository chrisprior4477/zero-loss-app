import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getAccountContext } from "@/lib/account/context";
import { WalletOverview } from "@/components/wallet/WalletOverview";
import { WalletRewardDetail, WalletRewards } from "@/components/wallet/WalletRewards";
import { walletHistoryHref, walletRewards } from "@/lib/account/activity";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";

export const metadata: Metadata = { title: "Your wallet" };

export default async function WalletPage({ searchParams }: { searchParams: Promise<{ reward?: string | string[]; view?: string | string[] }> }) {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  const query = await searchParams;
  const requestedReward = query.reward !== undefined;
  // A URL only selects from this authenticated account's authorized data.
  const reward = typeof query.reward === "string" ? walletRewards(account.activity).find(item => item.slug === query.reward) : undefined;
  const history = !requestedReward && query.view === "history";
  const provider = history && account.wallet?.scope === "demo" ? new DemoPaymentProvider(await createClient()) : null;
  const [requests, savedCard] = await Promise.all([
    provider ? provider.getRequests().catch(() => null) : null,
    provider && account.fundingEnabled ? provider.getPaymentMethod().catch(() => undefined) : null,
  ]);
  const sections = [["Your prizes", "/account/wallet", !history], ["Funds & history", walletHistoryHref, history]] as const;
  return <PageContainer>
    <main className="mx-auto w-full max-w-6xl pb-10">
    <Link href="/account" className="text-sm text-[#b5cce4] hover:text-cyan-300">‹ Account Dashboard</Link>
    <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-4xl">Your wallet</h1>
    <nav aria-label="Wallet sections" className="mt-4 flex gap-3 border-b border-white/10">
      {sections.map(([label, href, current]) => <Link key={href} href={href} aria-current={current ? "page" : undefined} className={`inline-flex min-h-12 items-center border-b-2 px-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-cyan-300 ${current ? "border-[#31ff83] text-[#72ff9f]" : "border-transparent text-[#b5cce4] hover:text-white"}`}>{label}</Link>)}
    </nav>
    {requestedReward ? reward ? <WalletRewardDetail item={reward} isPreview={account.activity.isPreview} /> : <div role="status" className="mt-6 rounded-2xl border border-white/10 bg-[#06223d] p-6"><h2 className="text-lg font-bold text-white">Reward unavailable</h2><p className="mt-2 text-sm text-[#b5cce4]">That reward is not available in your account.</p><Link href="/account/wallet" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-cyan-300">Back to your wallet ›</Link></div>
      : history ? <WalletOverview wallet={account.wallet} fundingEnabled={account.fundingEnabled} requestKey={randomUUID()} requests={requests} savedCard={savedCard ?? null} cardUnavailable={savedCard === undefined} /> : <WalletRewards state={account.activity} />}
    </main>
  </PageContainer>;
}
