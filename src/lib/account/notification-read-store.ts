import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function storeNotificationReads(ids: unknown) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 1000
    || ids.some(id => typeof id !== "string" || id.length < 1 || id.length > 160)) {
    return { ok: false, message: "Those notifications could not be marked as read.", status: 400 };
  }
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return { ok: false, message: "Sign in again to save your notification status.", status: 401 };
  const { error } = await db.from("customer_notification_reads").upsert(
    [...new Set(ids as string[])].map(notificationId => ({ customer_id: user.id, notification_id: notificationId })),
    { onConflict: "customer_id,notification_id", ignoreDuplicates: true },
  );
  return error ? { ok: false, message: "We couldn’t save your notification status. Please try again.", status: 503 }
    : { ok: true, message: "Notification status saved.", status: 200 };
}
