"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { InsufficientFundsNotice } from "@/components/wallet/InsufficientFundsNotice";
import styles from "./insufficient-balance-toast.module.css";

type Props = {
  quantity: number;
  totalCents: number;
  balanceCents: number | null;
  fundingHref: string;
  onAddFunds?: () => void;
  onClose: () => void;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function InsufficientBalanceToast({ quantity, totalCents, balanceCents, fundingHref, onAddFunds, onClose }: Props) {
  const fundingLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    fundingLink.current?.focus({ preventScroll: true });
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [onClose]);

  return createPortal(
    <div className={styles.overlay}>
      <section aria-label="Insufficient playable balance" className={styles.ticket}>
        <button type="button" onClick={onClose} aria-label="Dismiss balance notice" className={styles.close}>×</button>
        <InsufficientFundsNotice href={fundingHref} onAddFunds={onAddFunds} linkRef={fundingLink} onTicket>
          <p>
            {balanceCents !== null
              ? <>Your {quantity === 1 ? "entry costs" : `${quantity} entries cost`} <strong>{money(totalCents)}</strong>. You have <strong>{money(balanceCents)}</strong>—add <strong>{money(Math.max(0, totalCents - balanceCents))}</strong> more to continue.</>
              : <>Your balance no longer covers {quantity === 1 ? "this entry" : "these entries"}. Open Add funds to see your latest balance and top up.</>}
          </p>
          <p>No entries were placed. You’ll return to this prize to confirm.</p>
        </InsufficientFundsNotice>
        <button type="button" onClick={onClose} className={styles.keepBrowsing}>Keep browsing</button>
      </section>
    </div>,
    document.body,
  );
}
