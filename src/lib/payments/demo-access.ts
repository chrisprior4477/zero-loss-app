import "server-only";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";

/** Local/preview guard in addition to the separate operator-owned DB permission. */
export function demoFundingAllowed(wallet: WalletSnapshot | null, emailConfirmed: boolean): boolean {
  return process.env.APP_DATA_ENVIRONMENT === "development-test"
    && process.env.NEXT_PUBLIC_SUPABASE_URL === "https://ocgdfnvvjvutevgqzzgj.supabase.co"
    && process.env.VERCEL_ENV !== "production"
    && emailConfirmed && wallet?.scope === "demo" && wallet.fundingAvailable === true;
}
