import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountActivity, ActivityItem, ActivityStatus, CompletionOptionStatus, RewardStatus } from "./activity";

const statuses = new Set<ActivityStatus>(["active", "prize", "completion", "completed"]);
const optionStatuses = new Set<CompletionOptionStatus>(["available", "declined", "purchased", "expired", "cancelled"]);
const rewardStatuses = new Set<RewardStatus>(["ready", "redeemed", "expired", "cancelled", "issuance_pending", "issuance_failed"]);

function cents(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("Invalid activity amount");
  return parsed;
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("Invalid activity lifecycle value");
  return value;
}

function parseItem(value: unknown): ActivityItem {
  if (!value || typeof value !== "object") throw new Error("Invalid activity record");
  const row = value as Record<string, unknown>;
  if (typeof row.slug !== "string" || typeof row.title !== "string"
    || typeof row.retailer !== "string" || typeof row.image !== "string"
    || typeof row.status !== "string" || !statuses.has(row.status as ActivityStatus)
    || row.reward_kind !== "digital" || typeof row.availability !== "string"
    || (row.completion_option_status != null && (typeof row.completion_option_status !== "string" || !optionStatuses.has(row.completion_option_status as CompletionOptionStatus)))
    || (row.reward_status != null && (typeof row.reward_status !== "string" || !rewardStatuses.has(row.reward_status as RewardStatus)))) {
    throw new Error("Invalid activity record");
  }
  return {
    entryId: optionalString(row.entry_id),
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
    completionOptionId: optionalString(row.completion_option_id),
    completionOptionStatus: row.completion_option_status as CompletionOptionStatus | null | undefined,
    completionExpiresAt: optionalString(row.completion_expires_at),
    rewardStatus: row.reward_status as RewardStatus | null | undefined,
    rewardId: optionalString(row.reward_id),
    rewardClaimExpiresAt: optionalString(row.reward_claim_expires_at),
    rewardClaimedAt: optionalString(row.reward_claimed_at),
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
