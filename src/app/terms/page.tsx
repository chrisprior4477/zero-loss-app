import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, ReviewNotice, legalCopy } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Proposed terms for using the Zero Loss demo marketplace and account features.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <LegalPage current="/terms" title="Terms of Service" description="A plain-language draft for the current Zero Loss preview. These terms do not replace approved Official Rules for any future live promotion.">
      <ReviewNotice />
      <article className="mt-5 max-w-4xl">
        <LegalSection id="preview" title="1. Preview service and acceptance">
          <p className={legalCopy.paragraph}>Zero Loss currently provides a demo marketplace. Its displayed balances, entries, outcomes, identity walkthrough, and retailer gift cards are simulated. The preview does not accept real payment-card information, complete actual identity verification, or issue a real prize. Do not enter real card numbers, Social Security numbers, or identity documents into demo fields.</p>
          <p className={legalCopy.paragraph}>Use of account features requires an account and agreement to the terms presented during signup. This draft is for review; the legal operator name, address, final terms, and approved Official Rules must be supplied before a live offering opens.</p>
        </LegalSection>
        <LegalSection id="account" title="2. Your account">
          <p className={legalCopy.paragraph}>The preview is intended for adults. Provide accurate account information, keep your password private, and use one account for yourself. Do not impersonate someone else, interfere with another account, automate entries, or try to bypass displayed limits or security controls. Eligibility and geographic restrictions for a future live promotion will be set out in its approved Official Rules.</p>
        </LegalSection>
        <LegalSection id="entries" title="3. Demo entries and wallet">
          <p className={legalCopy.paragraph}>Demo funding uses simulated money, not a real charge. Each entry is tied to the listing selected and stands on its own. Multiple entries may be available in the preview, subject to the limit shown for that listing; separate entries do not combine into one larger discount or purchase option. Account activity and wallet history show the saved demo records.</p>
          <p className={legalCopy.paragraph}>A submitted demo entry has a 30-second pending window in which the whole submission can be undone. A successful undo returns the reserved demo amount to Playable Balance, not to a payment card. Closing the notice does not undo the submission. After the window ends, use <Link className={legalCopy.link} href="/account/entries">My Activity</Link> to check its status. A demo restart may remove a sample reward from view while preserving its original entry and wallet history.</p>
        </LegalSection>
        <LegalSection id="outcomes" title="4. Outcomes and retailer value">
          <p className={legalCopy.paragraph}>In the preview, selection outcomes and rewards are simulated. The intended reward for a selected entry is the stated value in a gift card for the retailer named on the listing, not direct delivery of the pictured product. A retailer gift card may be used for eligible purchases with that retailer under its own redemption terms; product availability and prices can change.</p>
          <p className={legalCopy.paragraph}>For an entry that is not selected, a separate completion option may be shown with its own remaining amount and deadline. Completing one option does not apply another entry toward its balance. If an option expires or is declined, its original entry does not become a general-purpose credit. The final treatment of any real paid entry, refund, reward, deadline, and no-purchase entry will be governed by approved rules and applicable law, not this demo description.</p>
        </LegalSection>
        <LegalSection id="free-entry" title="5. No-purchase entry before any live launch">
          <p className={legalCopy.paragraph}>The <Link className={legalCopy.link} href="/free-entry">free-entry page</Link> is an operational prototype only. It does not currently submit, reserve, or create an entry. No live promotion should open until a no-purchase method, eligibility, timing, processing address, limits, and equal treatment are finalized and approved in Official Rules.</p>
        </LegalSection>
        <LegalSection id="availability" title="6. Availability, conduct, and third parties">
          <p className={legalCopy.paragraph}>The preview may change or be unavailable while features are developed or maintained. Do not misuse the site, attempt unauthorized access, submit false information, or disrupt other users. Product names and retailer marks identify the relevant offering; retailer gift cards remain subject to the issuing retailer’s terms. Zero Loss does not place a product order or ship a pictured item on a customer’s behalf.</p>
        </LegalSection>
        <LegalSection id="support" title="7. Questions and account requests">
          <p className={legalCopy.paragraph}>For an account issue, disputed demo record, request to pause participation, or account-closure request, sign in and <Link className={legalCopy.link} href="/contact#message">send a private support message</Link>. Account closure is a request for review, not an instant erasure of wallet, entry, security, or support records. If you cannot sign in, start with <Link className={legalCopy.link} href="/forgot-password">password recovery</Link>. A public support address and final operator contact details still need to be added before live launch.</p>
        </LegalSection>
        <LegalSection id="final-terms" title="8. Final legal terms still required">
          <p className={legalCopy.paragraph}>The supplied Official Rules draft leaves the sponsor’s legal identity, eligible states, mail-in address, dispute process, governing law, and other terms unresolved. Those provisions, and any limitation of liability or dispute-resolution clause, require qualified legal review. We are not presenting them here as agreed or enforceable live-promotion terms.</p>
        </LegalSection>
      </article>
    </LegalPage>
  );
}
