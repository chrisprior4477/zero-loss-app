"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ReadResult = { ok: boolean; message: string };

export async function markNotificationsRead(ids: string[]): Promise<ReadResult> {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 1000
    || ids.some((id) => typeof id !== "string" || id.length < 1 || id.length > 160)) {
    return { ok: false, message: "Those notifications could not be marked as read." };
  }
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in again to save your notification status." };

  const uniqueIds = [...new Set(ids)];
  const { error } = await db.from("customer_notification_reads").upsert(
    uniqueIds.map((notificationId) => ({ customer_id: user.id, notification_id: notificationId })),
    { onConflict: "customer_id,notification_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, message: "We couldn’t save your notification status. Please try again." };
  revalidatePath("/account/notifications");
  return { ok: true, message: "Notification status saved." };
}
