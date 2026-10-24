import { getNotificationSnapshot } from "@/lib/account/notification-snapshot";
export async function GET() {
  const snapshot = await getNotificationSnapshot();
  return Response.json(snapshot ?? { error: "Sign in required" }, { status: snapshot ? 200 : 401, headers: { "Cache-Control": "private, no-store" } });
}
