"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type WalletBalanceDisplayProps = {
  /** Preformatted dollar label from integer cents, e.g. "$50.00". Null = placeholder. */
  balanceLabel: string | null;
  /** When set, the signed-in chip links here (e.g. /account/wallet). */
  href?: string;
  className?: string;
};

/** Shared small-icon sizing so every header icon stays visually matched. */
const ICON_SIZE_CLASSNAME = "h-6 w-6";

function TicketIcon({
  className = ICON_SIZE_CLASSNAME,
}: {
  /** Override the icon box size. Ticket artwork has more built-in padding
   * than the prize-box artwork, so the signed-out teaser passes a larger
   * box here to make the two icons read as visually equal weight. */
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${className} shrink-0 bg-current`}
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

function PrizeBoxIcon() {
  return (
    <span
      aria-hidden="true"
      className={`inline-block ${ICON_SIZE_CLASSNAME} shrink-0 bg-current`}
      style={{
        maskImage: "url(/prize-box-icon.svg)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: "url(/prize-box-icon.svg)",
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

type IconTeaserProps = {
  icon: ReactNode;
  /** Short label shown as the toast heading and the button's accessible name. */
  label: string;
  /** One or two sentences explaining what this will hold once signed up. */
  description: string;
};

/**
 * Shared signed-out header disclosure: an icon-only trigger that explains,
 * on hover (desktop) or tap (touch / keyboard), what a piece of the wallet
 * UI will hold once the visitor signs up and funds their account.
 *
 * This is a pure marketing/explainer surface — it reads no wallet or ledger
 * data and makes no financial claim, so it carries none of the ledger-read
 * risk the signed-in chip guards against. Both the ticket and prize-box
 * teasers below are thin wrappers around this one implementation so their
 * open/close/outside-click behavior can never drift apart.
 */
function IconTeaser({ icon, label, description }: IconTeaserProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]"
      >
        {icon}
        <span className="sr-only">{label} — learn more</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className="fixed right-3 top-16 z-[110] mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] p-4 text-sm shadow-lg md:absolute md:right-0 md:top-full md:z-50"
        >
          <p className="font-medium text-[var(--foreground)]">{label}</p>
          <p className="mt-1.5 text-[var(--muted)]">{description}</p>
          <Link
            href="/signup"
            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
          >
            Sign up to start
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Signed-out header treatment: two icon teasers side by side — Tickets and
 * Prizes & Credits — so a visitor sees the same two wallet concepts a
 * funded, signed-in customer would, before ever creating an account.
 */
function SignedOutWalletTeasers({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 ${className}`.trim()}>
      <IconTeaser
        icon={<TicketIcon className="h-8 w-8" />}
        label="Tickets"
        description="Once you sign up and fund your account, you'll be able to pick which prizes you want a shot at."
      />
      <IconTeaser
        icon={<PrizeBoxIcon />}
        label="Prizes & Credits"
        description="Once you're signed up, this is where you'll see prizes you've won and any credit you have waiting to be used."
      />
    </div>
  );
}

/**
 * Wallet chip: ticket icon + balance (signed-in) or the two-icon teaser
 * group (signed-out). Signed-in chip is a link when `href` is provided.
 */
export function WalletBalanceDisplay({
  balanceLabel,
  href,
  className = "",
}: WalletBalanceDisplayProps) {
  if (balanceLabel == null) {
    return <SignedOutWalletTeasers className={className} />;
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
