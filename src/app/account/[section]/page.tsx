import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My Account" };

const liveSections = {
  entries: {
    title: "My entries",
    description: "Your live entries and results will appear here.",
    empty: "You do not have any entries yet.",
    action: "Browse products",
    href: "/#ending-soon",
  },
  orders: {
    title: "Orders & fulfillment",
    description: "Track reward delivery and retailer fulfillment.",
    empty: "You do not have any orders or rewards in fulfillment.",
    action: "Browse rewards",
    href: "/#popular-rewards",
  },
  notifications: {
    title: "Notifications",
    description: "Account, entry, result, and fulfillment updates.",
    empty: "You do not have any new notifications.",
    action: "Back to account",
    href: "/account",
  },
  security: {
    title: "Account & security",
    description: "Manage your password, trusted devices, and two-step verification.",
    empty: "Your email is verified. Additional security controls are coming next.",
    action: "Back to account",
    href: "/account",
  },
  results: {
    title: "Results",
    description: "Review completed entry outcomes and available next steps.",
    empty: "You do not have any results to review yet.",
    action: "Browse products",
    href: "/#ending-soon",
  },
} as const;

type LiveSection = keyof typeof liveSections;

export default async function LiveAccountSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in liveSections)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const content = liveSections[section as LiveSection];

  return (
    <PageContainer>
      <section className="mx-auto w-full max-w-3xl" aria-labelledby="live-account-heading">
        <p className="text-sm font-black uppercase tracking-[0.15em] text-cyan-300">Live account</p>
        <h1 id="live-account-heading" className="mt-2 text-4xl font-black tracking-[-0.04em] text-white">{content.title}</h1>
        <p className="mt-3 text-base text-white/60">{content.description}</p>
        <div className="mt-8 rounded-[24px] border border-white/12 bg-white/[0.045] p-7 text-center">
          <div className="mx-auto h-12 w-12 rounded-full border border-cyan-300/30 bg-cyan-300/10" aria-hidden="true" />
          <p className="mt-5 text-base font-bold text-white">{content.empty}</p>
          <Link href={content.href} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-cyan-300 px-5 text-sm font-black text-[#00132e] hover:bg-cyan-200">{content.action}</Link>
        </div>
      </section>
    </PageContainer>
  );
}
