import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountActivity, ActivityItem, ActivityStatus } from "./activity";

const statuses = new Set<ActivityStatus>(["active", "prize", "completion", "completed"]);

function cents(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("Invalid activity amount");
  return parsed;
}

function parseItem(value: unknown): ActivityItem {
  if (!value || typeof value !== "object") throw new Error("Invalid activity record");
  const row = value as Record<string, unknown>;
  if (typeof row.slug !== "string" || typeof row.title !== "string"
    || typeof row.retailer !== "string" || typeof row.image !== "string"
    || typeof row.status !== "string" || !statuses.has(row.status as ActivityStatus)
    || row.reward_kind !== "digital" || typeof row.availability !== "string") {
    throw new Error("Invalid activity record");
  }
  return {
    slug: row.slug,
    title: row.title,
    retailer: row.retailer,
    image: row.image,
    status: row.status as ActivityStatus,
    rewardKind: "digital",
    priceCents: cents(row.price_cents),
    paidCents: cents(row.paid_cents),
    remainingCents: cents(row.remaining_cents),
    availability: row.availability,
  };
}

export async function getStoredAccountActivity(db: SupabaseClient): Promise<AccountActivity> {
  const { data, error } = await db.rpc("get_account_activity");
  if (error || !Array.isArray(data)) throw new Error("Account activity unavailable");
  const activity = data.map(parseItem);
  return {
    isPreview: true,
    activity,
    activeCount: activity.filter((item) => item.status === "active").length,
    source: activity.length ? "stored" : "customer-empty",
  };
}
