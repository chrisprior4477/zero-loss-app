import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/personal-demo/shopper";
import { isPreviewDataEnvironment } from "@/lib/preview/environment";
import { parseAvailabilityReport } from "./availability";

// React cache deduplicates within this request, not across purchases/customers.
// createClient reads request cookies and the RPC is an uncached POST.
export const getOfferingAvailabilityReport = cache(async () => {
  if (!isPreviewDataEnvironment()) return parseAvailabilityReport(null);
  try {
    const db = await createClient();
    const { data, error } = await db.rpc("get_preview_offering_availability");
    return parseAvailabilityReport(error ? null : data);
  } catch {
    return parseAvailabilityReport(null);
  }
});

export const getOfferingAvailability = cache(async () => (await getOfferingAvailabilityReport()).snapshot);
