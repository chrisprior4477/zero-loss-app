"use client";

import { demoCardFixture, type DemoCardToken } from "@/lib/payments/demo-card";
import { WalletRollerPicker } from "./WalletRollerPicker";

export function FundingCardPicker({ tokens, value, disabled, onChange }: {
  tokens: DemoCardToken[]; value: DemoCardToken | null; disabled: boolean; onChange: (token: DemoCardToken) => void;
}) {
  return <WalletRollerPicker label="Current card in use" placeholder="Choose a card"
    value={value ?? ""} disabled={disabled} onChange={token => onChange(token as DemoCardToken)}
    options={tokens.map(token => {
      const card = demoCardFixture(token)!;
      return { value: token, label: card.issuer, detail: `Sample card •••• ${card.lastFour}` };
    })} />;
}
