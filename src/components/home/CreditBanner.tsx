/**
 * Rebate credit banner (C2), styled to the Checkpoint 2 artboard's #007CFF
 * panel.
 *
 * PRESENTATIONAL ONLY. The amount is a prop with a placeholder default — this
 * component never reads the ledger, and it is not the header wallet chip.
 * Spec §32: financial values must come from server-authorized reads, and the
 * one real ledger read on this site lives in SiteHeader.
 *
 * The copy here is the approved wording and deliberately replaces the
 * artboard's text, which used three phrasings that were rejected in review:
 * "unclaimed credit", "Claim your credit", and "it never expires". The last
 * of those directly contradicts financial rules §3.3, which sets a 30-day
 * window on rebate/loser credit — a rule still flagged for legal review, so
 * this banner states the window without enforcing anything.
 *
 * Rebate credit must also stay visually distinct from the wallet's playable
 * balance (account-wallet-spec §8): different label, different surface, and
 * never presented as unrestricted funds.
 */

type CreditBannerProps = {
  /** Preformatted currency string. Placeholder — not a ledger read. */
  amount?: string;
};

export function CreditBanner({ amount = "$18" }: CreditBannerProps) {
  return (
    <section
      aria-labelledby="credit-banner-heading"
      className="grid items-center gap-8 rounded-2xl bg-[var(--accent-bright)] px-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-11 lg:px-10"
    >
      <div>
        <h2
          id="credit-banner-heading"
          className="text-[26px] font-extrabold leading-[1.12] tracking-[-0.03em] text-[var(--foreground)] sm:text-[32px]"
        >
          Rebate Credit Balance: {amount} available.
        </h2>
        <p className="mt-3.5 max-w-md text-[15.5px] leading-[1.6] text-[rgba(255,255,255,0.88)] text-pretty">
          Redeem this credit toward any purchase within 30 days of issuance.
        </p>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="rounded-full bg-[var(--urgent)] px-7 py-4 text-[15px] font-bold text-black">
          Redeem credit
        </span>
        <span className="font-mono text-xs leading-[1.5] text-[rgba(255,255,255,0.72)]">
          Separate from your wallet balance · redeemable on eligible items
        </span>
      </div>
    </section>
  );
}
