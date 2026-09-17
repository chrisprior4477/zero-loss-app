import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getWalletSnapshot } from "@/lib/wallet/balance";
import { formatUsdFromCents } from "@/lib/wallet/money";
import { customerDisplayName, customerInitials } from "./profile-name";
import { drawerState } from "./drawer-state";
import { demoFundingAllowed } from "@/lib/payments/demo-access";
import { ensurePreviewCustomer } from "@/lib/preview/provisioning";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";

/** Request-scoped reader shared by pages, header and drawer. No writes. */
export const getAccountContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  let provisioningAvailable = true;
  if (isPreviewDataEnvironment()) {
    try {
      await ensurePreviewCustomer(supabase, user);
    } catch {
      provisioningAvailable = false;
    }
  }
  const [profileResult, wallet] = await Promise.all([
    supabase.from("customer_profiles").select("display_name, legal_first_name, legal_last_name, avatar_reference").eq("customer_id", user.id).maybeSingle(),
    provisioningAvailable ? getWalletSnapshot(user.id).catch(() => null) : Promise.resolve(null),
  ]);
  const profile = profileResult.error ? null : profileResult.data;
  const displayName = customerDisplayName(profile);
  return {
    userId: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    displayName,
    initials: customerInitials(displayName),
    avatarUrl: profile?.avatar_reference ? supabase.storage.from("profile-photos").getPublicUrl(profile.avatar_reference).data.publicUrl : null,
    wallet,
    balanceLabel: wallet ? (wallet.balanceCents === 0 ? "$0.00" : formatUsdFromCents(wallet.balanceCents)) : "Unavailable",
    fundingEnabled: demoFundingAllowed(wallet, Boolean(user.email_confirmed_at)),
    // No entry lifecycle table/writer exists yet. Until checkpoint three, only
    // the confirmed empty checkpoint state is supported for ordinary customers.
    // Existing/failed financial activity must not be invented as entry records.
    activity: drawerState(wallet !== null),
  };
});
