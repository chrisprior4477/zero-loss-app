import type { Metadata } from "next";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { PageContainer } from "@/components/layout/PageContainer";
import { SupportForm } from "@/components/support/SupportForm";
import { ProductSuggestion } from "@/components/help/ProductSuggestion";
import { FaqAnswer } from "@/components/help/FaqAnswer";
import { HelpShortcuts } from "@/components/help/HelpShortcuts";
import { faqItems } from "@/lib/help/faq";
import { getAccountContext } from "@/lib/account/context";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { authNavigationHref } from "@/lib/auth/entry-return";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Zero Loss, continue a private support conversation, or suggest a product.",
};

export default async function ContactPage() {
  const { account, accountUnavailable } = await getAccountContext()
    .then(account => ({ account, accountUnavailable: false }))
    .catch(() => ({ account: null, accountUnavailable: true }));
  const enabled = isPreviewDataEnvironment();
  let cases: { id: string; subject: string; status: string }[] = [];
  let casesUnavailable = false;
  if (account && enabled) {
    try {
      const db = await createClient();
      const result = await db.from("support_cases").select("id,subject,status").eq("customer_id", account.userId).order("updated_at", { ascending: false }).order("id", { ascending: false }).limit(3);
      cases = result.error ? [] : result.data ?? [];
      casesUnavailable = Boolean(result.error);
    } catch { casesUnavailable = true; }
  }
  const quickAnswers = faqItems.filter(item => ["open-reward", "purchase-options", "undo-entry", "password"].includes(item.id));
  const panel = "rounded-2xl border border-cyan-300/30 bg-[#052344] p-5 sm:p-7";
  return <PageContainer>
    <header><p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">Let’s get you to the right place</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Contact us</h1><p className="mt-4 max-w-2xl leading-7 text-white/70">A question, a missing update, or something that doesn’t look right? Find a quick answer or send us a message right here.</p></header>
    <HelpShortcuts activity={account?.activity} />
    <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
      <section id="message" aria-labelledby="contact-message-heading" className={`${panel} scroll-mt-48`}>
        <p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">Your conversation stays together</p><h2 id="contact-message-heading" className="mb-3 mt-2 text-2xl font-black">Send us a message</h2>
        {accountUnavailable ? <p role="alert">We couldn’t load your account. Refresh this page to try again. The answers and password-recovery link are still available.</p> : !account ? <>
          <p className="leading-7 text-white/75">Sign in to send a private request and keep track of the reply. We’ll bring you straight back to this form.</p><Link href={authNavigationHref("/login", "/contact#message")} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#00b9ff] px-5 font-black text-[#00132e]">Sign in to message us</Link><Link href="/forgot-password" className="mt-3 inline-flex min-h-11 items-center font-bold text-cyan-300 underline">Can’t sign in? Reset your password</Link><p className="mt-3 text-sm leading-6 text-white/60">A public contact email has not been added yet. You can read all FAQs without an account.</p>
        </> : !enabled ? <p role="status">Message submission is unavailable in this environment. You can still use the FAQs and account shortcuts.</p> : <>
          <p className="mb-5 text-sm leading-6 text-white/70">Send a message to start a private support case. Check the conversation or Notifications for replies; this preview does not send support emails.</p><SupportForm requestKey={randomUUID()} />
        </>}
      </section>
      <div className="space-y-6">
        {account && enabled ? <section className={panel} aria-labelledby="recent-conversations-heading"><h2 id="recent-conversations-heading" className="text-xl font-black">Continue a conversation</h2><p className="mt-2 text-sm leading-6 text-white/65">Add details to the same case instead of starting over.</p>{casesUnavailable ? <p role="status" className="mt-4 text-sm">We couldn’t load your recent cases. Try Help Center or refresh.</p> : cases.length ? <ul className="mt-4 space-y-3">{cases.map(item => <li key={item.id}><Link href={`/support?case=${item.id}#conversation`} className="block rounded-xl border border-cyan-300/25 px-4 py-3 hover:border-cyan-300"><strong className="block break-words text-cyan-100">{item.subject}</strong><span className="mt-1 block text-xs text-white/65">{item.status === "resolved" ? "Resolved" : item.status === "awaiting_customer" ? "Waiting for your reply" : item.status === "open" ? "Awaiting review" : "Check status"}<span aria-hidden="true"> →</span></span></Link></li>)}</ul> : <p className="mt-4 text-sm text-white/65">No conversations yet. Your first message will appear here once saved.</p>}<Link href="/support#case-list" className="mt-3 inline-flex min-h-11 items-center font-bold text-cyan-300">All my support cases →</Link></section> : null}
        <section aria-labelledby="quick-answers-heading"><h2 id="quick-answers-heading" className="mb-4 text-xl font-black">You might not need to wait</h2><div className="space-y-3">{quickAnswers.map(item => <FaqAnswer key={item.id} item={item} />)}</div><Link href="/faq" className="mt-3 inline-flex min-h-11 items-center font-bold text-cyan-300">Search all questions →</Link></section>
      </div>
    </div>
    <ProductSuggestion />
  </PageContainer>;
}
