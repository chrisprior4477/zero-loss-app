import Link from "next/link";

type WalletBalanceDisplayProps = {
  /** Preformatted dollar label from integer cents, e.g. "$50.00". Null = placeholder. */
  balanceLabel: string | null;
  /** When set, the signed-in chip links here (e.g. /account/wallet). */
  href?: string;
  className?: string;
};

function TicketIcon() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-12 w-12 shrink-0 bg-current sm:h-12 sm:w-12"
      style={{
        maskImage: "url(/wallet-ticket-icon.svg)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: "url(/wallet-ticket-icon.svg)",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        filter:
          "drop-shadow(0 0 1px currentColor) drop-shadow(0 0 1px currentColor) drop-shadow(0 0 1.25px currentColor) drop-shadow(0 0 0.5px currentColor)",
      }}
    />
  );
}

/**
 * Wallet chip: ticket icon + balance (signed-in) or "Wallet · Coming soon"
 * (signed-out). Signed-in chip is a link when `href` is provided.
 */
export function WalletBalanceDisplay({
  balanceLabel,
  href,
  className = "",
}: WalletBalanceDisplayProps) {
  if (balanceLabel == null) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-dashed border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] ${className}`.trim()}
        title="Wallet balances will appear here in a later release"
      >
        Wallet · Coming soon
      </span>
    );
  }

  const chipClassName =
    `inline-flex items-center gap-2.5 text-base text-[var(--foreground)] sm:text-lg ${className}`.trim();

  const content = (
    <>
      <TicketIcon />
      <span className="font-medium tabular-nums tracking-tight">
        {balanceLabel}
      </span>
      <span className="sr-only">Playable wallet balance</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${chipClassName} rounded-md transition-opacity hover:opacity-90`}
        title="View wallet"
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={chipClassName} title="Playable balance">
      {content}
    </span>
  );
}
