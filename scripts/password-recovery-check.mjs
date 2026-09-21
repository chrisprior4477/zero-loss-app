// Opt-in live regression check. Creates its own clearly labeled QA account;
// never sends email, places entries, or changes an existing user's password.
// The account is disabled afterward because preview wallets are append-only.
// Usage: RECOVERY_CHECK_URL=<preview origin> PLAYWRIGHT_MODULE_PATH=<module> node scripts/password-recovery-check.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const origin = new URL(process.env.RECOVERY_CHECK_URL ?? "http://localhost:3110").origin;
assert([
  "http://localhost:3110",
  "http://127.0.0.1:3110",
  "https://zero-loss-app-git-openai-homepage-experiment-zero-loss.vercel.app",
  "https://zero-loss-gb6yh2ka7-zero-loss.vercel.app",
].includes(origin), "Use the verified preview or local test origin.");
const baseline = process.env.RECOVERY_CHECK_EXPECT_BUG === "1";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH ?? "playwright");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
assert.equal(projectRef, "ocgdfnvvjvutevgqzzgj", "Unexpected Auth project; stopping.");

async function management(path, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert(response.ok, `Management check failed (${response.status}); response omitted.`);
  return response.json();
}

assert.equal((await management("")).name, "zero-loss-app");
const keys = await management("/api-keys");
const serviceKey = keys.find((key) => key.name === "service_role")?.api_key;
assert(serviceKey, "An admin key is needed to create only this isolated QA account.");
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(supabaseUrl, serviceKey, options);
const publicAuth = () => createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, options);
const runId = randomUUID();
const email = `password-recovery-qa-${runId}@example.com`;
const originalPassword = `Qa!${randomUUID()}Aa9`;
const newPassword = `Qa!${randomUUID()}Bb8`;
const accountPassword = `Qa!${randomUUID()}Cc7`;
let userId;
let browser;
const checks = [];
const passed = (message) => { checks.push(message); console.log(`PASS: ${message}`); };

try {
  // Launch before creating the account, so a missing local browser has no
  // effect on the remote project. Use installed Chrome, not a new download.
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const created = await admin.auth.admin.createUser({
    email, password: originalPassword, email_confirm: true,
    app_metadata: { password_recovery_qa_run: runId },
    user_metadata: {
      legal_first_name: "Recovery QA", legal_last_name: "Temporary test",
      date_of_birth: "1990-01-01", terms_accepted_at: new Date().toISOString(),
    },
  });
  assert(!created.error && created.data.user, "QA account could not be created; details omitted.");
  userId = created.data.user.id;
  const link = await admin.auth.admin.generateLink({ type: "recovery", email });
  assert(!link.error && link.data.properties?.hashed_token, "QA recovery link could not be generated.");
  const recoveryUrl = new URL("/auth/confirm", origin);
  recoveryUrl.searchParams.set("flow", "recovery");
  recoveryUrl.searchParams.set("token_hash", link.data.properties.hashed_token);

  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(recoveryUrl.href);
  await page.getByRole("button", { name: "Continue to new password" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Continue to new password" }).click();
  await page.getByLabel("New password", { exact: true }).waitFor();
  passed("Recovery link survives GET/reload and opens the form only after Continue");

  async function savePassword(password) {
    await page.getByLabel("New password", { exact: true }).fill(password);
    await page.getByLabel("Confirm new password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Save new password", exact: true }).click();
  }
  await savePassword(originalPassword);
  await page.getByRole("alert").filter({ hasText: baseline ? "We couldn't update your password" : "already your current password" }).waitFor();
  passed(baseline ? "Reproduced misleading generic error for the current password" : "Same-password rejection clearly explains the password is already current");
  await savePassword(newPassword);
  if (baseline) {
    await page.getByRole("alert").filter({ hasText: "couldn't verify your reset session" }).waitFor();
    passed("Reproduced missing-session screen immediately after a successful save");
  } else {
    await page.waitForURL("**/reset-password?updated=1");
    await page.getByRole("heading", { name: "Password updated", exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("updated"), "1");
    await page.reload();
    await page.getByRole("status").filter({ hasText: "Your password has been changed" }).waitFor();
    // Next's accessible route announcer is also role=alert, so only reject
    // actual recovery errors, not its page-title announcement.
    assert.equal(await page.getByRole("alert").filter({ hasText: /reset session|expired|couldn't/i }).count(), 0);
    passed("Success remains visible after sign-out and refresh, without an expired-session error");
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "Mobile page overflows.");
    await page.screenshot({ path: ".tmp-password-recovery-success-mobile.png", fullPage: true });
    passed("Mobile success view fits a 390px-wide screen");
    await page.locator('a[href="/login?focus=email#login-form"]').click();
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/account/entries");
    passed("Browser sign-in succeeds with the newly saved password");
    await page.goto(`${origin}/account/security`);
    await page.getByRole("button", { name: "Change password" }).click();
    await page.getByLabel("Current password", { exact: true }).fill(newPassword);
    await page.getByLabel("New password", { exact: true }).fill(accountPassword);
    await page.getByLabel("Confirm new password", { exact: true }).fill(accountPassword);
    await page.getByRole("button", { name: "Save new password", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Your password has been changed" }).waitFor();
    passed("Account & Security Change password opens and successfully saves a new password");
  }
  const finalPassword = baseline ? newPassword : accountPassword;
  const freshAuth = publicAuth();
  const signedIn = await freshAuth.auth.signInWithPassword({ email, password: finalPassword });
  assert(!signedIn.error && signedIn.data.user?.id === userId, "New password sign-in failed.");
  await freshAuth.auth.signOut();
  const oldSignIn = await publicAuth().auth.signInWithPassword({ email, password: originalPassword });
  assert(oldSignIn.error?.code === "invalid_credentials", "Original password should no longer work.");
  passed("Auth independently accepts the final password and rejects the original password");
  console.log(JSON.stringify({ result: "passed", baseline, checks: checks.length }));
} catch (error) {
  // Browser errors can contain a tokenized URL or filled password. Print only
  // an error category; completed checks identify the failing step safely.
  const safeSummary = error.message.split("\n")[0].replace(/https?:\S+/g, "[URL]");
  console.error(`FAIL: ${error.name}: ${safeSummary}; last completed check: ${checks.at(-1) ?? "none"}. Other details omitted.`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (userId) {
    const owned = await admin.auth.admin.getUserById(userId);
    assert(owned.data.user?.email === email && owned.data.user.app_metadata.password_recovery_qa_run === runId,
      "QA cleanup identity mismatch; refusing to change this account.");
    const disabled = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h", password: `Disabled!${randomUUID()}Aa9`,
      app_metadata: { password_recovery_qa_run: runId, qa_completed: true },
    });
    assert(!disabled.error, "Could not disable the QA account.");
    // Scope this update to the exact account created above. No deletes or
    // financial-history changes; restricted accounts aren't crew suggestions.
    await management("/database/query", { query: `update public.customers set status='restricted' where id='${userId}' and exists (select 1 from auth.users u where u.id='${userId}' and u.raw_app_meta_data->>'password_recovery_qa_run'='${runId}');` });
    console.log(`QA account disabled; its empty preview records retained: ${userId}`);
  }
}
