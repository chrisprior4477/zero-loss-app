import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { MyZeroLossActivity } from "@/components/account/MyZeroLossActivity";
import { getAccountContext } from "@/lib/account/context";
import { activityFilter } from "@/lib/account/activity";

export const metadata: Metadata = { title: "My Zero Loss" };

export default async function MyZeroLossPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const account = await getAccountContext();
  if (!account) redirect("/login");
  const query = await searchParams;
  return <PageContainer>
    <Link href="/account" className="text-sm text-[#b5cce4] hover:text-cyan-300">‹ Account Dashboard</Link>
    <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">MY ZERO LOSS</p>
    <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em] text-white sm:text-5xl">Everything you chose.<br className="hidden sm:block" /> Every outcome.</h1>
    <p className="mt-3 text-sm leading-6 text-[#b5cce4]">Your entries, wins and exact-product purchase options.</p>
    <MyZeroLossActivity state={account.activity} filter={activityFilter(query.filter)} selectedSlug={typeof query.item === "string" ? query.item : undefined} />
  </PageContainer>;
}
