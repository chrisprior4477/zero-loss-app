import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readViewMessage } from "@/lib/personal-demo/shared-view";
import {
  demoCommand,
  demoEnabled,
  DemoFailure,
  deviceCookie,
  linkGeneration,
  newSecret,
  sign,
} from "@/lib/personal-demo/server";

const actions = new Set([
  "start",
  "state",
  "share",
  "inspect",
  "join",
  "leave",
  "revoke",
  "request",
  "cancel",
  "allow",
  "deny",
  "ack",
  "present",
]);
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
export async function POST(request: NextRequest) {
  if (!demoEnabled()) return json({}, 404);
  const origin = request.headers.get("origin");
  if (
    origin !== request.nextUrl.origin ||
    !request.headers.get("content-type")?.startsWith("application/json")
  )
    return json({}, 403);
  try {
    const { action, value = "" } = await request.json();
    if (
      !actions.has(action) ||
      typeof value !== "string" ||
      value.length > (action === "present" ? 1000 : 160)
    )
      return json({}, 400);
    const normal = await createClient();
    const {
      data: { user },
      error,
    } = await normal.auth.getUser();
    if (user) return json({ registered: true });
    if (error && error.name !== "AuthSessionMissingError")
      return json({ message: "Couldn’t verify your session." }, 503);
    const device = request.cookies.get(deviceCookie)?.value;
    if (!device || !/^[a-f0-9]{64}$/.test(device)) {
      if (action !== "start") return json({ missing: true });
      // Establish the browser cookie before allocating a durable demo.
      const response = json({ missing: true });
      response.cookies.set(deviceCookie, newSecret(), {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 31536000,
      });
      return response;
    }
    let input = value;
    if (action === "present") {
      const view = readViewMessage(value);
      if (!view) return json({}, 400);
      input = JSON.stringify(view);
    }
    if (action === "share") input = newSecret();
    if (action === "inspect" || action === "join") {
      const verified = linkGeneration(value);
      if (!verified) return json({ message: "This sharing link is no longer available." }, 409);
      input = verified;
    }
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const data = await demoCommand(device, action, input, action === "start" ? sign("new-browser", ip) : "");
    if (data.missing) return json({ missing: true });
    // Deliberately whitelist all public fields; the server-to-server session
    // action and the synthetic account identity can never be requested here.
    return json({
      code: data.code,
      guest: data.guest,
      guests: data.guests,
      sharing: data.sharing,
      paired: data.paired,
      pending: data.pending,
      waiting: data.waiting,
      sharedCode: data.sharedCode,
      notice: data.notice,
      balance: data.balance,
      revision: data.revision,
      activityRevision: data.activityRevision,
      view: data.view,
      token: action === "share" ? data.generation + "." + sign("share", data.generation) : undefined,
    });
  } catch (error) {
    return json(
      {
        message:
          error instanceof DemoFailure ? error.message : "Your demo is temporarily unavailable. Try again.",
      },
      error instanceof DemoFailure ? error.status : 503,
    );
  }
}
