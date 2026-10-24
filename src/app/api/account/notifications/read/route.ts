import { storeNotificationReads } from "@/lib/account/notification-read-store";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ ok: false, message: "Please use notifications on this site." }, { status: 403, headers });
  }
  try {
    const body = await request.text();
    if (body.length > 64000) return Response.json({ ok: false, message: "Too many notifications in one request." }, { status: 413, headers });
    const result = await storeNotificationReads(JSON.parse(body)?.ids);
    return Response.json({ ok: result.ok, message: result.message }, { status: result.status, headers });
  } catch {
    return Response.json({ ok: false, message: "Notification status could not be saved. Please try again." }, { status: 400, headers });
  }
}
