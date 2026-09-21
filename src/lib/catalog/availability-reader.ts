import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseAvailability } from "./availability";

// React cache deduplicates within this request, not across purchases/customers.
// createClient reads request cookies and the RPC is an uncached POST.
export const getOfferingAvailability = cache(async () => {
  if (!isPreviewDataEnvironment()) return null;
  try {
    const db = await createClient();
    const { data, error } = await db.rpc("get_preview_offering_availability");
    return error ? null : parseAvailability(data);
  } catch {
    return null;
  }
});
