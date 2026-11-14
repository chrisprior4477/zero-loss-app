"use client";

import { useEffect, useId, useState } from "react";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { FundingNoticeDialog } from "./FundingNoticeDialog";

export function DepositCreditedToast({ amount }: { amount: number }) {
  const [visible, setVisible] = useState(true);
  const description = useId();
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 7000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <FundingNoticeDialog label="Deposit confirmation" description={description}
    closeLabel="Dismiss deposit confirmation" onClose={() => setVisible(false)} tone="credited">
    <strong id={description}>{formatUsdFromCents(amount)} credited to your wallet</strong>
  </FundingNoticeDialog>;
}
