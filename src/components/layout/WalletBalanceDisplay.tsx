import Link from "next/link";
import { formatUsdCents } from "@/lib/wallet/money";

type WalletBalanceDisplayProps = {
  playableBalanceCents: number;
  rebateBalanceCents: number;
  className?: string;
  onNavigate?: () => void;
};

/**
 * Compact header/mobile wallet visibility: Playable Balance and Rebate Credits.
 * Values must be server-derived Ledger projections — never client-authored.
 */
export function WalletBalanceDisplay({
  playableBalanceCents,
  rebateBalanceCents,
  className = "",
  onNavigate,
}: WalletBalanceDisplayProps) {
  const playable = formatUsdCents(playableBalanceCents);
  const rebate = formatUsdCents(rebateBalanceCents);

  return (
    <Link
      href="/account"
      onClick={onNavigate}
      className={`inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs transition-colors hover:bg-[var(--surface-elevated)] ${className}`}
      aria-label={`Wallet: Playable balance ${playable}, Rebate credits ${rebate}. Open account.`}
      title="View account and wallet"
    >
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-[var(--muted)]">Playable</span>
        <span className="font-medium tabular-nums text-[var(--foreground)]">
          {playable}
        </span>
      </span>
      <span className="text-[var(--border)]" aria-hidden="true">
        ·
      </span>
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-[var(--muted)]">Rebate</span>
        <span className="font-medium tabular-nums text-[var(--foreground)]">
          {rebate}
        </span>
      </span>
    </Link>
  );
}
