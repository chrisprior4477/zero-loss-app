import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileShortcut } from "@/components/account/ProfileShortcut";
import { MyZeroLossSummary, PlayableBalanceCard } from "@/components/account/AccountSummaries";
import { DashboardActivity } from "@/components/account/DashboardActivity";
import { getAccountContext } from "@/lib/account/context";
import { WalletShortcut } from "@/components/wallet/WalletShortcut";
import styles from "@/components/account/dashboard.module.css";

export const metadata: Metadata = { title: "Account Dashboard" };

const accountLinks = [
  ["Orders & fulfillment", "Your orders and delivery updates", "/account/orders"],
  ["Notifications", "Account messages and activity updates", "/account/notifications"],
  ["Account & Security", "Email confirmation and sign-in details", "/account/security"],
] as const;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ item?: string | string[] }> }) {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  const query = await searchParams;
  const selectedSlug = typeof query.item === "string" ? query.item : undefined;
  const { displayName: fullName, initials, avatarUrl, balanceLabel: balance } = account;

  return (
    <div className={styles.page}>
    <PageContainer className={styles.shell}>
      <main className="mx-auto w-full max-w-6xl pb-10">
        <header className={`${styles.hero} flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Account Dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Your Zero Loss, at a glance.</h1>
            <p className="mt-2 text-sm text-[#b5cce4]">Your balance, your rewards, and every outcome.</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${account.emailConfirmed ? "border-[#31e800]/25 bg-[#31e800]/10 text-[#85ff68]" : "border-amber-200/25 bg-amber-200/10 text-amber-200"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {account.emailConfirmed ? "Email confirmed" : "Email confirmation pending"}
          </span>
        </header>

        <section aria-label="Your Zero Loss overview" className={`${styles.overview} mt-4 grid gap-3 lg:grid-cols-3`}>
          <PlayableBalanceCard balanceLabel={balance} fundingEnabled={account.fundingEnabled} />
          <WalletShortcut state={account.activity} dashboard />
          <MyZeroLossSummary state={account.activity} />
        </section>

        <div className={styles.activity}><DashboardActivity state={account.activity} selectedSlug={selectedSlug} /></div>

        <section aria-label="Manage your account" className={`${styles.management} mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
          <ProfileShortcut fullName={fullName} initials={initials} avatarUrl={avatarUrl} />
          {accountLinks.map(([title, detail, href]) => (
            <Link key={title} href={href} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.06] focus-visible:outline-2 focus-visible:outline-cyan-300">
              <span><strong className="block text-sm text-white">{title}</strong><span className="mt-1 block text-xs leading-5 text-[#b5cce4]">{detail}</span></span>
              <span className="text-xl text-cyan-300" aria-hidden="true">›</span>
            </Link>
          ))}
        </section>
      </main>
    </PageContainer>
    </div>
  );
}
