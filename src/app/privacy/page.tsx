import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, ReviewNotice, legalCopy } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the Zero Loss preview handles account, activity, support, and device information.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <LegalPage current="/privacy" title="Privacy Policy" description="What the current preview collects and uses, where it is stored, and the choices available to you.">
      <ReviewNotice />
      <article className="mt-5 max-w-4xl">
        <LegalSection id="scope" title="1. Scope and operator">
          <p className={legalCopy.paragraph}>This draft describes the Zero Loss website and its demo account experience. The operator’s final legal name, mailing address, public privacy contact, and any state-specific notices must be confirmed before a live launch. It should be updated whenever the product or its service providers change.</p>
        </LegalSection>
        <LegalSection id="information" title="2. Information the preview handles">
          <ul className={legalCopy.list}>
            <li><strong className="text-white">Account and profile:</strong> email, password credentials handled by the authentication service, legal and display names, date of birth, and any phone number, mailing address, or profile photo you choose to add.</li>
            <li><strong className="text-white">Activity:</strong> favorites, demo wallet and entry records, purchase-option and reward status, and account preferences needed to show your history and recover interrupted actions.</li>
            <li><strong className="text-white">Social and support features:</strong> Crew invitations, approved connections, sharing choices, support messages, and replies. Phone-contact selection, where offered by your device, shares only the contact you select and only when you take the next action.</li>
            <li><strong className="text-white">Technical information:</strong> session cookies and ordinary device, browser, and request information used to keep the site working and help protect accounts. Some preview preferences and pending-action details are stored in your browser.</li>
          </ul>
          <p className={legalCopy.paragraph}>The funding flow uses supplied sample cards and simulated balances. It does not ask for a real payment-card number. The identity walkthrough uses sample details; do not upload an ID document or enter a Social Security number.</p>
        </LegalSection>
        <LegalSection id="uses" title="3. Why information is used">
          <p className={legalCopy.paragraph}>Information supports account creation and sign-in, profile display, saved favorites, Crew sharing you choose, demo entries and wallet history, support conversations, security checks, and service troubleshooting. It may also be used to investigate misuse and maintain records needed to resolve a dispute or comply with law.</p>
        </LegalSection>
        <LegalSection id="sharing" title="4. Service providers and other people">
          <p className={legalCopy.paragraph}>The preview relies on providers for hosting, authentication, database storage, and account email delivery. They process information needed to provide those services. Crew information or selected activity is visible to other members only according to the connections and sharing settings you choose. A future real-payment, identity, or gift-card provider would need a separate review and an updated notice before live use.</p>
          <p className={legalCopy.paragraph}>This preview does not have an advertising network or a feature that sells your personal information to advertisers. We do not describe that as a permanent promise for a service that has not launched; any new practice would require an updated notice and any choices required by law.</p>
        </LegalSection>
        <LegalSection id="storage" title="5. Cookies and browser storage">
          <p className={legalCopy.paragraph}>Authentication uses session cookies. Local or session storage may remember a dismissed install prompt, sample Crew display choices, an unfinished entry or funding attempt, and a pending favorite while you sign in. Clearing browser storage can remove these convenience settings but does not erase saved account, wallet, entry, or support records.</p>
        </LegalSection>
        <LegalSection id="choices" title="6. Your choices and requests">
          <p className={legalCopy.paragraph}>You can update much of your profile in <Link className={legalCopy.link} href="/account/profile">Profile</Link>, manage Crew visibility and shared picks in <Link className={legalCopy.link} href="/account/crew">Your Crew</Link>, and remove saved items from <Link className={legalCopy.link} href="/account/favorites">Favorites</Link>. For access, correction, a privacy question, or an account-closure or deletion request, sign in and <Link className={legalCopy.link} href="/contact#message">send a private support message</Link>. If you cannot sign in, start with <Link className={legalCopy.link} href="/forgot-password">password recovery</Link>.</p>
          <p className={legalCopy.paragraph}>A closure or deletion request is reviewed rather than immediately erasing all records. Some account, entry, wallet, security, and support information may need to be kept for legal, fraud-prevention, or dispute-resolution reasons. A public privacy contact and a formal request process still need to be finalized before launch.</p>
        </LegalSection>
        <LegalSection id="retention" title="7. Retention and security">
          <p className={legalCopy.paragraph}>Information is kept while needed to operate the preview, support your account, maintain transaction history, resolve issues, or meet applicable obligations. The final retention schedule has not been approved and should be published before live operation. Access controls and account authentication reduce risk, but no online service can guarantee absolute security. Report a suspected account issue through <Link className={legalCopy.link} href="/contact#message">support</Link>.</p>
        </LegalSection>
        <LegalSection id="children" title="8. Minors and changes">
          <p className={legalCopy.paragraph}>The account experience is intended for adults, not children. If you believe a minor has created an account, contact support. This notice will be revised when practices change; a material change to a live service would require appropriate notice and, where required, a new choice or consent.</p>
        </LegalSection>
      </article>
    </LegalPage>
  );
}
