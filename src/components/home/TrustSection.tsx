import Link from "next/link";

/**
 * Trust & transparency (homepage spec §21).
 *
 * Copy constraints applied here, from
 * `docs/product/marketplace-financial-rules-spec.md`:
 *   - §5.1  public-facing content must NEVER mention or imply that a prize
 *           can be redeemed for cash, under any circumstance.
 *   - §3.1  an everyday/on-demand non-selected entry creates an option to
 *           complete that exact product purchase — never a refund or balance.
 *   - §3.2–3.3 scarce-item fallback and timing remain unresolved and inactive,
 *           so this copy makes no promise about either.
 *   - §4.6  paid-tier entry scaling is 🔴 Flagged, so membership mechanics are
 *           not promoted here.
 */

const trustPoints = [
  {
    title: "You always keep the value",
    body: "For eligible everyday items, a non-selected entry can be applied toward buying that exact product. You pay the remaining balance.",
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
    <div className="rounded-2xl bg-[var(--surface)] p-6 sm:p-8">
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

      <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-5 text-sm">
        <Link
          href="/how-it-works"
          className="font-semibold text-[var(--accent)] transition-opacity hover:opacity-80"
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
