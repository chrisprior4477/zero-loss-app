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
import { getStoredAccountActivity } from "./activity-reader";

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
    supabase.from("customer_profiles").select("display_name, legal_first_name, legal_last_name, date_of_birth, preferred_locale, timezone, avatar_reference, phone_number, address_line_1, address_line_2, city, region, postal_code, country").eq("customer_id", user.id).maybeSingle(),
    provisioningAvailable ? getWalletSnapshot(user.id).catch(() => null) : Promise.resolve(null),
  ]);
  const activity = wallet
    ? await getStoredAccountActivity(supabase).catch(() => drawerState(false))
    : drawerState(false);
  const profile = profileResult.error ? null : profileResult.data;
  const displayName = customerDisplayName(profile);
  return {
    userId: user.id,
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    memberSince: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    legalFirstName: profile?.legal_first_name ?? null,
    legalLastName: profile?.legal_last_name ?? null,
    dateOfBirth: profile?.date_of_birth ?? null,
    preferredLocale: profile?.preferred_locale ?? null,
    timezone: profile?.timezone ?? null,
    phone: profile?.phone_number ?? user.phone ?? null,
    addressLine1: profile?.address_line_1 ?? null,
    addressLine2: profile?.address_line_2 ?? null,
    city: profile?.city ?? null,
    region: profile?.region ?? null,
    postalCode: profile?.postal_code ?? null,
    country: profile?.country ?? null,
    displayName,
    initials: customerInitials(displayName),
    avatarUrl: profile?.avatar_reference ? supabase.storage.from("profile-photos").getPublicUrl(profile.avatar_reference).data.publicUrl : null,
    wallet,
    balanceLabel: wallet ? (wallet.balanceCents === 0 ? "$0.00" : formatUsdFromCents(wallet.balanceCents)) : "Unavailable",
    fundingEnabled: demoFundingAllowed(wallet, Boolean(user.email_confirmed_at)),
    activity,
  };
});
