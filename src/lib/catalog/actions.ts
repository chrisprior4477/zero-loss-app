"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";

export type DemoPoolResetResult =
  | { status: "succeeded"; message: string }
  | { status: "error"; message: string };

export async function resetDemoPool(slug: string): Promise<DemoPoolResetResult> {
  if (!isPreviewDataEnvironment() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { status: "error", message: "This demo pool reset is unavailable here." };
  }
  try {
    const db = await createClient();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user?.email_confirmed_at) {
      return { status: "error", message: "Sign in with a confirmed demo account to reset this pool." };
    }
    const { data: walletData, error: walletError } = await db.rpc("get_wallet_snapshot");
    if (walletError || parseWalletSnapshot(walletData).scope !== "demo") {
      return { status: "error", message: "This reset is available only to demo accounts." };
    }
    const { data, error } = await db.rpc("reset_demo_pool", { p_offering_slug: slug });
    if (error) {
      const safeMessage = error.code === "P0001" && [
        "This demo pool cannot be reset",
        "An entry is being confirmed. Try again after its countdown.",
        "This pool has too many saved demo entries to reset safely.",
      ].includes(error.message) ? error.message : "We could not reset this demo pool. Please try again.";
      return { status: "error", message: safeMessage };
    }
    if (data?.remaining !== 1 || typeof data?.alreadyOpen !== "boolean") {
      return { status: "error", message: "We could not verify the new pool count. Refresh and check it before retrying." };
    }
    revalidatePath("/", "layout");
    return { status: "succeeded", message: data.alreadyOpen ? "This pool already has one ticket left." : "Demo pool reset. One ticket is available again." };
  } catch {
    return { status: "error", message: "Connection interrupted. Refresh and check the pool before retrying." };
  }
}
