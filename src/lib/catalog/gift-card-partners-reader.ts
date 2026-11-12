import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { giftCardPartnerGroups, type GiftCardPartnerGroup } from "./gift-card-partners";
import { partnerDisplayName } from "./partner-display-name";

/** Reads the durable partner directory when installed; local demos use the same supplied seed. */
export const getGiftCardPartnerGroups = cache(async (): Promise<readonly GiftCardPartnerGroup[]> => {
  try {
    const db = await createClient();
    const { data, error } = await db.from("gift_card_partner_brands")
      .select("provider_category, brand_name").limit(1000);
    if (error || !data?.length) return giftCardPartnerGroups;
    const rows = new Map<string, string[]>();
    for (const row of data) {
      const brands = rows.get(row.provider_category) ?? [];
      const brand = partnerDisplayName(row.brand_name);
      if (!brands.includes(brand)) brands.push(brand);
      rows.set(row.provider_category, brands);
    }
    const order = giftCardPartnerGroups.map(group => group.category);
    return [...rows].sort(([left], [right]) => order.indexOf(left) - order.indexOf(right))
      .map(([category, brands]) => ({ category, brands: brands.sort((left, right) => left.localeCompare(right)) }));
  } catch {
    return giftCardPartnerGroups;
  }
});
