import "server-only";
import type { WalletSnapshot } from "@/lib/wallet/snapshot";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";

/** Deployment boundary plus the authenticated customer's database capability. */
export function demoFundingAllowed(wallet: WalletSnapshot | null, emailConfirmed: boolean): boolean {
  return isPreviewDataEnvironment()
    && emailConfirmed && wallet?.scope === "demo" && wallet.fundingAvailable === true;
}
