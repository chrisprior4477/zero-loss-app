import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { FaqExplorer } from "@/components/help/FaqExplorer";
import { HelpShortcuts } from "@/components/help/HelpShortcuts";
import { getAccountContext } from "@/lib/account/context";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Find answers about Zero Loss entries, wallet funding, prizes, gift cards, Crew sharing, and support.",
};

export default async function FaqPage() {
  const account = await getAccountContext().catch(() => null);
  return <PageContainer>
    <header><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">A little clarity. A quicker next step.</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Frequently asked questions</h1><p className="mt-4 max-w-2xl leading-7 text-white/70">Find an answer, then go straight to what you need. These answers describe the current Zero Loss MVP.</p></header>
    <HelpShortcuts activity={account?.activity} />
    <FaqExplorer />
    <section className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-cyan-300/30 bg-[#082e52] p-6 sm:flex-row sm:items-center"><div><h2 className="text-xl font-extrabold">Still need a hand?</h2><p className="mt-2 text-sm text-white/70">Keep the details and the reply together in one private conversation.</p></div><Link href="/contact#message" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#31e800] px-5 font-black text-[#00132e]">Contact us →</Link></section>
  </PageContainer>;
}
