import "server-only";
import { cache } from "react";
import { createClient as registeredClient } from "@/lib/supabase/server";
import { deviceFromBrowser, personalShoppingClient } from "./server";

// Only shopping, simulated checkout and activity readers opt into this
// client. Login, profile changes, account recovery and support use the
// registered browser session exclusively.
export const createClient = cache(async () => {
  const normal = await registeredClient();
  if (!process.env.PERSONAL_DEMO_BRIDGE) return normal;
  const device = await deviceFromBrowser();
  if (!device) return normal;
  const result = await normal.auth.getUser();
  if (result.data.user || (result.error && result.error.name !== "AuthSessionMissingError")) return normal;
  return (await personalShoppingClient(device)) ?? normal;
});
