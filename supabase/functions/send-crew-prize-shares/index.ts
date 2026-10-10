import { createClient } from "@supabase/supabase-js";
import { renderCrewPrizeShareEmail } from "../_shared/crew-prize-share-email.ts";
import { emailSender } from "../_shared/email-sender.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const projectUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendKey = Deno.env.get("RESEND_OUTCOME_API_KEY");
const workerToken = Deno.env.get("CREW_PRIZE_SHARE_WORKER_TOKEN");
const configuredOrigin = Deno.env.get("OUTCOME_EMAIL_SITE_ORIGIN");

function respond(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "Unknown delivery error";
}
function siteOrigin(): string {
  if (!configuredOrigin) throw new Error("Email website is not configured");
  const url = new URL(configuredOrigin);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Email website must be an HTTPS origin");
  }
  return url.origin;
}
function authorizedWorker(token: string | null): boolean {
  if (!token || !workerToken || token.length !== workerToken.length) return false;
  let difference = 0;
  for (let index = 0; index < token.length; index++) difference |= token.charCodeAt(index) ^ workerToken.charCodeAt(index);
  return difference === 0;
}
function authorizedOperator(authorization: string | null): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  if (serviceKey && authorization === `Bearer ${serviceKey}`) return true;
  // The Supabase gateway verifies this JWT before this handler runs.
  try {
    const encoded = authorization.slice(7).split(".")[1];
    if (!encoded) return false;
    const claims = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    return claims.role === "service_role" && claims.iss === "supabase" && typeof claims.exp === "number" && claims.exp > Date.now() / 1000;
  } catch { return false; }
}
async function sendMessage(to: string, subject: string, html: string, text: string, idempotencyKey: string): Promise<string> {
  if (!resendKey) throw new Error("Email service is not configured");
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from: emailSender, to: [to], subject, html, text }),
  });
  const body = await result.json();
  if (!result.ok || typeof body?.id !== "string") throw new Error(`Resend rejected email (${result.status})`);
  return body.id;
}
async function sendPreview(): Promise<Response> {
  if (Deno.env.get("CREW_PRIZE_SHARE_TESTS_ENABLED") !== "true") return respond(503, { error: "Crew share preview tests are disabled" });
  const recipient = Deno.env.get("CREW_PRIZE_SHARE_TEST_RECIPIENT");
  const batch = Deno.env.get("CREW_PRIZE_SHARE_TEST_BATCH");
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !batch || !/^[A-Za-z0-9_-]{8,48}$/.test(batch)) {
    return respond(503, { error: "Crew share preview is not configured" });
  }
  const message = renderCrewPrizeShareEmail({
    senderName: "Alex (sample)", title: "$100 Walmart Gift Card",
    offerHref: `${siteOrigin()}/items/walmart-100-gift-card`, preview: true,
  });
  const providerMessageId = await sendMessage(recipient, `[MVP preview] ${message.subject}`, message.html, message.text,
    `zero-loss-crew-prize-share-preview-${batch}`);
  return respond(200, { sent: [{ kind: "crew_prize_share", providerMessageId }] });
}

Deno.serve(async request => {
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });
  const operator = authorizedOperator(request.headers.get("Authorization"));
  const scheduled = authorizedWorker(request.headers.get("X-Crew-Prize-Share-Worker-Token"));
  if (!serviceKey || (!operator && !scheduled)) return respond(401, { error: "Unauthorized" });
  if (new URL(request.url).searchParams.get("test") === "preview") {
    if (!operator) return respond(403, { error: "Operator-only test" });
    try { return await sendPreview(); }
    catch (error) { return respond(500, { error: safeError(error) }); }
  }
  if (Deno.env.get("CREW_PRIZE_SHARE_DELIVERY_ENABLED") !== "true") return respond(503, { error: "Crew share delivery is disabled" });
  if (!projectUrl || !resendKey) return respond(503, { error: "Email service is not configured" });
  let origin: string;
  try { origin = siteOrigin(); }
  catch { return respond(503, { error: "Email website is not configured" }); }
  const db = createClient(projectUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: shares, error: claimError } = await db.rpc("claim_crew_prize_share_emails", { p_limit: 10 });
  if (claimError) return respond(500, { error: "Could not claim Crew share emails" });
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const share of shares ?? []) {
    try {
      const { data: payload, error: payloadError } = await db.rpc("get_crew_prize_share_email_payload", { p_id: share.id });
      if (payloadError || !payload) throw new Error("Crew share could not be loaded");
      if (!payload.eligible) {
        const { error } = await db.rpc("finish_crew_prize_share_email", {
          p_id: share.id, p_provider_message_id: null, p_error: null, p_cancelled: true,
        });
        if (error) throw error;
        skipped++;
        continue;
      }
      const { data: account, error: accountError } = await db.auth.admin.getUserById(payload.recipientId);
      if (accountError || !account?.user?.email || !account.user.email_confirmed_at) {
        const { error } = await db.rpc("finish_crew_prize_share_email", {
          p_id: share.id, p_provider_message_id: null, p_error: null, p_cancelled: true,
        });
        if (error) throw error;
        skipped++;
        continue;
      }
      const offerUrl = new URL(`/items/${encodeURIComponent(String(payload.slug))}`, origin);
      const message = renderCrewPrizeShareEmail({
        senderName: String(payload.senderName), title: String(payload.title), offerHref: offerUrl.toString(),
      });
      const providerMessageId = await sendMessage(account.user.email, message.subject, message.html, message.text,
        `zero-loss-crew-prize-share-${share.id}`);
      const { error: finishError } = await db.rpc("finish_crew_prize_share_email", {
        p_id: share.id, p_provider_message_id: providerMessageId, p_error: null, p_cancelled: false,
      });
      if (finishError) throw new Error("Email accepted, but Crew share state needs operator review");
      sent++;
    } catch (error) {
      await db.rpc("finish_crew_prize_share_email", {
        p_id: share.id, p_provider_message_id: null, p_error: safeError(error), p_cancelled: false,
      });
      failed++;
    }
  }
  return respond(200, { claimed: shares?.length ?? 0, sent, skipped, failed });
});
