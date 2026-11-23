import { accountSession } from "@/lib/account/session";
import { getNotificationSnapshot } from "@/lib/account/notification-snapshot";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const snapshot = await getNotificationSnapshot();
    if (snapshot) return Response.json(snapshot, { headers });
    if ((await accountSession()).status !== "signed_out") {
      return Response.json({ error: "Notifications are temporarily unavailable" }, { status: 503, headers });
    }
    return Response.json({ error: "Sign in required" }, { status: 401, headers });
  } catch {
    return Response.json({ error: "Notifications are temporarily unavailable" }, { status: 503, headers });
  }
}
