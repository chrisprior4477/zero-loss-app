import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { renderRewardDeadlineEmail, renderRewardReadyEmail } from "../_shared/reward-email.ts";
import { emailSender } from "../_shared/email-sender.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const projectUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendKey = Deno.env.get("RESEND_OUTCOME_API_KEY");
const workerToken = Deno.env.get("REWARD_EMAIL_WORKER_TOKEN");
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
function rewardUrl(origin: string, payload: Record<string, unknown>): string {
  const url = new URL("/account/wallet", origin);
  url.searchParams.set("reward", String(payload.slug));
  url.searchParams.set("rewardId", String(payload.rewardId));
  return url.toString();
}
async function sendPreview(): Promise<Response> {
  if (Deno.env.get("REWARD_EMAIL_TESTS_ENABLED") !== "true") return respond(503, { error: "Reward preview tests are disabled" });
  const recipient = Deno.env.get("REWARD_EMAIL_TEST_RECIPIENT");
  const batch = Deno.env.get("REWARD_EMAIL_TEST_BATCH");
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !batch || !/^[A-Za-z0-9_-]{8,48}$/.test(batch)) {
    return respond(503, { error: "Reward preview is not configured" });
  }
  const origin = siteOrigin();
  const base = {
    title: "$100 Walmart Gift Card", retailer: "Walmart", giftCardValueCents: 10000,
    rewardHref: `${origin}/account/wallet?view=rewards`, preview: true,
  };
  const cases = [
    { kind: "ready", message: renderRewardReadyEmail(base) },
    { kind: "deadline_7d", message: renderRewardDeadlineEmail({ ...base, deadline: new Date(Date.now() + 7 * 86400000).toISOString(), reminderKey: "7d" }) },
    { kind: "deadline_1d", message: renderRewardDeadlineEmail({ ...base, deadline: new Date(Date.now() + 86400000).toISOString(), reminderKey: "1d" }) },
  ];
  const sent = [];
  for (const test of cases) {
    const providerMessageId = await sendMessage(recipient, `[MVP preview] ${test.message.subject}`, test.message.html, test.message.text,
      `zero-loss-reward-preview-${test.kind}-${batch}`);
    sent.push({ kind: test.kind, providerMessageId });
  }
  return respond(200, { sent });
}

type Database = SupabaseClient<any, "public">;

async function processReady(db: Database, origin: string) {
  const { data: deliveries, error: claimError } = await db.rpc("claim_reward_ready_email_deliveries", { p_limit: 10 });
  if (claimError) throw new Error("Could not claim ready reward emails");
  let sent = 0; let skipped = 0; let failed = 0;
  for (const delivery of deliveries ?? []) {
    try {
      const { data: payload, error: payloadError } = await db.rpc("get_reward_ready_email_payload", { p_id: delivery.id });
      if (payloadError || !payload) throw new Error("Ready reward could not be loaded");
      if (!payload.eligible) {
        const { error } = await db.rpc("finish_reward_ready_email_delivery", { p_id: delivery.id, p_provider_message_id: null, p_error: null, p_cancelled: true });
        if (error) throw error;
        skipped++; continue;
      }
      const { data: account, error: accountError } = await db.auth.admin.getUserById(payload.customerId);
      if (accountError || !account?.user?.email || !account.user.email_confirmed_at) {
        const { error } = await db.rpc("finish_reward_ready_email_delivery", { p_id: delivery.id, p_provider_message_id: null, p_error: null, p_cancelled: true });
        if (error) throw error;
        skipped++; continue;
      }
      const message = renderRewardReadyEmail({
        title: String(payload.title), retailer: String(payload.retailer), giftCardValueCents: Number(payload.valueCents),
        rewardHref: rewardUrl(origin, payload),
      });
      const providerMessageId = await sendMessage(account.user.email, message.subject, message.html, message.text,
        `zero-loss-reward-ready-${delivery.id}`);
      const { error: finishError } = await db.rpc("finish_reward_ready_email_delivery", { p_id: delivery.id, p_provider_message_id: providerMessageId, p_error: null, p_cancelled: false });
      if (finishError) throw new Error("Email accepted, but ready reward state needs operator review");
      sent++;
    } catch (error) {
      await db.rpc("finish_reward_ready_email_delivery", { p_id: delivery.id, p_provider_message_id: null, p_error: safeError(error), p_cancelled: false });
      failed++;
    }
  }
  return { claimed: deliveries?.length ?? 0, sent, skipped, failed };
}

async function processDeadlines(db: Database, origin: string) {
  const { data: reminders, error: claimError } = await db.rpc("claim_reward_deadline_email_reminders", { p_limit: 10 });
  if (claimError) throw new Error("Could not claim reward deadline reminders");
  let sent = 0; let skipped = 0; let failed = 0;
  for (const reminder of reminders ?? []) {
    try {
      const { data: payload, error: payloadError } = await db.rpc("get_reward_deadline_email_payload", { p_id: reminder.id });
      if (payloadError || !payload) throw new Error("Reward deadline could not be loaded");
      if (!payload.eligible) {
        const { error } = await db.rpc("finish_reward_deadline_email_reminder", { p_id: reminder.id, p_provider_message_id: null, p_error: null, p_cancelled: true });
        if (error) throw error;
        skipped++; continue;
      }
      const { data: account, error: accountError } = await db.auth.admin.getUserById(payload.customerId);
      if (accountError || !account?.user?.email || !account.user.email_confirmed_at) {
        const { error } = await db.rpc("finish_reward_deadline_email_reminder", { p_id: reminder.id, p_provider_message_id: null, p_error: null, p_cancelled: true });
        if (error) throw error;
        skipped++; continue;
      }
      const message = renderRewardDeadlineEmail({
        title: String(payload.title), retailer: String(payload.retailer), giftCardValueCents: Number(payload.valueCents),
        deadline: String(payload.deadline), reminderKey: payload.reminderKey,
        rewardHref: rewardUrl(origin, payload),
      });
      const providerMessageId = await sendMessage(account.user.email, message.subject, message.html, message.text,
        `zero-loss-reward-deadline-${reminder.id}`);
      const { error: finishError } = await db.rpc("finish_reward_deadline_email_reminder", { p_id: reminder.id, p_provider_message_id: providerMessageId, p_error: null, p_cancelled: false });
      if (finishError) throw new Error("Email accepted, but reward deadline state needs operator review");
      sent++;
    } catch (error) {
      await db.rpc("finish_reward_deadline_email_reminder", { p_id: reminder.id, p_provider_message_id: null, p_error: safeError(error), p_cancelled: false });
      failed++;
    }
  }
  return { claimed: reminders?.length ?? 0, sent, skipped, failed };
}

Deno.serve(async request => {
  if (request.method !== "POST") return respond(405, { error: "Method not allowed" });
  const operator = authorizedOperator(request.headers.get("Authorization"));
  const scheduled = authorizedWorker(request.headers.get("X-Reward-Email-Worker-Token"));
  if (!serviceKey || (!operator && !scheduled)) return respond(401, { error: "Unauthorized" });
  if (new URL(request.url).searchParams.get("test") === "preview") {
    if (!operator) return respond(403, { error: "Operator-only test" });
    try { return await sendPreview(); }
    catch (error) { return respond(500, { error: safeError(error) }); }
  }
  if (Deno.env.get("REWARD_EMAIL_DELIVERY_ENABLED") !== "true") return respond(503, { error: "Reward delivery is disabled" });
  if (!projectUrl || !resendKey) return respond(503, { error: "Email service is not configured" });
  let origin: string;
  try { origin = siteOrigin(); }
  catch { return respond(503, { error: "Email website is not configured" }); }
  const db = createClient(projectUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    const ready = await processReady(db, origin);
    const deadlines = await processDeadlines(db, origin);
    return respond(200, { ready, deadlines });
  } catch (error) { return respond(500, { error: safeError(error) }); }
});
