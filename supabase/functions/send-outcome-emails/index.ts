import { createClient } from "@supabase/supabase-js";
import { renderOutcomeEmail } from "../_shared/outcome-email.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const projectUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const resendKey = Deno.env.get("RESEND_OUTCOME_API_KEY");
const scheduledWorkerToken = Deno.env.get("OUTCOME_EMAIL_WORKER_TOKEN");
const previewOrigin = "https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app";
const sender = "Zero Loss Accounts <accounts@getzeroloss.com>";

function response(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : "Unknown delivery error";
}

function isVerifiedServiceRoleBearer(authorization: string | null): boolean {
  if (!authorization?.startsWith("Bearer ")) return false;
  if (serviceKey && authorization === `Bearer ${serviceKey}`) return true;
  // Supabase's gateway verifies the legacy JWT before this handler runs.
  // config.toml pins verify_jwt=true. This supports key rotation when the
  // dashboard's current signed service-role JWT differs from the env default.
  try {
    const encoded = authorization.slice(7).split(".")[1];
    if (!encoded) return false;
    const claims = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    return claims.role === "service_role" && claims.iss === "supabase" && typeof claims.exp === "number" && claims.exp > Date.now() / 1000;
  } catch { return false; }
}

function isScheduledWorker(token: string | null): boolean {
  if (!token || !scheduledWorkerToken || token.length !== scheduledWorkerToken.length) return false;
  let difference = 0;
  for (let index = 0; index < token.length; index++) difference |= token.charCodeAt(index) ^ scheduledWorkerToken.charCodeAt(index);
  return difference === 0;
}

async function sendMessage(to: string, subject: string, html: string, text: string, idempotencyKey: string): Promise<string> {
  if (!resendKey) throw new Error("Email service is not configured");
  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from: sender, to: [to], subject, html, text }),
  });
  const result = await sent.json();
  if (!sent.ok || typeof result?.id !== "string") throw new Error(`Resend rejected email (${sent.status})`);
  return result.id;
}

async function sendPreviewTests(): Promise<Response> {
  // This temporary operator-only path is inert until an explicit Supabase
  // secret enables it. It never accepts a recipient or message from callers.
  if (Deno.env.get("OUTCOME_EMAIL_TESTS_ENABLED") !== "true") return response(503, { error: "Preview email tests are disabled" });
  const recipient = Deno.env.get("OUTCOME_EMAIL_TEST_RECIPIENT");
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return response(503, { error: "Preview recipient is not configured" });
  const entryHref = `${previewOrigin}/account/entries`;
  const rewardHref = `${previewOrigin}/account/wallet?view=rewards`;
  const completionDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sample = { title: "$50 Best Buy Gift Card — EMAIL TEST", retailer: "Best Buy", giftCardValueCents: 5000, entryHref, rewardHref, preview: true };
  const cases = [
    { kind: "winner" as const, paidCents: 100, completionCents: null, completionDeadline: null },
    { kind: "paid_not_selected" as const, paidCents: 100, completionCents: 4900, completionDeadline },
    { kind: "amoe_not_selected" as const, paidCents: 0, completionCents: 5000, completionDeadline },
  ];
  const sent: string[] = [];
  for (const test of cases) {
    const message = renderOutcomeEmail({ ...sample, ...test });
    await sendMessage(recipient, `[TEST] ${message.subject}`, message.html, message.text,
      `zero-loss-outcome-preview-${test.kind}-20261002`);
    sent.push(test.kind);
  }
  return response(200, { sent });
}

Deno.serve(async request => {
  if (request.method !== "POST") return response(405, { error: "Method not allowed" });
  // The JWT gateway stays enabled. A verified service-role JWT is for manual
  // operator diagnostics; the cron caller uses a separate, single-purpose
  // token from Vault. Neither a customer nor an anon JWT alone is sufficient.
  const authorization = request.headers.get("Authorization");
  const operator = isVerifiedServiceRoleBearer(authorization);
  const scheduled = isScheduledWorker(request.headers.get("X-Outcome-Worker-Token"));
  if (!serviceKey || (!operator && !scheduled)) return response(401, { error: "Unauthorized" });
  const search = new URL(request.url).searchParams;
  if (search.get("probe") === "db") {
    if (!operator) return response(403, { error: "Operator-only check" });
    if (!projectUrl) return response(503, { databaseAccessible: false });
    const db = createClient(projectUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await db.from("entry_outcome_email_deliveries").select("id", { head: true, count: "exact" });
    return response(error ? 503 : 200, { databaseAccessible: !error });
  }
  if (search.get("test") === "three") {
    if (!operator) return response(403, { error: "Operator-only test" });
    try { return await sendPreviewTests(); }
    catch (error) { return response(500, { error: safeError(error) }); }
  }
  if (Deno.env.get("OUTCOME_EMAIL_DELIVERY_ENABLED") !== "true") return response(503, { error: "Outcome email delivery is disabled" });
  if (!projectUrl || !resendKey) return response(503, { error: "Email service is not configured" });

  const db = createClient(projectUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: deliveries, error: claimError } = await db.rpc("claim_outcome_email_deliveries", { p_limit: 10 });
  if (claimError) return response(500, { error: "Could not claim due emails" });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const delivery of deliveries ?? []) {
    try {
      const { data: payload, error: payloadError } = await db.rpc("get_outcome_email_payload", { p_id: delivery.id });
      if (payloadError || !payload) throw new Error("Outcome record could not be loaded");
      if (!payload.eligible) {
        const { error } = await db.from("entry_outcome_email_deliveries")
          .update({ status: "cancelled", updated_at: new Date().toISOString(), last_error: "Preference off or option no longer available" })
          .eq("id", delivery.id).eq("status", "processing");
        if (error) throw error;
        skipped++;
        continue;
      }

      const { data: account, error: accountError } = await db.auth.admin.getUserById(payload.customerId);
      if (accountError || !account?.user?.email || !account.user.email_confirmed_at) throw new Error("Verified recipient unavailable");
      const entryUrl = new URL("/account/entries", previewOrigin);
      entryUrl.searchParams.set("entry", payload.entryId);
      entryUrl.searchParams.set("item", payload.slug);
      const rewardUrl = new URL("/account/wallet", previewOrigin);
      rewardUrl.searchParams.set("reward", payload.slug);
      if (payload.rewardId) rewardUrl.searchParams.set("rewardId", payload.rewardId);
      const message = renderOutcomeEmail({
        kind: payload.kind,
        title: payload.title,
        retailer: payload.retailer,
        giftCardValueCents: payload.valueCents,
        paidCents: payload.paidCents,
        completionCents: payload.completionCents,
        completionDeadline: payload.completionDeadline,
        entryHref: entryUrl.toString(),
        rewardHref: payload.rewardId ? rewardUrl.toString() : null,
        preview: true,
      });
      const providerMessageId = await sendMessage(account.user.email, message.subject, message.html, message.text,
        `zero-loss-outcome-${delivery.id}`);
      const { error: finishError } = await db.rpc("finish_outcome_email_delivery", { p_id: delivery.id, p_provider_message_id: providerMessageId, p_error: null });
      if (finishError) throw new Error("Provider accepted email, but delivery state needs operator review");
      sent++;
    } catch (error) {
      // Do not automatically retry uncertain sends. The provider may have
      // accepted an email even if its response or DB acknowledgement failed.
      await db.rpc("finish_outcome_email_delivery", { p_id: delivery.id, p_provider_message_id: null, p_error: safeError(error) });
      failed++;
    }
  }
  return response(200, { claimed: deliveries?.length ?? 0, sent, skipped, failed });
});
