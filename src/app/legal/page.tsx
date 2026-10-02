import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, ReviewNotice, legalCopy } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Legal and Safety",
  description: "Review Zero Loss terms, privacy practices, and responsible participation resources for the current preview.",
  robots: { index: false, follow: false },
};

const pages = [
  { href: "/terms", title: "Terms of Service", description: "How accounts, demo entries, outcomes, purchase options, and retailer gift-card rewards work." },
  { href: "/privacy", title: "Privacy Policy", description: "What the preview collects, why it is used, and how to ask about your information." },
  { href: "/responsible-participation", title: "Responsible Play", description: "Practical ways to step back, request help, and reach independent support." },
] as const;

export default function LegalPageOverview() {
  return (
    <LegalPage current="/legal" title="Legal and safety" description="The essentials behind the Zero Loss preview, collected in one place and written to match what the site currently does.">
      <ReviewNotice />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {pages.map((page) => (
          <Link key={page.href} href={page.href} className="group flex min-h-48 flex-col justify-between rounded-2xl border border-cyan-300/25 bg-[#052344] p-5 transition-colors hover:border-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
            <span><strong className="block text-xl font-black text-white">{page.title}</strong><span className="mt-3 block text-sm leading-6 text-white/70">{page.description}</span></span>
            <span className="mt-5 text-sm font-bold text-cyan-300 group-hover:text-white">Read {page.title} <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
      <p className={`mt-7 max-w-3xl ${legalCopy.paragraph}`}>The <Link className={legalCopy.link} href="/free-entry">free-entry page</Link> currently demonstrates a proposed mail-in process; it does not create an entry. For a question about your account or a request to close it, use the <Link className={legalCopy.link} href="/contact#message">private support form</Link> while signed in.</p>
    </LegalPage>
  );
}
