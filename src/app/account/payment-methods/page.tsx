import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountSettingsFrame } from "@/components/account/AccountSettingsFrame";
import { DemoCardManager } from "@/components/wallet/DemoCardManager";
import { getAccountContext } from "@/lib/account/context";
import { authNavigationHref } from "@/lib/auth/entry-return";
import { DemoPaymentProvider } from "@/lib/payments/demo-provider";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payment Methods" };

export default async function PaymentMethodsPage() {
  const account = await getAccountContext();
  if (!account) redirect(authNavigationHref("/login", "/account/payment-methods"));
  const provider = account.wallet?.scope === "demo" ? new DemoPaymentProvider(await createClient()) : null;
  const savedCard = provider && account.fundingEnabled ? await provider.getPaymentMethod().catch(() => undefined) : null;
  return <AccountSettingsFrame active="payment" overview={{ balanceLabel: account.balanceLabel, fundingEnabled: account.fundingEnabled, activity: account.activity }}>
    <DemoCardManager embedded displayName={account.displayName} savedCard={savedCard ?? null} cardUnavailable={savedCard === undefined} enabled={Boolean(provider && account.fundingEnabled)} />
  </AccountSettingsFrame>;
}
