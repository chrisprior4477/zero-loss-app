"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseWalletSnapshot } from "@/lib/wallet/snapshot";
import { parseAvailability } from "./availability";

export type DemoPoolResetResult =
  | { status: "succeeded"; message: string }
  | { status: "error"; message: string; recovery?: "check" };

export async function resetDemoPool(slug: string, checkOnly = false): Promise<DemoPoolResetResult> {
  if (!isPreviewDataEnvironment() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { status: "error", message: "This demo pool reset is unavailable here." };
  }
  try {
    const db = await createClient();
    if (checkOnly) {
      const { data, error } = await db.rpc("get_preview_offering_availability");
      const pool = !error && parseAvailability(data)?.[slug];
      if (!pool || pool.slug !== slug) return { status: "error", recovery: "check", message: "The pool count is unavailable. Check again when you’re connected." };
      if (pool.remaining === 0) return { status: "error", message: "The pool is currently full. You can confirm another reset or cancel." };
      return { status: "succeeded", message: `The pool is open with ${pool.remaining === 1 ? "one ticket" : pool.remaining + " tickets"} available.` };
    }
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
      const knownError = error.code === "P0001" && [
        "This demo pool cannot be reset",
        "An entry is being confirmed. Try again after its countdown.",
        "This pool has too many saved demo entries to reset safely.",
      ].includes(error.message);
      return knownError ? { status: "error", message: error.message }
        : { status: "error", recovery: "check", message: "We couldn’t confirm the reset. Check the pool before trying again." };
    }
    if (data?.remaining !== 1 || typeof data?.alreadyOpen !== "boolean") {
      return { status: "error", recovery: "check", message: "We couldn’t verify the new count. Check the pool before trying again." };
    }
    revalidatePath("/", "layout");
    return { status: "succeeded", message: data.alreadyOpen ? "This pool already has one ticket left." : "Demo pool reset. One ticket is available again." };
  } catch {
    return { status: "error", recovery: "check", message: "Connection interrupted. Check the pool when you’re back online." };
  }
}
