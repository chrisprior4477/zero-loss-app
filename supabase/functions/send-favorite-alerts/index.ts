// @ts-expect-error Deno Edge resolves npm: specifiers; the Next.js tsconfig does not.
import { createClient } from "npm:@supabase/supabase-js@2";
import { renderFavoriteAlertEmail } from "../_shared/favorite-alert-email.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const projectUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendKey = Deno.env.get("RESEND_OUTCOME_API_KEY");
const workerToken = Deno.env.get("FAVORITE_ALERT_WORKER_TOKEN");
const configuredOrigin = Deno.env.get("OUTCOME_EMAIL_SITE_ORIGIN");
const sender = "Zero Loss Accounts <accounts@getzeroloss.com>";

function respond(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function authorized(token: string | null): boolean {
  if (!token || !workerToken || token.length !== workerToken.length) return false;
  let difference = 0;
  for (let index = 0; index < token.length; index++) difference |= token.charCodeAt(index) ^ workerToken.charCodeAt(index);
  return difference === 0;
}

function siteOrigin(): string {
  if (!configuredOrigin) throw new Error("Email website is not configured");
  const url = new URL(configuredOrigin);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Email website must be an HTTPS origin");
  }
  return url.origin;
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "Unknown delivery error";
}

Deno.serve(async request => {
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });
  // Supabase's JWT gateway remains enabled; this extra token permits only this
  // worker. Neither a customer nor an anonymous JWT alone can send email.
  if (!authorized(request.headers.get("X-Favorite-Alert-Worker-Token"))) return respond(401, { error: "Unauthorized" });
  if (Deno.env.get("FAVORITE_ALERT_DELIVERY_ENABLED") !== "true") return respond(503, { error: "Favorite alert delivery is disabled" });
  if (!projectUrl || !serviceKey || !resendKey) return respond(503, { error: "Email service is not configured" });
  let origin: string;
  try { origin = siteOrigin(); } catch { return respond(503, { error: "Email website is not configured" }); }

  const db = createClient(projectUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: deliveries, error: claimError } = await db.rpc("claim_favorite_capacity_alerts", { p_limit: 10 });
  if (claimError) return respond(500, { error: "Could not claim favorite alerts" });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const delivery of deliveries ?? []) {
    try {
      const { data: payload, error: payloadError } = await db.rpc("get_favorite_capacity_alert_payload", { p_id: delivery.id });
      if (payloadError || !payload) throw new Error("Favorite alert could not be loaded");
      if (!payload.eligible) {
        const { error } = await db.rpc("finish_favorite_capacity_alert", { p_id: delivery.id, p_provider_message_id: null, p_error: null, p_cancelled: true });
        if (error) throw error;
        skipped++;
        continue;
      }

      const { data: account, error: accountError } = await db.auth.admin.getUserById(payload.customerId);
      if (accountError || !account?.user?.email || !account.user.email_confirmed_at) throw new Error("Verified recipient unavailable");
      const offerHref = new URL(`/items/${encodeURIComponent(payload.slug)}`, origin).toString();
      const preferencesHref = new URL("/account/notifications#favorite-alert-preference", origin).toString();
      const email = renderFavoriteAlertEmail({ title: payload.title, sold: payload.sold, capacity: payload.capacity, offerHref, preferencesHref });
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `zero-loss-favorite-alert-${delivery.id}` },
        body: JSON.stringify({ from: sender, to: [account.user.email], subject: email.subject, html: email.html, text: email.text }),
      });
      const message = await result.json();
      if (!result.ok || typeof message?.id !== "string") throw new Error(`Resend rejected email (${result.status})`);
      const { error: finishError } = await db.rpc("finish_favorite_capacity_alert", { p_id: delivery.id, p_provider_message_id: message.id, p_error: null, p_cancelled: false });
      if (finishError) throw new Error("Email accepted, but its delivery record needs operator review");
      sent++;
    } catch (error) {
      // A possible provider acceptance is not retried automatically.
      await db.rpc("finish_favorite_capacity_alert", { p_id: delivery.id, p_provider_message_id: null, p_error: safeError(error), p_cancelled: false });
      failed++;
    }
  }
  return respond(200, { claimed: deliveries?.length ?? 0, sent, skipped, failed });
});
