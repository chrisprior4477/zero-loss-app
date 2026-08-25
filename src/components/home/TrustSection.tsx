import Link from "next/link";

/**
 * Trust & transparency (homepage spec §21).
 *
 * Copy constraints applied here, from
 * `docs/product/marketplace-financial-rules-spec.md`:
 *   - §5.1  public-facing content must NEVER mention or imply that a prize
 *           can be redeemed for cash, under any circumstance.
 *   - §3.1  a non-winning entry becomes the right to complete the purchase of
 *           that item — it is never described as a refund.
 *   - §3.3  rebate/loser-credit expiration is 🔴 Flagged pending legal review,
 *           so no expiration window is asserted anywhere in this copy.
 *   - §4.6  paid-tier entry scaling is 🔴 Flagged, so membership mechanics are
 *           not promoted here.
 */

const trustPoints = [
  {
    title: "You always keep the value",
    body: "If you don't win, what you spent goes toward buying that item instead. Your participation keeps its worth.",
  },
  {
    title: "Clear, published rules",
    body: "Entry counts, pool size, and how a draw closes are stated up front on every item — before you participate.",
  },
  {
    title: "Every dollar is accounted for",
    body: "Balances and activity are tracked against a complete transaction record you can review any time.",
  },
  {
    title: "Your account stays yours",
    body: "Secure sign-in, and financial details are only ever shown to you.",
  },
];

export function TrustSection() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-7">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {trustPoints.map((point) => (
          <li key={point.title}>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {point.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              {point.body}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-5 text-sm">
        <Link
          href="/how-it-works"
          className="text-[var(--accent)] transition-opacity hover:opacity-80"
        >
          How it works
        </Link>
        <Link
          href="/faq"
          className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          FAQ
        </Link>
        <Link
          href="/responsible-participation"
          className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Responsible Participation
        </Link>
        <Link
          href="/support"
          className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Support
        </Link>
      </div>
    </div>
  );
}
