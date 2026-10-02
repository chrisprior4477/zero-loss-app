import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, ReviewNotice, legalCopy } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Responsible Play",
  description: "Ways to take a break from Zero Loss and reach independent problem-gambling and crisis support.",
  robots: { index: false, follow: false },
};

export default function ResponsibleParticipationPage() {
  return (
    <LegalPage current="/responsible-participation" title="Responsible Play" description="This should stay enjoyable and within your control. If it does not, stop and reach out — you do not have to handle it alone.">
      <ReviewNotice />
      <div className="mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#31e800]/40 bg-[#123e27] p-5">
          <span className="block text-xs font-black uppercase tracking-[.15em] text-[#9bff83]">Gambling support</span>
          <a href="tel:18006973738" className="mt-2 inline-block text-xl font-black text-white underline decoration-[#9bff83]/50 underline-offset-4">1-800-MY-RESET</a>
          <p className="mt-2 text-sm leading-6 text-white/75">National Problem Gambling Helpline. Find guidance and local resources.</p>
          <a href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-[#9bff83] underline underline-offset-4">NCPG help and treatment ↗</a>
        </div>
        <div className="rounded-2xl border border-cyan-300/35 bg-[#082e52] p-5">
          <span className="block text-xs font-black uppercase tracking-[.15em] text-cyan-300">Emotional crisis support</span>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2"><a href="tel:988" className="text-xl font-black text-white underline decoration-cyan-300/50 underline-offset-4">Call 988</a><a href="sms:988" className="text-xl font-black text-white underline decoration-cyan-300/50 underline-offset-4">Text 988</a></div>
          <p className="mt-2 text-sm leading-6 text-white/75">Free, confidential support in the United States. If someone is in immediate danger, call 911.</p>
          <a href="https://988lifeline.org/get-help/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-cyan-300 underline underline-offset-4">988 Lifeline options ↗</a>
        </div>
      </div>
      <article className="mt-5 max-w-4xl">
        <LegalSection id="warning-signs" title="Notice when it stops feeling fun">
          <p className={legalCopy.paragraph}>Take a break if you find yourself chasing an outcome, spending more than planned, borrowing to participate, hiding activity, or feeling unable to stop. A chance of selection is never a reason to spend money needed for essentials. More entries mean more separate chances in the preview, not a guaranteed result or a combined discount.</p>
        </LegalSection>
        <LegalSection id="steps" title="Make a plan before participating">
          <ul className={legalCopy.list}>
            <li>Decide on a time and money limit in advance and stop when either is reached.</li>
            <li>Do not treat a gift-card outcome or purchase option as a way to recover losses.</li>
            <li>Pause notifications, leave the site, and talk with someone you trust if participation feels hard to control.</li>
            <li>Check <Link className={legalCopy.link} href="/account/entries">My Activity</Link> and <Link className={legalCopy.link} href="/account/wallet">Wallet & Transactions</Link> for a clear view of your demo history.</li>
          </ul>
        </LegalSection>
        <LegalSection id="pause" title="Ask Zero Loss for a pause or account closure">
          <p className={legalCopy.paragraph}>If you want to stop participating, do not submit another entry. While signed in, <Link className={legalCopy.link} href="/contact#message">send a private support request</Link> asking for a participation pause or account closure. Explain whether you also need help with an existing entry, wallet balance, purchase option, or reward. If you cannot sign in, start with <Link className={legalCopy.link} href="/forgot-password">password recovery</Link>.</p>
          <p className={legalCopy.paragraph}>The current MVP does not have a self-service spending limit, time-out, or self-exclusion switch. A support request is not an automatic restriction, and we cannot promise immediate closure. These controls and a public contact path need to be built and reviewed before any live-money launch. Independent help above is available now; you do not need to wait for Zero Loss to reply.</p>
        </LegalSection>
        <LegalSection id="someone-else" title="If you are worried about someone else">
          <p className={legalCopy.paragraph}>Speak with them without blame and encourage them to use an independent support resource. The <a className={legalCopy.link} href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noopener noreferrer">National Council on Problem Gambling</a> has guidance for affected family and friends as well as participants. In an immediate emergency, call 911.</p>
        </LegalSection>
      </article>
    </LegalPage>
  );
}
