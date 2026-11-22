import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getNotificationSnapshot } from "@/lib/account/notification-snapshot";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const snapshot = await getNotificationSnapshot();
    if (snapshot) return Response.json(snapshot, { headers });
    const db = await createClient();
    const { error } = await db.auth.getUser();
    if (isAuthRetryableFetchError(error) || (error?.status ?? 0) >= 500) {
      return Response.json({ error: "Notifications are temporarily unavailable" }, { status: 503, headers });
    }
    return Response.json({ error: "Sign in required" }, { status: 401, headers });
  } catch {
    return Response.json({ error: "Notifications are temporarily unavailable" }, { status: 503, headers });
  }
}
