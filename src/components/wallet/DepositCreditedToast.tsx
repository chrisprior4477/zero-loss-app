"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatUsdFromCents } from "@/lib/wallet/money";
import styles from "./whole-dollar-toast.module.css";

export function DepositCreditedToast({ amount }: { amount: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return createPortal(<aside className={`${styles.toast} ${styles.credited}`} aria-label="Deposit confirmation">
    <strong>{formatUsdFromCents(amount)} credited to your wallet</strong>
    <button type="button" className={styles.close} onClick={() => setVisible(false)} aria-label="Dismiss deposit confirmation">×</button>
  </aside>, document.body);
}
