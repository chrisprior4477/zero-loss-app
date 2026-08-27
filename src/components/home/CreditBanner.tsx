/**
 * Rebate credit banner (C2), styled to the Checkpoint 2 artboard's #007CFF
 * panel.
 *
 * PRESENTATIONAL ONLY. The amount is a required prop — this component never
 * reads the ledger, and it is not the header wallet chip. The homepage passes
 * a clearly labelled development fixture today; production can pass an
 * authoritative ledger-derived value through the same prop later.
 * Spec §32: financial values must come from server-authorized reads, and the
 * one real ledger read on this site lives in SiteHeader.
 *
 * The copy here is the approved wording and deliberately replaces the
 * artboard's text, which used three phrasings that were rejected in review:
 * "unclaimed credit", "Claim your credit", and "it never expires". Expiration
 * is deliberately not stated while financial rules §3.3 remains flagged for
 * legal review.
 *
 * Rebate credit must also stay visually distinct from the wallet's playable
 * balance (account-wallet-spec §8): different label, different surface, and
 * never presented as unrestricted funds.
 */

type CreditBannerProps = {
  /** Preformatted currency string supplied by the page's data owner. */
  amount: string;
  /** Makes development fixture status explicit in customer-visible copy. */
  isDevelopmentPlaceholder?: boolean;
};

export function CreditBanner({
  amount,
  isDevelopmentPlaceholder = false,
}: CreditBannerProps) {
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
          {isDevelopmentPlaceholder
            ? `Rebate Credit Preview: ${amount}`
            : `Rebate Credit Balance: ${amount} available.`}
        </h2>
        <p className="mt-3.5 max-w-md text-[15.5px] leading-[1.6] text-[rgba(255,255,255,0.88)] text-pretty">
          {isDevelopmentPlaceholder
            ? "Development fixture for layout testing — not a live customer balance."
            : "Use eligible rebate credit separately from your playable balance."}
        </p>
      </div>

      <div className="flex flex-col items-start gap-3">
        <span className="rounded-full bg-[var(--urgent)] px-7 py-4 text-[15px] font-bold text-black">
          Redemption coming soon
        </span>
        <span className="font-mono text-xs leading-[1.5] text-[rgba(255,255,255,0.72)]">
          Separate from your wallet balance · redeemable on eligible items
        </span>
      </div>
    </section>
  );
}
